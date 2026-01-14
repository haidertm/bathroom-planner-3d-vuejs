// IndexedDB Database Definition using Dexie.js
// Provides local caching for products and stats data

import Dexie, { type Table } from 'dexie';
import type { AdminProduct, AdminStats } from '../types/admin';
import type { ComponentType } from '../constants/components';

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
};

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
 */
export async function cacheProduct(product: AdminProduct): Promise<void> {
  await db.products.put(product);
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
  return db.products.where('enabled').equals(1).toArray();
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
