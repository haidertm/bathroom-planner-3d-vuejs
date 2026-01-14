// Cached API Composable
// Provides write-through caching for API calls using IndexedDB

import { ref } from 'vue';
import { productApi, type ProductListResponse } from '../services/api';
import {
  db,
  CACHE_CONFIG,
  isCacheFresh,
  cacheProducts,
  cacheProduct,
  uncacheProduct,
  getCachedProducts,
  cacheStats,
  getCachedStats,
  clearCache,
  getCacheStats,
} from '../services/db';
import type { AdminProduct, AdminStats, ProductFilters, PaginationState } from '../types/admin';
import type { ComponentType } from '../constants/components';
import { COMPONENTS } from '../constants/components';

// Track if initial sync has been done this session
const hasInitialSync = ref(false);

export function useCachedApi() {
  /**
   * Fetch products with caching
   * - First checks IndexedDB for cached data
   * - Falls back to API if cache is stale or empty
   * - Updates cache after successful API call
   */
  async function getProducts(
    filters: Partial<ProductFilters> = {},
    pagination: Partial<PaginationState> = {},
    forceRefresh = false
  ): Promise<ProductListResponse> {
    // Check if we can use cache (only for default/empty filters for simplicity)
    const canUseCache =
      !forceRefresh &&
      !filters.searchQuery &&
      !filters.categories?.length &&
      filters.priceRange?.min === null &&
      filters.priceRange?.max === null &&
      filters.enabledFilter === 'all' &&
      (!filters.updatedAtFilter || filters.updatedAtFilter.preset === 'all');

    if (canUseCache) {
      const cacheIsFresh = await isCacheFresh(
        CACHE_CONFIG.PRODUCTS_KEY,
        CACHE_CONFIG.PRODUCTS_TTL
      );

      if (cacheIsFresh || !hasInitialSync.value) {
        const cachedProducts = await getCachedProducts();
        if (cachedProducts.length > 0 && cacheIsFresh) {
          // Apply local sorting and pagination
          const sorted = applySorting(cachedProducts, filters);
          const paginated = applyPagination(sorted, pagination);
          return {
            products: paginated,
            total: cachedProducts.length,
            page: pagination.currentPage || 1,
            limit: pagination.itemsPerPage || 12,
            totalPages: Math.ceil(
              cachedProducts.length / (pagination.itemsPerPage || 12)
            ),
          };
        }
      }
    }

    // Fetch from API
    const response = await productApi.getProducts(filters, pagination);

    // Cache all products if we fetched without filters
    // This ensures we have a complete dataset for future cached queries
    if (canUseCache && response.products.length > 0) {
      // For a complete cache, fetch all products without pagination
      try {
        const allProductsResponse = await productApi.getProducts({}, { itemsPerPage: 1000 });
        await cacheProducts(allProductsResponse.products);
        hasInitialSync.value = true;
      } catch {
        // If full fetch fails, cache what we have
        await cacheProducts(response.products);
      }
    }

    return response;
  }

  /**
   * Get product statistics with caching
   */
  async function getStats(forceRefresh = false): Promise<AdminStats> {
    if (!forceRefresh) {
      const cacheIsFresh = await isCacheFresh(
        CACHE_CONFIG.STATS_KEY,
        CACHE_CONFIG.STATS_TTL
      );

      if (cacheIsFresh) {
        const cached = await getCachedStats();
        if (cached) {
          return cached;
        }
      }
    }

    // Fetch from API and cache
    const stats = await productApi.getStats();
    await cacheStats(stats);
    return stats;
  }

  /**
   * Get enabled products grouped by category (for planner)
   * Uses cache when available
   */
  async function getEnabledProducts(
    forceRefresh = false
  ): Promise<Record<ComponentType, AdminProduct[]>> {
    if (!forceRefresh) {
      const cacheIsFresh = await isCacheFresh(
        CACHE_CONFIG.PRODUCTS_KEY,
        CACHE_CONFIG.PRODUCTS_TTL
      );

      if (cacheIsFresh) {
        const cachedProducts = await getCachedProducts();
        if (cachedProducts.length > 0) {
          // Group enabled products by category
          const result = {} as Record<ComponentType, AdminProduct[]>;
          for (const category of COMPONENTS) {
            result[category] = cachedProducts.filter(
              (p) => p.enabled && p.category === category
            );
          }
          return result;
        }
      }
    }

    // Fetch from API
    const data = await productApi.getEnabledProducts();

    // Also update the products cache with this data
    const allProducts: AdminProduct[] = [];
    for (const products of Object.values(data)) {
      allProducts.push(...products);
    }
    if (allProducts.length > 0) {
      // Merge with existing cache (don't replace disabled products)
      const existingProducts = await getCachedProducts();
      const existingDisabled = existingProducts.filter((p) => !p.enabled);
      await cacheProducts([...allProducts, ...existingDisabled]);
    }

    return data;
  }

  /**
   * Create a new product
   * Write-through: API first, then cache on success
   */
  async function createProduct(
    product: Partial<AdminProduct>
  ): Promise<AdminProduct> {
    const created = await productApi.createProduct(product);

    // Cache the new product
    await cacheProduct(created);

    // Invalidate stats cache (counts have changed)
    await db.cacheMeta.delete(CACHE_CONFIG.STATS_KEY);

    return created;
  }

  /**
   * Update a product
   * Write-through: API first, then cache on success
   */
  async function updateProduct(
    id: number,
    updates: Partial<AdminProduct>
  ): Promise<AdminProduct> {
    const updated = await productApi.updateProduct(id, updates);

    // Update cache
    await cacheProduct(updated);

    // Invalidate stats cache if enabled status might have changed
    if ('enabled' in updates) {
      await db.cacheMeta.delete(CACHE_CONFIG.STATS_KEY);
    }

    return updated;
  }

  /**
   * Toggle product enabled status
   * Write-through: API first, then cache on success
   */
  async function toggleEnabled(id: number): Promise<AdminProduct> {
    const updated = await productApi.toggleEnabled(id);

    // Update cache
    await cacheProduct(updated);

    // Invalidate stats cache
    await db.cacheMeta.delete(CACHE_CONFIG.STATS_KEY);

    return updated;
  }

  /**
   * Delete a product
   * Write-through: API first, then remove from cache on success
   */
  async function deleteProduct(id: number, productId: string): Promise<void> {
    await productApi.deleteProduct(id);

    // Remove from cache
    await uncacheProduct(productId);

    // Invalidate stats cache
    await db.cacheMeta.delete(CACHE_CONFIG.STATS_KEY);
  }

  /**
   * Force sync all data from API to cache
   */
  async function syncAll(): Promise<void> {
    const [productsResponse, stats] = await Promise.all([
      productApi.getProducts({}, { itemsPerPage: 1000 }),
      productApi.getStats(),
    ]);

    await Promise.all([
      cacheProducts(productsResponse.products),
      cacheStats(stats),
    ]);

    hasInitialSync.value = true;
  }

  /**
   * Clear all cached data
   */
  async function invalidateCache(): Promise<void> {
    await clearCache();
    hasInitialSync.value = false;
  }

  /**
   * Get cache debug info
   */
  async function getDebugInfo() {
    return getCacheStats();
  }

  return {
    // Cached API methods
    getProducts,
    getStats,
    getEnabledProducts,
    createProduct,
    updateProduct,
    toggleEnabled,
    deleteProduct,

    // Cache management
    syncAll,
    invalidateCache,
    getDebugInfo,

    // State
    hasInitialSync,
  };
}

// Helper: Apply sorting to products array
function applySorting(
  products: AdminProduct[],
  filters: Partial<ProductFilters>
): AdminProduct[] {
  const sortBy = filters.sortBy || 'name';
  const sortOrder = filters.sortOrder || 'asc';

  return [...products].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price': {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        const validA = Number.isFinite(priceA);
        const validB = Number.isFinite(priceB);
        if (!validA && !validB) comparison = 0;
        else if (!validA) comparison = 1;
        else if (!validB) comparison = -1;
        else comparison = priceA - priceB;
        break;
      }
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      case 'variants':
        comparison = a.variants.length - b.variants.length;
        break;
      case 'status':
        comparison = a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1;
        break;
      case 'createdAt':
        comparison = (a.createdAt || 0) - (b.createdAt || 0);
        break;
      case 'updatedAt':
        comparison = (a.updatedAt || 0) - (b.updatedAt || 0);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

// Helper: Apply pagination to products array
function applyPagination(
  products: AdminProduct[],
  pagination: Partial<PaginationState>
): AdminProduct[] {
  const page = pagination.currentPage || 1;
  const limit = pagination.itemsPerPage || 12;
  const start = (page - 1) * limit;
  return products.slice(start, start + limit);
}
