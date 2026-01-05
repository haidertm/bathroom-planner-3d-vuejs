// API Service - HTTP client for backend API
import type { AdminProduct, AdminStats, ProductFilters, PaginationState } from '../types/admin';

// API base URL - defaults to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Response types
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
    } catch (e) {
      console.error('Failed to parse admin session:', e);
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

    return response.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
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

    const response = await fetchApi<{
      products: any[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(endpoint);

    // Transform API response to AdminProduct format
    return {
      ...response,
      products: response.products.map(transformApiProduct),
    };
  },

  // Get single product by ID
  async getProduct(id: number): Promise<AdminProduct> {
    const product = await fetchApi<any>(`/products/${id}`);
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
      categoryCounts: Record<string, number>;
      totalVariants: number;
    }>('/products/stats');

    return {
      totalProducts: stats.totalProducts,
      enabledProducts: stats.enabledProducts,
      disabledProducts: stats.disabledProducts,
      categoryCounts: stats.categoryCounts as any,
      totalVariants: stats.totalVariants,
      recentlyAdded: 0,
    };
  },

  // Create a new product
  async createProduct(product: Partial<AdminProduct>): Promise<AdminProduct> {
    const apiProduct = transformToApiProduct(product);
    const created = await fetchApi<any>('/products', {
      method: 'POST',
      body: JSON.stringify(apiProduct),
    });
    return transformApiProduct(created);
  },

  // Update a product
  async updateProduct(id: number, updates: Partial<AdminProduct>): Promise<AdminProduct> {
    const apiUpdates = transformToApiProduct(updates);
    const updated = await fetchApi<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiUpdates),
    });
    return transformApiProduct(updated);
  },

  // Toggle product enabled status
  async toggleEnabled(id: number): Promise<AdminProduct> {
    const updated = await fetchApi<any>(`/products/${id}/toggle`, {
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

// Transform API product to AdminProduct format
function transformApiProduct(apiProduct: any): AdminProduct {
  return {
    id: apiProduct.product_id,
    dbId: apiProduct.id,
    category: apiProduct.category,
    name: apiProduct.name,
    price: apiProduct.price?.toString() || '0',
    link: apiProduct.link || '',
    image: apiProduct.image || '',
    variantType: apiProduct.variant_type || 'Default',
    features: apiProduct.features || [],
    variants: apiProduct.variants || [],
    enabled: apiProduct.enabled ?? true,
    createdAt: apiProduct.created_at ? new Date(apiProduct.created_at).getTime() : undefined,
    updatedAt: apiProduct.updated_at ? new Date(apiProduct.updated_at).getTime() : undefined,
    lastSyncedAt: apiProduct.last_synced_at ? new Date(apiProduct.last_synced_at).getTime() : undefined,
  };
}

// Transform AdminProduct to API format
function transformToApiProduct(product: Partial<AdminProduct>): any {
  const result: any = {};

  if (product.id !== undefined) result.product_id = product.id;
  if (product.category !== undefined) result.category = product.category;
  if (product.name !== undefined) result.name = product.name;
  if (product.price !== undefined) result.price = product.price;
  if (product.link !== undefined) result.link = product.link;
  if (product.image !== undefined) result.image = product.image;
  if (product.variantType !== undefined) result.variant_type = product.variantType;
  if (product.features !== undefined) result.features = product.features;
  if (product.variants !== undefined) result.variants = product.variants;
  if (product.enabled !== undefined) result.enabled = product.enabled;

  return result;
}

export default {
  products: productApi,
  sync: syncApi,
};
