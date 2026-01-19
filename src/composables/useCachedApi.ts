// Cached API Composable
// Provides write-through caching for API calls using IndexedDB
// Includes cross-tab synchronization via BroadcastChannel

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
  atomicSyncAll,
  isCacheValid,
  getSyncStatus,
  validateSchemaVersion,
  type SyncStatus,
} from '../services/db';
import {
  broadcastProductCreated,
  broadcastProductUpdated,
  broadcastProductDeleted,
  broadcastProductToggled,
  broadcastCacheSynced,
  broadcastCacheInvalidated,
} from '../services/broadcastChannel';
import type { AdminProduct, AdminStats, ProductFilters, PaginationState } from '../types/admin';
import type { ComponentType } from '../constants/components';
import { COMPONENTS } from '../constants/components';

// Track if initial sync has been done this session
const hasInitialSync = ref(false);

// Track if schema version has been validated this session
let schemaValidated = false;
let schemaValidationPromise: Promise<boolean> | null = null;

/**
 * Ensure schema version is validated before using cache
 * Only runs once per session, clears cache if schema changed
 */
async function ensureSchemaValidated(): Promise<void> {
  if (schemaValidated) return;

  if (!schemaValidationPromise) {
    schemaValidationPromise = safeDBOperation(
      () => validateSchemaVersion(),
      true
    );
  }

  await schemaValidationPromise;
  schemaValidated = true;
}

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

/**
 * Fetch ALL products using parallel pagination
 * 1. Fetch first page to get total count
 * 2. Calculate remaining pages needed
 * 3. Fetch all remaining pages in parallel
 * 4. Combine results
 */
const PAGE_SIZE = 100; // Products per page
const MAX_PARALLEL_REQUESTS = 5; // Limit concurrent requests

async function fetchAllProductsParallel(): Promise<AdminProduct[]> {
  // Step 1: Fetch first page to get total count
  const firstPage = await productApi.getProducts(
    {},
    { currentPage: 1, itemsPerPage: PAGE_SIZE }
  );

  const total = firstPage.total;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (import.meta.env.DEV) {
    console.log(`[fetchAllProducts] Total: ${total} products, ${totalPages} pages`);
  }

  // If only one page, we're done
  if (totalPages <= 1) {
    return firstPage.products;
  }

  // Step 2: Fetch remaining pages in parallel (with concurrency limit)
  const allProducts: AdminProduct[] = [...firstPage.products];
  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

  // Process pages in batches to avoid overwhelming the server
  for (let i = 0; i < remainingPages.length; i += MAX_PARALLEL_REQUESTS) {
    const batch = remainingPages.slice(i, i + MAX_PARALLEL_REQUESTS);

    const batchResults = await Promise.all(
      batch.map(page =>
        productApi.getProducts({}, { currentPage: page, itemsPerPage: PAGE_SIZE })
      )
    );

    for (const result of batchResults) {
      allProducts.push(...result.products);
    }

    if (import.meta.env.DEV) {
      console.log(`[fetchAllProducts] Fetched pages ${batch.join(', ')} (${allProducts.length}/${total})`);
    }
  }

  return allProducts;
}

