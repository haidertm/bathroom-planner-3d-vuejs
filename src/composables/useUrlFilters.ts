// URL-based Filter Persistence Composable
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { ProductFilters } from '../types/admin';
import type { ComponentType } from '../constants/components';
import { COMPONENTS } from '../constants/components';

// Debounce utility to prevent excessive URL updates
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function useUrlFilters() {
  const route = useRoute();
  const router = useRouter();

  const isInitialized = ref(false);

  // Parse filters from URL query parameters
  const parseFiltersFromUrl = (): Partial<ProductFilters> => {
    const query = route.query;
    const filters: Partial<ProductFilters> = {};

    // Parse search query
    if (query.q && typeof query.q === 'string') {
      filters.searchQuery = query.q;
    }

    // Parse categories (comma-separated)
    if (query.categories && typeof query.categories === 'string') {
      const categoryList = query.categories.split(',').filter(c =>
        COMPONENTS.includes(c as ComponentType)
      ) as ComponentType[];
      if (categoryList.length > 0) {
        filters.categories = categoryList;
      }
    }

    // Parse price range
    if (query.minPrice && typeof query.minPrice === 'string') {
      const min = parseFloat(query.minPrice);
      if (!isNaN(min)) {
        filters.priceRange = { ...filters.priceRange, min } as any;
      }
    }
    if (query.maxPrice && typeof query.maxPrice === 'string') {
      const max = parseFloat(query.maxPrice);
      if (!isNaN(max)) {
        filters.priceRange = {
          min: filters.priceRange?.min ?? null,
          max
        };
      }
    }

    // Parse sort options
    if (query.sortBy && typeof query.sortBy === 'string') {
      const validSortBy = ['name', 'price', 'category', 'createdAt'];
      if (validSortBy.includes(query.sortBy)) {
        filters.sortBy = query.sortBy as ProductFilters['sortBy'];
      }
    }
    if (query.sortOrder && typeof query.sortOrder === 'string') {
      if (query.sortOrder === 'asc' || query.sortOrder === 'desc') {
        filters.sortOrder = query.sortOrder;
      }
    }

    // Parse enabled filter
    if (query.enabled && typeof query.enabled === 'string') {
      const validEnabledValues = ['all', 'enabled', 'disabled'];
      if (validEnabledValues.includes(query.enabled)) {
        filters.enabledFilter = query.enabled as ProductFilters['enabledFilter'];
      }
    }

    return filters;
  };

  // Get pagination from URL
  const parsePaginationFromUrl = (): { page: number; perPage: number } | null => {
    const query = route.query;
    const result: { page: number; perPage: number } = {
      page: 1,
      perPage: 12,
    };

    if (query.page && typeof query.page === 'string') {
      const page = parseInt(query.page, 10);
      if (!isNaN(page) && page > 0) {
        result.page = page;
      }
    }

    if (query.perPage && typeof query.perPage === 'string') {
      const perPage = parseInt(query.perPage, 10);
      if (!isNaN(perPage) && [12, 24, 48].includes(perPage)) {
        result.perPage = perPage;
      }
    }

    return result;
  };

  // Update URL with current filters (debounced)
  const updateUrl = debounce((filters: ProductFilters, pagination: { currentPage: number; itemsPerPage: number }) => {
    const query: Record<string, string> = {};

    // Add search query
    if (filters.searchQuery) {
      query.q = filters.searchQuery;
    }

    // Add categories
    if (filters.categories.length > 0) {
      query.categories = filters.categories.join(',');
    }

    // Add price range
    if (filters.priceRange.min !== null) {
      query.minPrice = filters.priceRange.min.toString();
    }
    if (filters.priceRange.max !== null) {
      query.maxPrice = filters.priceRange.max.toString();
    }

    // Add sort options (only if not default)
    if (filters.sortBy !== 'name') {
      query.sortBy = filters.sortBy;
    }
    if (filters.sortOrder !== 'asc') {
      query.sortOrder = filters.sortOrder;
    }

    // Add enabled filter (only if not default)
    if (filters.enabledFilter !== 'all') {
      query.enabled = filters.enabledFilter;
    }

    // Add pagination (only if not default)
    if (pagination.currentPage > 1) {
      query.page = pagination.currentPage.toString();
    }
    if (pagination.itemsPerPage !== 12) {
      query.perPage = pagination.itemsPerPage.toString();
    }

    // Only update if query params changed
    const currentQuery = { ...route.query };
    const hasChanged = JSON.stringify(query) !== JSON.stringify(currentQuery);

    if (hasChanged) {
      router.replace({ query });
    }
  }, 300);

  // Clear all URL filters
  const clearUrlFilters = () => {
    router.replace({ query: {} });
  };

  return {
    isInitialized,
    parseFiltersFromUrl,
    parsePaginationFromUrl,
    updateUrl,
    clearUrlFilters,
  };
}
