// IndexedDB Database Definition using Dexie.js
// Provides local caching for products and stats data

import Dexie, { type Table } from 'dexie';
import type { AdminProduct, AdminStats } from '../types/admin';
import type { ComponentType } from '../constants/components';

// Track IndexedDB availability
let indexedDBAvailable: boolean | null = null;

/**
 * Check if IndexedDB is available in the current environment
 * Handles private browsing mode and restricted environments
 */
export async function isIndexedDBAvailable(): Promise<boolean> {
  // Return cached result if already checked
  if (indexedDBAvailable !== null) {
    return indexedDBAvailable;
  }

  try {
    // Check if indexedDB exists
    if (typeof indexedDB === 'undefined') {
      indexedDBAvailable = false;
      return false;
    }

    // Try to open a test database to verify it actually works
    // (private browsing mode may have indexedDB but throw on use)
    const testDBName = '__idb_test__';
    const testDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(testDBName);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    testDB.close();

    // Clean up test database
    await new Promise<void>((resolve) => {
      const deleteRequest = indexedDB.deleteDatabase(testDBName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => resolve(); // Ignore cleanup errors
    });

    indexedDBAvailable = true;
    return true;
  } catch {
    indexedDBAvailable = false;
    return false;
  }
}

/**
 * Safe wrapper for database operations
 * Returns null/empty array instead of throwing when IndexedDB is unavailable
 */
export async function safeDBOperation<T>(
  operation: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    const available = await isIndexedDBAvailable();
    if (!available) {
      if (import.meta.env.DEV) {
        console.warn('[IndexedDB] Not available, using fallback');
      }
      return fallback;
    }
    return await operation();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[IndexedDB] Operation failed:', error);
    }
    return fallback;
  }
}

// Cache metadata for tracking freshness
export interface CacheMeta {
  id: string;
  lastSynced: number;
  version: number;
}

// Database class definition
export class BathroomPlannerDB extends Dexie {
  // Table definitions
  products!: Table<AdminProduct, string>;
  stats!: Table<AdminStats & { id: string }, string>;
  cacheMeta!: Table<CacheMeta, string>;

  constructor() {
    super('BathroomPlannerDB');

    // Define schema
    // Note: Only indexed fields need to be listed, other fields are stored automatically
    this.version(1).stores({
      // Products indexed by id, with additional indexes for filtering
      products: 'id, dbId, category, enabled, updatedAt',
      // Stats stored with a fixed id ('global')
      stats: 'id',
      // Cache metadata for tracking when data was last synced
      cacheMeta: 'id',
    });
  }
}

// Singleton database instance
export const db = new BathroomPlannerDB();

// Cache configuration
export const CACHE_CONFIG = {
  // Time in milliseconds before cache is considered stale
  PRODUCTS_TTL: 5 * 60 * 1000, // 5 minutes
  STATS_TTL: 2 * 60 * 1000, // 2 minutes
  // Keys for cache metadata
  PRODUCTS_KEY: 'products',
  STATS_KEY: 'stats',
  SYNC_VERSION_KEY: 'syncVersion',
  SCHEMA_VERSION_KEY: 'schemaVersion',

  // ⚠️ INCREMENT THIS when you add/remove/rename fields in AdminProduct
  // This forces all users to refresh their cache
  CURRENT_SCHEMA_VERSION: 1,
};

// Sync status for tracking atomic sync operations
export interface SyncStatus {
  version: number;
  timestamp: number;
  productsCount: number;
  hasStats: boolean;
  completedSuccessfully: boolean;
}

// Helper functions for cache management

/**
 * Check if cached data is still fresh
 */
export async function isCacheFresh(key: string, ttl: number): Promise<boolean> {
  const meta = await db.cacheMeta.get(key);
  if (!meta) return false;
  return Date.now() - meta.lastSynced < ttl;
}

/**
 * Update cache timestamp
 */
export async function updateCacheTimestamp(key: string): Promise<void> {
  const existing = await db.cacheMeta.get(key);
  await db.cacheMeta.put({
    id: key,
    lastSynced: Date.now(),
    version: (existing?.version ?? 0) + 1,
  });
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  await Promise.all([
    db.products.clear(),
    db.stats.clear(),
    db.cacheMeta.clear(),
  ]);
}

/**
 * Get cache statistics for debugging
 */
export async function getCacheStats(): Promise<{
  productCount: number;
  hasStats: boolean;
  productsCacheAge: number | null;
  statsCacheAge: number | null;
}> {
  const [productCount, stats, productsMeta, statsMeta] = await Promise.all([
    db.products.count(),
    db.stats.get('global'),
    db.cacheMeta.get(CACHE_CONFIG.PRODUCTS_KEY),
    db.cacheMeta.get(CACHE_CONFIG.STATS_KEY),
  ]);

  return {
    productCount,
    hasStats: !!stats,
    productsCacheAge: productsMeta ? Date.now() - productsMeta.lastSynced : null,
    statsCacheAge: statsMeta ? Date.now() - statsMeta.lastSynced : null,
  };
}

/**
 * Bulk upsert products into cache
 */
export async function cacheProducts(products: AdminProduct[]): Promise<void> {
  await db.transaction('rw', db.products, db.cacheMeta, async () => {
    await db.products.bulkPut(products);
    await updateCacheTimestamp(CACHE_CONFIG.PRODUCTS_KEY);
  });
}

/**
 * Cache a single product (for create/update operations)
 * Also updates cache timestamp to prevent stale reads
 */
