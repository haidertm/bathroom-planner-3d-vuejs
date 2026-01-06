// API Service - HTTP client for backend API
import type { AdminProduct, AdminStats, ProductFilters, PaginationState, ProductVariant } from '../types/admin';
import { COMPONENTS, type ComponentType } from '../constants/components';

// API base URL - defaults to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// API Product Variant (snake_case as returned from backend)
export interface ApiProductVariant {
  id: string;
  name: string;
  sku: string;
  path: string;
  image: string;
  link: string;
  price: string | number;
  title?: string;
  floorOffset?: number;
  spawnHeight?: number;
  dimensions: {
    width: number;
    height: number;
    depth?: number;
  };
  orientation?: {
    type: 'face_into_room' | 'flush_with_wall' | 'custom';
    wallBuffer?: number;
    rotationOffset?: number;
    description?: string;
  };
  movement?: {
    snapToWall: boolean;
    cornerInstallOnly?: boolean;
    allowVerticalMovement?: boolean;
    allowFreeRotation?: boolean;
    minHeight?: number;
    maxHeight?: number;
  };
}

// API Product (snake_case as returned from backend)
export interface ApiProduct {
  id?: number;
  product_id: string;
  category: string;
  name: string;
  price: string;
  link: string;
  image: string;
  variant_type: string;
  features: string[];
  variants: ApiProductVariant[];
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
}

// API Products Response
export interface ApiProductsResponse {
  products: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Response types (frontend format)
export interface ProductListResponse {
  products: AdminProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SyncStatus {
  isRunning: boolean;
  nextRunTime: string | null;
  recentSyncs: Array<{
    id: number;
    sync_type: string;
    status: string;
    products_updated: number;
    products_failed: number;
    error_message: string | null;
    started_at: string;
    completed_at: string | null;
  }>;
}

// API Error class
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper with error handling
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Get token from localStorage
  const session = localStorage.getItem('admin_session');
  if (session) {
    try {
      const sessionData = JSON.parse(session);
      if (sessionData && sessionData.token) {
        headers['Authorization'] = `Bearer ${sessionData.token}`;
      }
    } catch {
      // Remove corrupted session data to prevent repeated parse failures
      localStorage.removeItem('admin_session');
      if (import.meta.env.DEV) {
        console.warn('Removed corrupted admin_session from localStorage');
      }
    }
  }

  const config: RequestInit = {
    ...options,
    signal: controller.signal,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, error.error || error.message || 'Request failed');
    }

    // Handle empty/no-content responses (e.g., 204 No Content)
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    // Check if response has content
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');

    // No content to parse
    if (contentLength === '0') {
      return undefined as T;
    }

    // Only parse JSON if content-type indicates JSON
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    // For non-JSON responses with content, return undefined
    // (callers expecting specific data should handle this)
    return undefined as T;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, 'Request timed out');
    }
    if (error instanceof ApiError) throw error;

    // Network or other errors
    console.error('API request failed:', error);
    throw new ApiError(0, 'Network error - please check if the server is running');
  } finally {
    clearTimeout(timeoutId);
  }
}

