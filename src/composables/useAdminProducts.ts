// Admin Products Management Composable - API Version with IndexedDB Caching
import { ref, computed, watch, onScopeDispose } from 'vue';
import type { ComponentType } from '../constants/components';
import { COMPONENTS } from '../constants/components';
import type {
  AdminProduct,
  ProductFilters,
  PaginationState,
  AdminStats,
} from '../types/admin';
import {
  DEFAULT_FILTERS,
  DEFAULT_PAGINATION,
} from '../types/admin';
import { useCachedApi } from './useCachedApi';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

// Reactive state
const products = ref<AdminProduct[]>([]);
const filters = ref<ProductFilters>({ ...DEFAULT_FILTERS });
const pagination = ref<PaginationState>({ ...DEFAULT_PAGINATION });

const isLoading = ref(false);
const error = ref<string | null>(null);
const stats = ref<AdminStats>({
  totalProducts: 0,
  enabledProducts: 0,
  disabledProducts: 0,
  categoryCounts: {} as Record<ComponentType, number>,
  totalVariants: 0,
});

// Flag to track if we're using API or fallback
const useLocalFallback = ref(false);

// Flag to prevent duplicate API calls during initialization
const isInitialLoad = ref(true);

// Module-scoped Promise guard to prevent concurrent initialization fetches
// This ensures only one Promise.all is created even if multiple components
// call useAdminProducts() simultaneously before the first fetch completes
let initPromise: Promise<void> | null = null;

// Import local product data for fallback
let localProductData: any = null;

// Load local product data dynamically (for fallback)
const loadLocalProductData = async () => {
  if (localProductData) return localProductData;
  try {
    const module = await import('../mocks/productData');
    localProductData = module.default;
    return localProductData;
  } catch (e) {
    console.error('Failed to load local product data:', e);
    return null;
  }
};

// Convert local product data to AdminProduct format
const convertToAdminProduct = (
  category: ComponentType,
  rawProduct: any
): AdminProduct => {
  return {
    id: rawProduct.id,
    category,
    name: rawProduct.name,
    price: rawProduct.price,
    link: rawProduct.link,
    image: rawProduct.image,
    variantType: rawProduct.variantType || 'Default',
    features: rawProduct.features || [],
    variants: rawProduct.variants || [],
    enabled: true, // All local products are enabled by default
  };
};

// Load products from local data (fallback)
const loadLocalProducts = async (): Promise<AdminProduct[]> => {
  const productData = await loadLocalProductData();
  if (!productData) return [];

  const allProducts: AdminProduct[] = [];

  for (const category of COMPONENTS) {
    const categoryProducts = (productData as any)[category];
    if (Array.isArray(categoryProducts)) {
      for (const product of categoryProducts) {
        allProducts.push(convertToAdminProduct(category, product));
      }
    }
  }

  return allProducts;
};

// Cached API instance
const cachedApi = useCachedApi();

// Fetch products from API with IndexedDB caching
const fetchProducts = async (forceRefresh = false): Promise<void> => {
  isLoading.value = true;
  error.value = null;

  try {
    // Use cached API - it will check IndexedDB first, then fallback to API
    const response = await cachedApi.getProducts(filters.value, pagination.value, forceRefresh);
    products.value = response.products;
    pagination.value.totalItems = response.total;
    useLocalFallback.value = false;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('API not available, falling back to local data:', err);
    }
    useLocalFallback.value = true;

    // Fallback to local data - store unfiltered products
    // Filtering will be applied via the filteredProducts computed property
    const localProducts = await loadLocalProducts();
    products.value = localProducts;

    // Only set error if fallback also failed to provide products
    if (localProducts.length === 0) {
      error.value = 'Failed to load products from API and local fallback';
    } else {
      error.value = null;
    }
  } finally {
    isLoading.value = false;
  }
};

