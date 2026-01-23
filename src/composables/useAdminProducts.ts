// Admin Products Management Composable - Read Only Version
import { ref, computed, watch } from 'vue';
import type { ComponentType } from '../constants/components';
import { COMPONENTS } from '../constants/components';
import type {
  AdminProduct,
  ProductFilters,
  PaginationState,
  AdminStats,
} from '../types/admin';
import productData from '../mocks/productData';

// Reactive state
const products = ref<AdminProduct[]>([]);
const filters = ref<ProductFilters>({
  categories: [],
  searchQuery: '',
  priceRange: { min: null, max: null },
  sortBy: 'name',
  sortOrder: 'asc',
});
const pagination = ref<PaginationState>({
  currentPage: 1,
  itemsPerPage: 12,
  totalItems: 0,
});

// Helper: Convert raw product data to AdminProduct format
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
  };
};

// Load products directly from productData.ts
const loadProducts = (): AdminProduct[] => {
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

export function useAdminProducts() {
  // Initialize products on first use
  if (products.value.length === 0) {
    products.value = loadProducts();
  }

  // Filtered and sorted products
  const filteredProducts = computed(() => {
    let result = [...products.value];

    // Filter by categories (multi-select)
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
      result = result.filter(p => parseFloat(p.price) >= filters.value.priceRange.min!);
    }
    if (filters.value.priceRange.max !== null) {
      result = result.filter(p => parseFloat(p.price) <= filters.value.priceRange.max!);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.value.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = parseFloat(a.price) - parseFloat(b.price);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'createdAt':
          comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
      }
      return filters.value.sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  });

  // Paginated products
  const paginatedProducts = computed(() => {
    const start = (pagination.value.currentPage - 1) * pagination.value.itemsPerPage;
    const end = start + pagination.value.itemsPerPage;
    return filteredProducts.value.slice(start, end);
  });

  // Total pages
  const totalPages = computed(() =>
    Math.ceil(filteredProducts.value.length / pagination.value.itemsPerPage)
  );

  // Statistics
  const stats = computed((): AdminStats => {
    const categoryCounts = {} as Record<ComponentType, number>;
    let totalVariants = 0;

    for (const category of COMPONENTS) {
      categoryCounts[category] = 0;
    }

    for (const product of products.value) {
      categoryCounts[product.category]++;
      totalVariants += product.variants.length;
    }

    return {
      totalProducts: products.value.length,
      categoryCounts,
      totalVariants,
      recentlyAdded: 0,
    };
  });

  // Update pagination total when filter changes
  watch(filteredProducts, (newFiltered) => {
    pagination.value.totalItems = newFiltered.length;
    // Reset to first page if current page exceeds total pages
    if (pagination.value.currentPage > totalPages.value && totalPages.value > 0) {
      pagination.value.currentPage = 1;
    }
  }, { immediate: true });

  // Filter operations
  const setFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]): void => {
    filters.value[key] = value;
    pagination.value.currentPage = 1; // Reset to first page on filter change
  };

  const toggleCategoryFilter = (category: ComponentType): void => {
    const index = filters.value.categories.indexOf(category);
    if (index === -1) {
      filters.value.categories.push(category);
    } else {
      filters.value.categories.splice(index, 1);
    }
    pagination.value.currentPage = 1;
  };

  const clearFilters = (): void => {
    filters.value = {
      categories: [],
      searchQuery: '',
      priceRange: { min: null, max: null },
      sortBy: 'name',
      sortOrder: 'asc',
    };
    pagination.value.currentPage = 1;
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

  return {
    // State
    products,
    filters,
    pagination,

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

    // Read operations
    getProduct,
  };
}