// Product API
export const productApi = {
  // Get all products with filtering and pagination
  async getProducts(
    filters: Partial<ProductFilters> = {},
    pagination: Partial<PaginationState> = {}
  ): Promise<ProductListResponse> {
    const params = new URLSearchParams();

    if (filters.categories?.length) {
      params.set('categories', filters.categories.join(','));
    }
    if (filters.searchQuery) {
      params.set('search', filters.searchQuery);
    }
    if (filters.priceRange?.min !== null && filters.priceRange?.min !== undefined) {
      params.set('minPrice', String(filters.priceRange.min));
    }
    if (filters.priceRange?.max !== null && filters.priceRange?.max !== undefined) {
      params.set('maxPrice', String(filters.priceRange.max));
    }
    if (filters.enabledFilter && filters.enabledFilter !== 'all') {
      params.set('enabled', filters.enabledFilter === 'enabled' ? 'true' : 'false');
    }
    if (filters.sortBy) {
      params.set('sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params.set('sortOrder', filters.sortOrder);
    }
    if (pagination.currentPage) {
      params.set('page', String(pagination.currentPage));
    }
    if (pagination.itemsPerPage) {
      params.set('limit', String(pagination.itemsPerPage));
    }

    const queryString = params.toString();
    const endpoint = `/products${queryString ? `?${queryString}` : ''}`;

    const response = await fetchApi<ApiProductsResponse>(endpoint);

    // Transform API response to AdminProduct format
    return {
      ...response,
      products: response.products.map(transformApiProduct),
    };
  },

  // Get single product by ID
  async getProduct(id: number): Promise<AdminProduct> {
    const product = await fetchApi<ApiProduct>(`/products/${id}`);
    return transformApiProduct(product);
  },

  // Get all enabled products (for planner frontend)
  async getEnabledProducts(): Promise<Record<string, any[]>> {
    return fetchApi('/products/enabled');
  },

  // Get product statistics
  async getStats(): Promise<AdminStats> {
    const stats = await fetchApi<{
      totalProducts: number;
      enabledProducts: number;
      disabledProducts: number;
      categoryCounts: unknown;
      totalVariants: number;
    }>('/products/stats');

    return {
      totalProducts: stats.totalProducts,
      enabledProducts: stats.enabledProducts,
      disabledProducts: stats.disabledProducts,
      categoryCounts: validateCategoryCounts(stats.categoryCounts),
      totalVariants: stats.totalVariants,
    };
  },

  // Create a new product
  async createProduct(product: Partial<AdminProduct>): Promise<AdminProduct> {
    const apiProduct = transformToApiProduct(product);
    const created = await fetchApi<ApiProduct>('/products', {
      method: 'POST',
      body: JSON.stringify(apiProduct),
    });
    return transformApiProduct(created);
  },

  // Update a product
  async updateProduct(id: number, updates: Partial<AdminProduct>): Promise<AdminProduct> {
    const apiUpdates = transformToApiProduct(updates);
    const updated = await fetchApi<ApiProduct>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiUpdates),
    });
    return transformApiProduct(updated);
  },

  // Toggle product enabled status
  async toggleEnabled(id: number): Promise<AdminProduct> {
    const updated = await fetchApi<ApiProduct>(`/products/${id}/toggle`, {
      method: 'PATCH',
    });
    return transformApiProduct(updated);
  },

  // Delete a product
  async deleteProduct(id: number): Promise<void> {
    await fetchApi(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Sync API
export const syncApi = {
  // Get sync status
  async getStatus(): Promise<SyncStatus> {
    return fetchApi('/sync/status');
  },

  // Trigger manual sync
  async triggerSync(): Promise<{
    message: string;
    success: boolean;
    productsUpdated: number;
    productsFailed: number;
  }> {
    return fetchApi('/sync/trigger', { method: 'POST' });
  },

  // Sync single product
  async syncProduct(productId: string): Promise<{ updated: boolean; message: string }> {
    return fetchApi(`/sync/product/${productId}`, { method: 'POST' });
  },

  // Get sync history
  async getHistory(limit = 10): Promise<SyncStatus['recentSyncs']> {
    return fetchApi(`/sync/history?limit=${limit}`);
  },
};

// Validate and transform categoryCounts from API to typed Record<ComponentType, number>
function validateCategoryCounts(data: unknown): Record<ComponentType, number> {
  // Initialize with all categories defaulting to 0
  const result: Record<ComponentType, number> = {} as Record<ComponentType, number>;
  for (const category of COMPONENTS) {
    result[category] = 0;
  }

  // If data is not an object, return defaults
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return result;
  }

  const counts = data as Record<string, unknown>;

  // Validate and copy values for known categories
  for (const category of COMPONENTS) {
    const value = counts[category];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      result[category] = Math.floor(value);
    }
  }

  return result;
}

// Transform API variant to ProductVariant format (ensures price is string)
function transformApiVariant(apiVariant: ApiProductVariant): ProductVariant {
  return {
    ...apiVariant,
    price: String(apiVariant.price ?? '0'),
  };
}

// Transform API product to AdminProduct format
function transformApiProduct(apiProduct: ApiProduct): AdminProduct {
  return {
    id: apiProduct.product_id,
    dbId: apiProduct.id,
    category: apiProduct.category as AdminProduct['category'],
    name: apiProduct.name,
    price: apiProduct.price?.toString() || '0',
    link: apiProduct.link || '',
    image: apiProduct.image || '',
    variantType: apiProduct.variant_type || 'Default',
    features: apiProduct.features || [],
    variants: (apiProduct.variants || []).map(transformApiVariant),
    enabled: apiProduct.enabled ?? true,
    createdAt: apiProduct.created_at ? new Date(apiProduct.created_at).getTime() : undefined,
    updatedAt: apiProduct.updated_at ? new Date(apiProduct.updated_at).getTime() : undefined,
    lastSyncedAt: apiProduct.last_synced_at ? new Date(apiProduct.last_synced_at).getTime() : undefined,
  };
}

// Transform ProductVariant to ApiProductVariant format
function transformVariantToApi(variant: ProductVariant): ApiProductVariant {
  return {
    id: variant.id,
    name: variant.name,
    sku: variant.sku,
    path: variant.path,
    image: variant.image,
    link: variant.link,
    price: variant.price,
    title: variant.title,
    floorOffset: variant.floorOffset,
    spawnHeight: variant.spawnHeight,
    dimensions: {
      width: variant.dimensions.width,
      height: variant.dimensions.height,
      depth: variant.dimensions.depth,
    },
    orientation: variant.orientation,
    movement: variant.movement,
  };
}

// Transform AdminProduct to API format
function transformToApiProduct(product: Partial<AdminProduct>): Partial<ApiProduct> {
  const result: Partial<ApiProduct> = {};

  if (product.id !== undefined) result.product_id = product.id;
  if (product.category !== undefined) result.category = product.category;
  if (product.name !== undefined) result.name = product.name;
  if (product.price !== undefined) result.price = product.price;
  if (product.link !== undefined) result.link = product.link;
  if (product.image !== undefined) result.image = product.image;
  if (product.variantType !== undefined) result.variant_type = product.variantType;
  if (product.features !== undefined) result.features = product.features;
  if (product.variants !== undefined) {
    result.variants = Array.isArray(product.variants)
      ? product.variants.map(transformVariantToApi)
      : [];
  }
  if (product.enabled !== undefined) result.enabled = product.enabled;

  return result;
}

export default {
  products: productApi,
  sync: syncApi,
};