// Apply filters locally (for fallback mode)
const applyLocalFilters = (allProducts: AdminProduct[]): AdminProduct[] => {
  let result = [...allProducts];

  // Filter by categories
  if (filters.value.categories.length > 0) {
    result = result.filter(p => filters.value.categories.includes(p.category));
  }

  // Filter by search query
  if (filters.value.searchQuery.trim()) {
    const query = filters.value.searchQuery.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.variants.some(v =>
        v.name.toLowerCase().includes(query) ||
        v.sku.toLowerCase().includes(query)
      )
    );
  }

  // Filter by price range
  if (filters.value.priceRange.min !== null) {
    const minPrice = filters.value.priceRange.min;
    result = result.filter(p => {
      const price = parseFloat(p.price);
      // Exclude products with non-finite prices when filtering by min price
      if (!Number.isFinite(price)) return false;
      return price >= minPrice;
    });
  }
  if (filters.value.priceRange.max !== null) {
    const maxPrice = filters.value.priceRange.max;
    result = result.filter(p => {
      const price = parseFloat(p.price);
      // Exclude products with non-finite prices when filtering by max price
      if (!Number.isFinite(price)) return false;
      return price <= maxPrice;
    });
  }

  // Filter by enabled status
  if (filters.value.enabledFilter !== 'all') {
    const enabledValue = filters.value.enabledFilter === 'enabled';
    result = result.filter(p => p.enabled === enabledValue);
  }

  // Filter by updatedAt
  if (filters.value.updatedAtFilter.preset !== 'all') {
    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    switch (filters.value.updatedAtFilter.preset) {
      case 'today': {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'yesterday': {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        fromDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        toDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
        break;
      }
      case 'week': {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 7);
        fromDate.setHours(0, 0, 0, 0);
        toDate = now;
        break;
      }
      case 'month': {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 30);
        fromDate.setHours(0, 0, 0, 0);
        toDate = now;
        break;
      }
      case 'custom': {
        const { from, to } = filters.value.updatedAtFilter.customRange;
        if (from) {
          fromDate = new Date(from);
          fromDate.setHours(0, 0, 0, 0);
        }
        if (to) {
          toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
        }
        break;
      }
    }

    result = result.filter(p => {
      if (!p.updatedAt) return false;
      const productUpdatedAt = new Date(p.updatedAt);
      if (fromDate && productUpdatedAt < fromDate) return false;
      if (toDate && productUpdatedAt > toDate) return false;
      return true;
    });
  }

  // Sort
  result.sort((a, b) => {
    let comparison = 0;
    switch (filters.value.sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price': {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        const validA = Number.isFinite(priceA);
        const validB = Number.isFinite(priceB);
        // Sort invalid prices to the end
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
        // Enabled products first when ascending
        comparison = (a.enabled === b.enabled) ? 0 : (a.enabled ? -1 : 1);
        break;
      case 'createdAt':
        comparison = (a.createdAt || 0) - (b.createdAt || 0);
        break;
      case 'updatedAt':
        comparison = (a.updatedAt || 0) - (b.updatedAt || 0);
        break;
    }
    return filters.value.sortOrder === 'asc' ? comparison : -comparison;
  });

  return result;
};

// Fetch statistics from API with IndexedDB caching
const fetchStats = async (forceRefresh = false): Promise<void> => {
  try {
    // Use cached API - it will check IndexedDB first, then fallback to API
    stats.value = await cachedApi.getStats(forceRefresh);
  } catch (err) {
    console.warn('Failed to fetch stats from API:', err);
    // Calculate stats from local data
    const localProducts = await loadLocalProducts();
    const categoryCounts = {} as Record<ComponentType, number>;
    let totalVariants = 0;

    for (const category of COMPONENTS) {
      categoryCounts[category] = 0;
    }

    for (const product of localProducts) {
      categoryCounts[product.category]++;
      totalVariants += product.variants.length;
    }

    stats.value = {
      totalProducts: localProducts.length,
      enabledProducts: localProducts.length,
      disabledProducts: 0,
      categoryCounts,
      totalVariants,
    };
  }
};

