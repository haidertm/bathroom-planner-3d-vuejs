// Admin Products Management Composable - API Version
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
import { productApi } from '../services/api';

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

// Fetch products from API
const fetchProducts = async (): Promise<void> => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await productApi.getProducts(filters.value, pagination.value);
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
    }
    return filters.value.sortOrder === 'asc' ? comparison : -comparison;
  });

  return result;
};

// Fetch statistics from API
const fetchStats = async (): Promise<void> => {
  try {
    stats.value = await productApi.getStats();
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
  // Initialize products on first use
  if (isInitialLoad.value && products.value.length === 0) {
    // Fetch initial data and mark initialization complete
    Promise.all([fetchProducts(), fetchStats()]).finally(() => {
      isInitialLoad.value = false;
    });
  } else {
    // If products are already loaded, just ensure the flag is reset
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

  // Toggle product enabled status
  const toggleProductEnabled = async (product: AdminProduct): Promise<boolean> => {
    if (!product.dbId) {
      console.error('Cannot toggle product without dbId');
      return false;
    }

    try {
      const updated = await productApi.toggleEnabled(product.dbId);
      // Update local state
      const index = products.value.findIndex(p => p.id === product.id);
      if (index !== -1) {
        products.value[index] = updated;
      }
      // Refresh stats
      await fetchStats();
      return true;
    } catch (err) {
      console.error('Failed to toggle product status:', err);
      return false;
    }
  };

  // Update product
  const updateProduct = async (product: AdminProduct): Promise<boolean> => {
    if (!product.dbId) {
      console.error('Cannot update product without dbId');
      return false;
    }

    try {
      const updated = await productApi.updateProduct(product.dbId, product);
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

  // Create product
  const createProduct = async (product: Partial<AdminProduct>): Promise<AdminProduct | null> => {
    try {
      const created = await productApi.createProduct(product);
      products.value.push(created);
      // Update pagination total (totalPages computed property will update automatically)
      pagination.value.totalItems = (pagination.value.totalItems ?? 0) + 1;
      await fetchStats();
      return created;
    } catch (err) {
      console.error('Failed to create product:', err);
      return null;
    }
  };

  // Delete product
  const deleteProduct = async (product: AdminProduct): Promise<boolean> => {
    if (!product.dbId) {
      console.error('Cannot delete product without dbId');
      return false;
    }

    try {
      await productApi.deleteProduct(product.dbId);
      // Remove from local state
      products.value = products.value.filter(p => p.id !== product.id);
      // Update pagination total (totalPages computed property will update automatically)
      pagination.value.totalItems = Math.max(0, (pagination.value.totalItems ?? 0) - 1);
      await fetchStats();
      return true;
    } catch (err) {
      console.error('Failed to delete product:', err);
      return false;
    }
  };

  // Refresh products
  const refreshProducts = async (): Promise<void> => {
    await fetchProducts();
    await fetchStats();
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
    updateProduct,
    createProduct,
    deleteProduct,
    refreshProducts,
  };
}