export async function cacheProduct(product: AdminProduct): Promise<void> {
  await db.transaction('rw', db.products, db.cacheMeta, async () => {
    await db.products.put(product);
    await updateCacheTimestamp(CACHE_CONFIG.PRODUCTS_KEY);
  });
}

/**
 * Remove a product from cache
 */
export async function uncacheProduct(productId: string): Promise<void> {
  await db.products.delete(productId);
}

/**
 * Get all cached products
 */
export async function getCachedProducts(): Promise<AdminProduct[]> {
  return db.products.toArray();
}

/**
 * Get cached products by category
 */
export async function getCachedProductsByCategory(
  category: ComponentType
): Promise<AdminProduct[]> {
  return db.products.where('category').equals(category).toArray();
}

/**
 * Get enabled products from cache (for planner)
 */
export async function getCachedEnabledProducts(): Promise<AdminProduct[]> {
  return db.products.filter((product) => product.enabled === true).toArray();
}

/**
 * Cache stats
 */
export async function cacheStats(stats: AdminStats): Promise<void> {
  await db.transaction('rw', db.stats, db.cacheMeta, async () => {
    await db.stats.put({ ...stats, id: 'global' });
    await updateCacheTimestamp(CACHE_CONFIG.STATS_KEY);
  });
}

/**
 * Get cached stats
 */
export async function getCachedStats(): Promise<AdminStats | undefined> {
  const stats = await db.stats.get('global');
  if (stats) {
    // Remove the id field before returning
    const { id, ...rest } = stats;
    return rest as AdminStats;
  }
  return undefined;
}

/**
 * Get the last successful sync status
 * Returns null if no successful sync has been completed
 */
export async function getSyncStatus(): Promise<SyncStatus | null> {
  const meta = await db.cacheMeta.get(CACHE_CONFIG.SYNC_VERSION_KEY);
  if (!meta) return null;

  // The sync status is stored in the version field as a JSON string
  try {
    // For backwards compatibility, check if we have the new format
    if (typeof meta.version === 'number' && meta.lastSynced) {
      // Old format - convert to new format
      const productCount = await db.products.count();
      const hasStats = !!(await db.stats.get('global'));
      return {
        version: meta.version,
        timestamp: meta.lastSynced,
        productsCount: productCount,
        hasStats,
        completedSuccessfully: true, // Assume old syncs completed
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Atomic sync: Replace all cached data in a single transaction
 * Either all data is written or none (rollback on failure)
 */
export async function atomicSyncAll(
  products: AdminProduct[],
  stats: AdminStats
): Promise<SyncStatus> {
  const syncVersion = Date.now();

  const syncStatus: SyncStatus = {
    version: syncVersion,
    timestamp: syncVersion,
    productsCount: products.length,
    hasStats: true,
    completedSuccessfully: false, // Will be set to true after transaction succeeds
  };

  // Single atomic transaction - all or nothing
  await db.transaction('rw', db.products, db.stats, db.cacheMeta, async () => {
    // Clear existing data
    await db.products.clear();
    await db.stats.clear();

    // Write new data
    await db.products.bulkPut(products);
    await db.stats.put({ ...stats, id: 'global' });

    // Update cache timestamps
    await db.cacheMeta.put({
      id: CACHE_CONFIG.PRODUCTS_KEY,
      lastSynced: syncVersion,
      version: syncVersion,
    });
    await db.cacheMeta.put({
      id: CACHE_CONFIG.STATS_KEY,
      lastSynced: syncVersion,
      version: syncVersion,
    });

    // Mark sync as complete - this is the commit marker
    syncStatus.completedSuccessfully = true;
    await db.cacheMeta.put({
      id: CACHE_CONFIG.SYNC_VERSION_KEY,
      lastSynced: syncVersion,
      version: syncVersion,
    });
  });

  return syncStatus;
}

/**
 * Check if the cache is in a valid state (last sync completed successfully)
 */
export async function isCacheValid(): Promise<boolean> {
  const syncMeta = await db.cacheMeta.get(CACHE_CONFIG.SYNC_VERSION_KEY);
  if (!syncMeta) {
    // No sync has ever completed - cache may be empty or partial
    return false;
  }

  // Check if we have data matching the sync version
  const productsMeta = await db.cacheMeta.get(CACHE_CONFIG.PRODUCTS_KEY);
  const statsMeta = await db.cacheMeta.get(CACHE_CONFIG.STATS_KEY);

  // All metadata should have the same version for a valid cache
  return (
    productsMeta?.version === syncMeta.version &&
    statsMeta?.version === syncMeta.version
  );
}

/**
 * Check if cached data schema matches current app schema
 * If not, clear cache to force fresh data fetch
 *
 * Call this on app startup before reading from cache
 */
export async function validateSchemaVersion(): Promise<boolean> {
  const schemaMeta = await db.cacheMeta.get(CACHE_CONFIG.SCHEMA_VERSION_KEY);
  const cachedVersion = schemaMeta?.version ?? 0;

  if (cachedVersion !== CACHE_CONFIG.CURRENT_SCHEMA_VERSION) {
    if (import.meta.env.DEV) {
      console.log(
        `[Schema] Version mismatch: cached=${cachedVersion}, current=${CACHE_CONFIG.CURRENT_SCHEMA_VERSION}. Clearing cache.`
      );
    }

    // Clear all cached data
    await clearCache();

    // Save new schema version
    await db.cacheMeta.put({
      id: CACHE_CONFIG.SCHEMA_VERSION_KEY,
      lastSynced: Date.now(),
      version: CACHE_CONFIG.CURRENT_SCHEMA_VERSION,
    });

    return false; // Cache was invalidated
  }

  return true; // Cache schema is valid
}
