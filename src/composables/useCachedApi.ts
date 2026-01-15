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
  safeDBOperation,
  isIndexedDBAvailable,
} from '../services/db';
import type { AdminProduct, AdminStats, ProductFilters, PaginationState } from '../types/admin';
import type { ComponentType } from '../constants/components';
import { COMPONENTS } from '../constants/components';

// Track if initial sync has been done this session
const hasInitialSync = ref(false);

// Sync lock mechanism to prevent race conditions
// When sync is in progress, reads will wait for it to complete
const isSyncing = ref(false);
let syncPromise: Promise<void> | null = null;

/**
 * Wait for any in-progress sync to complete
 * Returns immediately if no sync is in progress
 */
async function waitForSync(): Promise<void> {
  if (syncPromise) {
    await syncPromise;
  }
}

/**
 * Execute a function with sync lock
 * Prevents concurrent syncs and allows readers to wait
 */
async function withSyncLock<T>(fn: () => Promise<T>): Promise<T> {
  // Wait for any existing sync to complete first
  await waitForSync();

  // Set up the lock
  isSyncing.value = true;
  let resolveSync: () => void;
  syncPromise = new Promise<void>((resolve) => {
    resolveSync = resolve;
  });

  try {
    return await fn();
  } finally {
    // Always release the lock, even if fn() throws
    isSyncing.value = false;
    resolveSync!();
    syncPromise = null;
  }
}

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
    // Wait for any in-progress sync to complete before reading cache
    await waitForSync();

    // Check if IndexedDB is available for caching
    const dbAvailable = await isIndexedDBAvailable();

    // Check if we can use cache (only for default/empty filters for simplicity)
    const canUseCache =
      dbAvailable &&
      !forceRefresh &&
      !filters.searchQuery &&
      !filters.categories?.length &&
      filters.priceRange?.min === null &&
      filters.priceRange?.max === null &&
      filters.enabledFilter === 'all' &&
      (!filters.updatedAtFilter || filters.updatedAtFilter.preset === 'all');

    if (canUseCache) {
      const cacheIsFresh = await safeDBOperation(
        () => isCacheFresh(CACHE_CONFIG.PRODUCTS_KEY, CACHE_CONFIG.PRODUCTS_TTL),
        false
      );

      if (cacheIsFresh || !hasInitialSync.value) {
        const cachedProducts = await safeDBOperation(
          () => getCachedProducts(),
          []
        );
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
    try {
      const response = await productApi.getProducts(filters, pagination);

      // Cache all products if we fetched without filters
      // This ensures we have a complete dataset for future cached queries
      if (canUseCache && response.products.length > 0) {
        // For a complete cache, fetch all products without pagination
        try {
          const allProductsResponse = await productApi.getProducts({}, { itemsPerPage: 1000 });
          await safeDBOperation(
            () => cacheProducts(allProductsResponse.products),
            undefined
          );
          hasInitialSync.value = true;
        } catch {
          // If full fetch fails, cache what we have
          await safeDBOperation(
            () => cacheProducts(response.products),
            undefined
          );
        }
      }

      return response;
    } catch (apiError) {
      // API failed (offline, server down, etc.)
      // Fall back to stale IndexedDB cache if available
      if (dbAvailable) {
        const staleCachedProducts = await safeDBOperation(
          () => getCachedProducts(),
          []
        );
        if (staleCachedProducts.length > 0) {
          // Return stale cached data instead of throwing
          const sorted = applySorting(staleCachedProducts, filters);
          const paginated = applyPagination(sorted, pagination);
          return {
            products: paginated,
            total: staleCachedProducts.length,
            page: pagination.currentPage || 1,
            limit: pagination.itemsPerPage || 12,
            totalPages: Math.ceil(
              staleCachedProducts.length / (pagination.itemsPerPage || 12)
            ),
          };
        }
      }
      // No cached data available, re-throw the error
      throw apiError;
    }
  }

  /**
   * Get product statistics with caching
   */
  async function getStats(forceRefresh = false): Promise<AdminStats> {
    // Wait for any in-progress sync to complete before reading cache
    await waitForSync();

    const dbAvailable = await isIndexedDBAvailable();

    if (!forceRefresh && dbAvailable) {
      const cacheIsFresh = await safeDBOperation(
        () => isCacheFresh(CACHE_CONFIG.STATS_KEY, CACHE_CONFIG.STATS_TTL),
        false
      );

      if (cacheIsFresh) {
        const cached = await safeDBOperation(
          () => getCachedStats(),
          undefined
        );
        if (cached) {
          return cached;
        }
      }
    }

    // Fetch from API and cache
    try {
      const stats = await productApi.getStats();
      await safeDBOperation(() => cacheStats(stats), undefined);
      return stats;
    } catch (apiError) {
      // API failed - fall back to stale cache if available
      if (dbAvailable) {
        const staleStats = await safeDBOperation(
          () => getCachedStats(),
          undefined
        );
        if (staleStats) {
          return staleStats;
        }
      }
      throw apiError;
    }
  }

  /**
   * Get enabled products grouped by category (for planner)
   * Uses cache when available
   */
  async function getEnabledProducts(
    forceRefresh = false
  ): Promise<Record<ComponentType, AdminProduct[]>> {
    // Wait for any in-progress sync to complete before reading cache
    await waitForSync();

    const dbAvailable = await isIndexedDBAvailable();

    if (!forceRefresh && dbAvailable) {
      const cacheIsFresh = await safeDBOperation(
        () => isCacheFresh(CACHE_CONFIG.PRODUCTS_KEY, CACHE_CONFIG.PRODUCTS_TTL),
        false
      );

      if (cacheIsFresh) {
        const cachedProducts = await safeDBOperation(
          () => getCachedProducts(),
          []
        );
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
    try {
      const data = await productApi.getEnabledProducts();

      // Also update the products cache with this data
      if (dbAvailable) {
        const allProducts: AdminProduct[] = [];
        for (const products of Object.values(data)) {
          allProducts.push(...products);
        }
        if (allProducts.length > 0) {
          // Merge with existing cache (don't replace disabled products)
          const existingProducts = await safeDBOperation(
            () => getCachedProducts(),
            []
          );
          const existingDisabled = existingProducts.filter((p) => !p.enabled);
          await safeDBOperation(
            () => cacheProducts([...allProducts, ...existingDisabled]),
            undefined
          );
        }
      }

      return data;
    } catch (apiError) {
      // API failed - fall back to stale cache if available
      if (dbAvailable) {
        const staleCachedProducts = await safeDBOperation(
          () => getCachedProducts(),
          []
        );
        if (staleCachedProducts.length > 0) {
          // Group enabled products by category from stale cache
          const result = {} as Record<ComponentType, AdminProduct[]>;
          for (const category of COMPONENTS) {
            result[category] = staleCachedProducts.filter(
              (p) => p.enabled && p.category === category
            );
          }
          return result;
        }
      }
      throw apiError;
    }
  }

  /**
   * Create a new product
   * Write-through: API first, then cache on success
   */
  async function createProduct(
    product: Partial<AdminProduct>
  ): Promise<AdminProduct> {
    const created = await productApi.createProduct(product);

    // Cache the new product (non-blocking, errors logged but not thrown)
    await safeDBOperation(() => cacheProduct(created), undefined);

    // Invalidate stats cache (counts have changed)
    await safeDBOperation(
      () => db.cacheMeta.delete(CACHE_CONFIG.STATS_KEY),
      undefined
    );

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
    await safeDBOperation(() => cacheProduct(updated), undefined);

    // Invalidate stats cache if enabled status might have changed
    if ('enabled' in updates) {
      await safeDBOperation(
        () => db.cacheMeta.delete(CACHE_CONFIG.STATS_KEY),
        undefined
      );
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
    await safeDBOperation(() => cacheProduct(updated), undefined);

    // Invalidate stats cache
    await safeDBOperation(
      () => db.cacheMeta.delete(CACHE_CONFIG.STATS_KEY),
      undefined
    );

    return updated;
  }

  /**
   * Delete a product
   * Write-through: API first, then remove from cache on success
   */
  async function deleteProduct(id: number, productId: string): Promise<void> {
    await productApi.deleteProduct(id);

    // Remove from cache
    await safeDBOperation(() => uncacheProduct(productId), undefined);

    // Invalidate stats cache
    await safeDBOperation(
      () => db.cacheMeta.delete(CACHE_CONFIG.STATS_KEY),
      undefined
    );
  }

  /**
   * Force sync all data from API to cache
   * Uses sync lock to prevent race conditions with concurrent reads
   */
  async function syncAll(): Promise<void> {
    await withSyncLock(async () => {
      const [productsResponse, stats] = await Promise.all([
        productApi.getProducts({}, { itemsPerPage: 1000 }),
        productApi.getStats(),
      ]);

      await Promise.all([
        safeDBOperation(() => cacheProducts(productsResponse.products), undefined),
        safeDBOperation(() => cacheStats(stats), undefined),
      ]);

      hasInitialSync.value = true;
    });
  }

  /**
   * Clear all cached data
   * Uses sync lock to prevent race conditions with concurrent reads
   */
  async function invalidateCache(): Promise<void> {
    await withSyncLock(async () => {
      await safeDBOperation(() => clearCache(), undefined);
      hasInitialSync.value = false;
    });
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
    isSyncing,
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