export function useAdminProducts() {
  // Initialize products on first use with Promise guard to prevent race conditions
  // Multiple concurrent calls will all await the same initialization Promise
  if (isInitialLoad.value && products.value.length === 0) {
    // If no initialization is in progress, start one
    if (!initPromise) {
      initPromise = Promise.all([fetchProducts(), fetchStats()])
        .then(() => {
          // Initialization successful
        })
        .finally(() => {
          // Clear the Promise guard and mark initialization complete
          initPromise = null;
          isInitialLoad.value = false;
        });
    }
    // All callers (including concurrent ones) will await the same Promise
    // This is fire-and-forget in the composable setup, but prevents duplicate fetches
  } else if (!initPromise) {
    // If products are already loaded and no init is in progress, ensure the flag is reset
    isInitialLoad.value = false;
  }

  // Filtered products (for local mode - in API mode, filtering is done server-side)
  const filteredProducts = computed(() => {
    if (useLocalFallback.value) {
      return applyLocalFilters(products.value);
    }
    return products.value;
  });

  // Paginated products (for local mode)
  const paginatedProducts = computed(() => {
    if (useLocalFallback.value) {
      const start = (pagination.value.currentPage - 1) * pagination.value.itemsPerPage;
      const end = start + pagination.value.itemsPerPage;
      return filteredProducts.value.slice(start, end);
    }
    // In API mode, products are already paginated
    return products.value;
  });

  // Total pages - use filteredProducts length in local fallback mode
  const totalPages = computed(() => {
    const totalItems = useLocalFallback.value
      ? filteredProducts.value.length
      : pagination.value.totalItems;
    return Math.ceil(totalItems / pagination.value.itemsPerPage);
  });

  // Debounced fetch to prevent excessive API calls on rapid changes (e.g., keystrokes)
  const debouncedFetchProducts = debounce(() => {
    fetchProducts();
  }, 300);

  // Clean up debounced function on scope disposal to prevent memory leaks
  onScopeDispose(() => {
    debouncedFetchProducts.cancel();
  });

  // Watch filters and refetch when they change (debounced)
  watch(
    filters,
    () => {
      // Skip during initial load to prevent duplicate API calls
      if (isInitialLoad.value) return;
      pagination.value.currentPage = 1;
      debouncedFetchProducts();
    },
    { deep: true }
  );

  // Watch pagination changes (debounced)
  watch(
    () => [pagination.value.currentPage, pagination.value.itemsPerPage],
    () => {
      // Skip during initial load to prevent duplicate API calls
      if (isInitialLoad.value) return;
      debouncedFetchProducts();
    }
  );

  // Filter operations
  const setFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]): void => {
    filters.value[key] = value;
  };

  const toggleCategoryFilter = (category: ComponentType): void => {
    const index = filters.value.categories.indexOf(category);
    if (index === -1) {
      filters.value.categories.push(category);
    } else {
      filters.value.categories.splice(index, 1);
    }
  };

  const clearFilters = (): void => {
    filters.value = {
      categories: [],
      searchQuery: '',
      priceRange: { min: null, max: null },
      sortBy: 'name',
      sortOrder: 'asc',
      enabledFilter: 'all',
      updatedAtFilter: {
        preset: 'all',
        customRange: { from: null, to: null },
      },
    };
  };

  // Pagination operations
  const setPage = (page: number): void => {
    if (page >= 1 && page <= totalPages.value) {
      pagination.value.currentPage = page;
    }
  };

  const setItemsPerPage = (count: number): void => {
    pagination.value.itemsPerPage = count;
    pagination.value.currentPage = 1;
  };

  // Get product by ID
  const getProduct = (id: string): AdminProduct | undefined => {
    return products.value.find(p => p.id === id);
  };

  // Toggle product enabled status (with write-through caching)
  const toggleProductEnabled = async (product: AdminProduct): Promise<boolean> => {
    if (!product.dbId) {
      console.error('Cannot toggle product without dbId');
      return false;
    }

    try {
      // Use cached API - updates both server and IndexedDB
      const updated = await cachedApi.toggleEnabled(product.dbId);
      // Update local state
      const index = products.value.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products.value[index] = updated;
      }
      // Refresh stats (cache was invalidated by toggle)
      await fetchStats(true);
      return true;
    } catch (err) {
      console.error('Failed to toggle product status:', err);
      return false;
    }
  };

  // Bulk enable products (with write-through caching)
  const bulkEnableProducts = async (productIds: Set<string>): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    const productsToUpdate = products.value.filter(p => productIds.has(p.id) && !p.enabled && p.dbId);

    for (const product of productsToUpdate) {
      try {
        // Use cached API - updates both server and IndexedDB
        const updated = await cachedApi.toggleEnabled(product.dbId!);
        const index = products.value.findIndex(p => p.id === product.id);
        if (index !== -1) {
          products.value[index] = updated;
        }
        success++;
      } catch (err) {
        console.error(`Failed to enable product ${product.id}:`, err);
        failed++;
      }
    }

    if (success > 0) {
      await fetchStats(true);
    }

    return { success, failed };
  };

  // Bulk disable products (with write-through caching)
  const bulkDisableProducts = async (productIds: Set<string>): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    const productsToUpdate = products.value.filter(p => productIds.has(p.id) && p.enabled && p.dbId);

    for (const product of productsToUpdate) {
      try {
        // Use cached API - updates both server and IndexedDB
        const updated = await cachedApi.toggleEnabled(product.dbId!);
        const index = products.value.findIndex(p => p.id === product.id);
        if (index !== -1) {
          products.value[index] = updated;
        }
        success++;
      } catch (err) {
        console.error(`Failed to disable product ${product.id}:`, err);
        failed++;
      }
    }

    if (success > 0) {
      await fetchStats(true);
    }

    return { success, failed };
  };

  // Update product (with write-through caching)
  const updateProduct = async (product: AdminProduct): Promise<boolean> => {
    if (!product.dbId) {
      console.error('Cannot update product without dbId');
      return false;
    }

    try {
      // Use cached API - updates both server and IndexedDB
      const updated = await cachedApi.updateProduct(product.dbId, product);
      // Update local state
      const index = products.value.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products.value[index] = updated;
      }
      return true;
    } catch (err) {
      console.error('Failed to update product:', err);
      return false;
    }
  };

  // Create product (with write-through caching)
  const createProduct = async (product: Partial<AdminProduct>): Promise<AdminProduct | null> => {
    try {
      // Use cached API - creates on server and caches in IndexedDB
      const created = await cachedApi.createProduct(product);

      if (useLocalFallback.value) {
        // In local fallback mode, push to local array and update pagination manually
        // since filtering/pagination is done client-side
        products.value.push(created);
        pagination.value.totalItems = (pagination.value.totalItems ?? 0) + 1;
      } else {
        // In API mode, refresh the current page from the server to respect
        // server-side ordering/pagination - the new product may not appear
        // on the current page depending on sort order
        await fetchProducts();
      }

      await fetchStats(true);
      return created;
    } catch (err) {
      console.error('Failed to create product:', err);
      return null;
    }
  };

  // Delete product (with write-through caching)
  const deleteProduct = async (product: AdminProduct): Promise<boolean> => {
    if (!product.dbId) {
      console.error('Cannot delete product without dbId');
      return false;
    }

    try {
      // Use cached API - deletes from server and removes from IndexedDB
      await cachedApi.deleteProduct(product.dbId, product.id);
      // Remove from local state
      products.value = products.value.filter(p => p.id !== product.id);
      // Update pagination total (totalPages computed property will update automatically)
      pagination.value.totalItems = Math.max(0, (pagination.value.totalItems ?? 0) - 1);
      await fetchStats(true);
      return true;
    } catch (err) {
      console.error('Failed to delete product:', err);
      return false;
    }
  };

  // Refresh products (force refresh from API, bypass cache)
  const refreshProducts = async (): Promise<void> => {
    await fetchProducts(true);
    await fetchStats(true);
  };

  // Sync all data to IndexedDB cache
  const syncCache = async (): Promise<void> => {
    try {
      await cachedApi.syncAll();
      if (import.meta.env.DEV) {
        console.log('Cache synced successfully');
      }
    } catch (err) {
      console.error('Failed to sync cache:', err);
    }
  };

  // Clear IndexedDB cache
  const clearCache = async (): Promise<void> => {
    try {
      await cachedApi.invalidateCache();
      if (import.meta.env.DEV) {
        console.log('Cache cleared');
      }
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  // Get cache debug info
  const getCacheDebugInfo = async () => {
    return cachedApi.getDebugInfo();
  };

  return {
    // State
    products,
    filters,
    pagination,
    isLoading,
    error,
    useLocalFallback,

    // Computed
    filteredProducts,
    paginatedProducts,
    totalPages,
    stats,

    // Filter operations
    setFilter,
    toggleCategoryFilter,
    clearFilters,

    // Pagination
    setPage,
    setItemsPerPage,

    // CRUD operations
    getProduct,
    toggleProductEnabled,
    bulkEnableProducts,
    bulkDisableProducts,
    updateProduct,
    createProduct,
    deleteProduct,
    refreshProducts,

    // Cache management
    syncCache,
    clearCache,
    getCacheDebugInfo,
  };
}