export function useCachedApi() {
  /**
   * Fetch products with caching
   * - First checks IndexedDB for cached data
   * - Applies filters, sorting, and pagination locally on cached data
   * - Falls back to API if cache is stale or empty
   * - Updates cache after successful API call
   */
  async function getProducts(
    filters: Partial<ProductFilters> = {},
    pagination: Partial<PaginationState> = {},
    forceRefresh = false
  ): Promise<ProductListResponse> {
    // Validate schema version before using cache (clears cache if outdated)
    await ensureSchemaValidated();

    // Wait for any in-progress sync to complete before reading cache
    await waitForSync();

    // Check if IndexedDB is available for caching
    const dbAvailable = await isIndexedDBAvailable();

    // Helper to process cached products with filters, sorting, and pagination
    const processFromCache = (cachedProducts: AdminProduct[]): ProductListResponse => {
      // Apply filters → sort → paginate
      const filtered = applyFilters(cachedProducts, filters);
      const sorted = applySorting(filtered, filters);
      const paginated = applyPagination(sorted, pagination);

      return {
        products: paginated,
        total: filtered.length,
        page: pagination.currentPage || 1,
        limit: pagination.itemsPerPage || 12,
        totalPages: Math.ceil(filtered.length / (pagination.itemsPerPage || 12)),
      };
    };

    // Try to use cache if not forcing refresh
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
          if (import.meta.env.DEV) {
            console.log('[getProducts] Using cache:', cachedProducts.length, 'products');
          }
          return processFromCache(cachedProducts);
        }
      }
    }

    // Cache miss or force refresh - fetch from API
    if (import.meta.env.DEV) {
      console.log('[getProducts] Cache miss, fetching from API');
    }

    try {
      // Fetch ALL products using parallel pagination for performance
      const allProducts = await fetchAllProductsParallel();

      // Cache all products
      if (dbAvailable && allProducts.length > 0) {
        await safeDBOperation(
          () => cacheProducts(allProducts),
          undefined
        );
        hasInitialSync.value = true;
      }

      // Apply filters locally and return
      return processFromCache(allProducts);
    } catch (apiError) {
      // API failed (offline, server down, etc.)
      // Fall back to stale IndexedDB cache if available
      if (dbAvailable) {
        const staleCachedProducts = await safeDBOperation(
          () => getCachedProducts(),
          []
        );
        if (staleCachedProducts.length > 0) {
          if (import.meta.env.DEV) {
            console.log('[getProducts] API failed, using stale cache');
          }
          return processFromCache(staleCachedProducts);
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
   * Uses the same cache as getProducts() - fetches ALL products and filters to enabled
   * This ensures both admin dashboard and planner share the same complete cache
   */
  async function getEnabledProducts(
    forceRefresh = false
  ): Promise<Record<ComponentType, AdminProduct[]>> {
    // Validate schema version before using cache (clears cache if outdated)
    await ensureSchemaValidated();

    // Wait for any in-progress sync to complete before reading cache
    await waitForSync();

    const dbAvailable = await isIndexedDBAvailable();

    // Helper to group enabled products by category
    const groupEnabledByCategory = (products: AdminProduct[]): Record<ComponentType, AdminProduct[]> => {
      const result = {} as Record<ComponentType, AdminProduct[]>;
      for (const category of COMPONENTS) {
        result[category] = products.filter(
          (p) => p.enabled && p.category === category
        );
      }
      return result;
    };

    // Try to use cache first
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
          if (import.meta.env.DEV) {
            console.log('[getEnabledProducts] Using cache:', cachedProducts.length, 'products');
          }
          return groupEnabledByCategory(cachedProducts);
        }
      }
    }

    // Cache miss or force refresh - fetch ALL products (same as admin dashboard)
    // This ensures complete cache for both planner and admin
    if (import.meta.env.DEV) {
      console.log('[getEnabledProducts] Cache miss, fetching all products from API');
    }

    try {
      // Fetch ALL products using parallel pagination - this populates complete cache
      const allProducts = await fetchAllProductsParallel();

      // Cache all products
      if (dbAvailable && allProducts.length > 0) {
        await safeDBOperation(
          () => cacheProducts(allProducts),
          undefined
        );
      }

      // Return only enabled products grouped by category
      return groupEnabledByCategory(allProducts);
    } catch (apiError) {
      // API failed - fall back to stale cache if available
      if (dbAvailable) {
        const staleCachedProducts = await safeDBOperation(
          () => getCachedProducts(),
          []
        );
        if (staleCachedProducts.length > 0) {
          if (import.meta.env.DEV) {
            console.log('[getEnabledProducts] API failed, using stale cache');
          }
          return groupEnabledByCategory(staleCachedProducts);
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

    // Broadcast to other tabs
    broadcastProductCreated(created);

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

    // Broadcast to other tabs
    broadcastProductUpdated(updated);

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

    // Broadcast to other tabs
    broadcastProductToggled(updated);

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

    // Broadcast to other tabs
    broadcastProductDeleted(productId);
  }

  /**
   * Force sync all data from API to cache
   * Uses Version-Based Atomic Sync to prevent partial data on failure:
   * 1. FETCH PHASE: Get all data into memory (nothing written to DB yet)
   * 2. WRITE PHASE: Write everything in a single atomic transaction
   *
   * If fetch fails → old cache remains intact
   * If write fails → Dexie auto-rollback, old cache remains intact
   */
  async function syncAll(): Promise<SyncStatus> {
    return withSyncLock(async () => {
      // ============================================
      // PHASE 1: FETCH - Collect all data in memory
      // ============================================
      // Nothing is written to IndexedDB in this phase
      // If any fetch fails, we bail out and keep existing cache

      let products: AdminProduct[];
      let stats: AdminStats;

      try {
        if (import.meta.env.DEV) {
          console.log('[Sync] Phase 1: Fetching data from API...');
        }

        // Fetch products (with parallel pagination) and stats concurrently
        const [allProducts, statsResponse] = await Promise.all([
          fetchAllProductsParallel(),
          productApi.getStats(),
        ]);

        products = allProducts;
        stats = statsResponse;

        if (import.meta.env.DEV) {
          console.log(`[Sync] Phase 1 complete: ${products.length} products, stats fetched`);
        }
      } catch (fetchError) {
        // Fetch failed - IndexedDB hasn't been touched
        // Old cache remains perfectly intact
        if (import.meta.env.DEV) {
          console.error('[Sync] Phase 1 failed: Fetch error, keeping existing cache', fetchError);
        }
        throw fetchError;
      }

      // ============================================
      // PHASE 2: WRITE - Single atomic transaction
      // ============================================
      // Either ALL writes succeed, or NONE do (Dexie auto-rollback)

      try {
        if (import.meta.env.DEV) {
          console.log('[Sync] Phase 2: Writing to IndexedDB (atomic transaction)...');
        }

        const syncStatus = await safeDBOperation(
          () => atomicSyncAll(products, stats),
          {
            version: 0,
            timestamp: 0,
            productsCount: 0,
            hasStats: false,
            completedSuccessfully: false,
          }
        );

        if (!syncStatus.completedSuccessfully) {
          throw new Error('Atomic sync failed - transaction may have been rolled back');
        }

        hasInitialSync.value = true;

        if (import.meta.env.DEV) {
          console.log('[Sync] Phase 2 complete: All data written successfully', syncStatus);
        }

        // Broadcast to other tabs that cache was synced
        broadcastCacheSynced(products, stats);

        return syncStatus;
      } catch (writeError) {
        // Transaction failed - Dexie automatically rolls back
        // IndexedDB remains in previous state
        if (import.meta.env.DEV) {
          console.error('[Sync] Phase 2 failed: Write error, transaction rolled back', writeError);
        }
        throw writeError;
      }
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

      // Broadcast to other tabs that cache was invalidated
      broadcastCacheInvalidated();
    });
  }

  /**
   * Get cache debug info
   */
  async function getDebugInfo() {
    return getCacheStats();
  }

  /**
   * Check if cache is in a valid state (last sync completed successfully)
   * Use this to determine if cached data can be trusted
   */
  async function checkCacheValidity(): Promise<boolean> {
    return safeDBOperation(() => isCacheValid(), false);
  }

  /**
   * Get the last successful sync status
   * Returns null if no successful sync has been completed
   */
  async function getLastSyncStatus(): Promise<SyncStatus | null> {
    return safeDBOperation(() => getSyncStatus(), null);
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
    checkCacheValidity,
    getLastSyncStatus,

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

// Helper: Apply all filters to products array (for local filtering)
function applyFilters(
  products: AdminProduct[],
  filters: Partial<ProductFilters>
): AdminProduct[] {
  let result = [...products];

  // Filter by search query
  if (filters.searchQuery?.trim()) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.variants.some(
          (v) =>
            v.name.toLowerCase().includes(query) ||
            v.sku.toLowerCase().includes(query)
        )
    );
  }

  // Filter by categories
  if (filters.categories?.length) {
    result = result.filter((p) => filters.categories!.includes(p.category));
  }

  // Filter by price range
  if (filters.priceRange?.min !== null && filters.priceRange?.min !== undefined) {
    const minPrice = filters.priceRange.min;
    result = result.filter((p) => {
      const price = parseFloat(p.price);
      return Number.isFinite(price) && price >= minPrice;
    });
  }
  if (filters.priceRange?.max !== null && filters.priceRange?.max !== undefined) {
    const maxPrice = filters.priceRange.max;
    result = result.filter((p) => {
      const price = parseFloat(p.price);
      return Number.isFinite(price) && price <= maxPrice;
    });
  }

  // Filter by enabled status
  if (filters.enabledFilter && filters.enabledFilter !== 'all') {
    const enabledValue = filters.enabledFilter === 'enabled';
    result = result.filter((p) => p.enabled === enabledValue);
  }

  // Filter by updated date
  if (filters.updatedAtFilter && filters.updatedAtFilter.preset !== 'all') {
    const now = Date.now();
    let cutoffTime: number | null = null;

    switch (filters.updatedAtFilter.preset) {
      case 'today':
        cutoffTime = now - 24 * 60 * 60 * 1000;
        break;
      case 'yesterday': {
        const yesterday = now - 24 * 60 * 60 * 1000;
        const dayBefore = now - 48 * 60 * 60 * 1000;
        result = result.filter((p) => {
          const updatedAt = p.updatedAt || 0;
          return updatedAt >= dayBefore && updatedAt < yesterday;
        });
        return result; // Return early for yesterday case
      }
      case 'week':
        cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'custom':
        if (filters.updatedAtFilter.customRange?.from) {
          cutoffTime = new Date(filters.updatedAtFilter.customRange.from).getTime();
        }
        break;
    }

    if (cutoffTime !== null) {
      result = result.filter((p) => (p.updatedAt || 0) >= cutoffTime!);
    }

    // Handle custom end date
    if (
      filters.updatedAtFilter.preset === 'custom' &&
      filters.updatedAtFilter.customRange?.to
    ) {
      const endTime = new Date(filters.updatedAtFilter.customRange.to).getTime();
      result = result.filter((p) => (p.updatedAt || 0) <= endTime);
    }
  }

  return result;
}
