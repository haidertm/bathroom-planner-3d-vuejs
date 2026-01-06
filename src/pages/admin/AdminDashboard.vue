<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuth } from '../../composables/useAdminAuth';
import { useAdminProducts } from '../../composables/useAdminProducts';
import { useUrlFilters } from '../../composables/useUrlFilters';
import { useToast } from '../../composables/useToast';
import { COMPONENTS, type ComponentType } from '../../constants/components';
import type { AdminProduct, ProductFilters } from '../../types/admin';

// Components
import AdminSidebar from './components/AdminSidebar.vue';
import AdminHeader from './components/AdminHeader.vue';
import StatsCards from './components/StatsCards.vue';
import ProductFiltersComponent from './components/ProductFilters.vue';
import ProductTable from './components/ProductTable.vue';
import Pagination from './components/Pagination.vue';
import ProductDrawer from './components/ProductDrawer.vue';
import ToastContainer from '../../components/ui/ToastContainer.vue';

/**
 * Category Filter Exclusions
 *
 * BUSINESS LOGIC: 'Sink' and 'Door' categories are excluded from the admin
 * dashboard's filter UI for the following reasons:
 *
 * 1. SINK: This category has been deprecated in favor of 'Furniture' which now
 *    includes vanity units with integrated basins. Existing Sink products in
 *    the database remain accessible and editable via direct URL or search.
 *
 * 2. DOOR: Door products are managed separately as they relate to room structure
 *    rather than bathroom fixtures. The 'WindowAndDoor' category handles both.
 *
 * IMPORTANT NOTES:
 * - This is a UI-level filter only; products in these categories still exist
 *   in the database and can be:
 *   - Edited via direct URL: /vadmin/products/:id/edit
 *   - Found via search (searchQuery filter)
 *   - Retrieved via API endpoints
 * - This exclusion is considered PERMANENT unless business requirements change
 * - To re-enable, remove the category from the exclusion array below
 *
 * @see COMPONENTS in constants/components.ts for all available categories
 */
const EXCLUDED_FILTER_CATEGORIES = ['Sink', 'Door'] as const;
const filteredCategories = COMPONENTS.filter(
  (category) => !EXCLUDED_FILTER_CATEGORIES.includes(category as typeof EXCLUDED_FILTER_CATEGORIES[number])
);

/**
 * GTM Tracking Helper for Admin Dashboard
 * Pushes events to Google Tag Manager dataLayer for analytics
 */
function trackAdminEvent(
  action: string,
  details: Record<string, string | number | boolean>
): void {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push({
      event: 'admin_dashboard',
      admin_action: action,
      ...details,
    });
  }
}

const router = useRouter();
const { username, logout, validateSession } = useAdminAuth();
const {
  filters,
  pagination,
  filteredProducts,
  paginatedProducts,
  totalPages,
  stats,
  isLoading: productsLoading,
  useLocalFallback,
  toggleCategoryFilter,
  setFilter,
  clearFilters,
  setPage,
  setItemsPerPage,
  toggleProductEnabled,
} = useAdminProducts();

const {
  parseFiltersFromUrl,
  parsePaginationFromUrl,
  updateUrl,
  clearUrlFilters,
} = useUrlFilters();

const toast = useToast();

// UI State
const sidebarCollapsed = ref(false);
const isMobile = ref(false);
const showMobileSidebar = ref(false);
const isLoading = ref(false);

// Product Detail Drawer State
const selectedProduct = ref<AdminProduct | null>(null);
const showProductDrawer = ref(false);

// Check if mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
  if (isMobile.value) {
    sidebarCollapsed.value = true;
  }
};

// Toggle sidebar
const toggleSidebar = () => {
  if (isMobile.value) {
    showMobileSidebar.value = !showMobileSidebar.value;
  } else {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }
};

// Close mobile sidebar
const closeMobileSidebar = () => {
  showMobileSidebar.value = false;
};

// Product drawer operations
const openProductDrawer = (product: AdminProduct) => {
  selectedProduct.value = product;
  showProductDrawer.value = true;
};

const closeProductDrawer = () => {
  showProductDrawer.value = false;
  setTimeout(() => {
    selectedProduct.value = null;
  }, 300);
};

// Handle logout
const handleLogout = () => {
  logout();
  router.push('/vadmin');
};

// Handle product toggle
const handleToggleEnabled = async (product: AdminProduct) => {
  const newStatus = !product.enabled;
  const success = await toggleProductEnabled(product);
  if (success) {
    toast.success(`Product ${product.enabled ? 'disabled' : 'enabled'} successfully`);
    trackAdminEvent('product_toggle', {
      product_id: product.id,
      product_name: product.name,
      category: product.category,
      new_status: newStatus ? 'enabled' : 'disabled',
    });
  } else {
    toast.error('Failed to update product status');
  }
};

// Handle product edit - navigate to edit page
const handleEditProduct = (product: AdminProduct) => {
  if (!product.dbId) {
    toast.warning('This product cannot be edited in local fallback mode.');
    return;
  }
  trackAdminEvent('product_edit_start', {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
  });
  router.push(`/vadmin/products/${product.dbId}/edit`);
};

// Export to CSV
const exportToCSV = () => {
  const products = filteredProducts.value;

  if (products.length === 0) {
    toast.warning('No products to export');
    return;
  }

  const headers = ['ID', 'Name', 'Category', 'Price', 'SKU', 'Variants Count', 'Features', 'Link'];

  const rows = products.map(product => [
    product.id,
    `"${product.name.replace(/"/g, '""')}"`,
    product.category,
    product.price,
    product.variants.length > 0 ? product.variants[0].sku : '',
    product.variants.length,
    `"${product.features.join(', ').replace(/"/g, '""')}"`,
    product.link || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Revoke the object URL
  }

  toast.success(`Exported ${products.length} products to CSV`);
  trackAdminEvent('export_csv', {
    product_count: products.length,
    has_filters: filters.value.categories.length > 0 || !!filters.value.searchQuery,
  });
};

// Filter handlers with GTM tracking
const handleSearchUpdate = (value: string) => {
  simulateLoading();
  setFilter('searchQuery', value);
  if (value.length >= 2) {
    trackAdminEvent('filter_search', { search_query: value });
  }
};

const handleCategoryToggle = (category: ComponentType) => {
  simulateLoading();
  const isAdding = !filters.value.categories.includes(category);
  toggleCategoryFilter(category);
  trackAdminEvent('filter_category_toggle', {
    category,
    action: isAdding ? 'add' : 'remove',
    active_categories: isAdding
      ? [...filters.value.categories, category].join(',')
      : filters.value.categories.filter(c => c !== category).join(','),
  });
};

const handlePriceRangeUpdate = (value: { min: number | null; max: number | null }) => {
  simulateLoading();
  setFilter('priceRange', value);
  trackAdminEvent('filter_price_range', {
    min_price: value.min ?? 0,
    max_price: value.max ?? 0,
  });
};

const handleSortByUpdate = (value: ProductFilters['sortBy']) => {
  simulateLoading();
  setFilter('sortBy', value);
  trackAdminEvent('filter_sort', { sort_by: value, sort_order: filters.value.sortOrder });
};

const handleSortOrderUpdate = (value: ProductFilters['sortOrder']) => {
  simulateLoading();
  setFilter('sortOrder', value);
  trackAdminEvent('filter_sort', { sort_by: filters.value.sortBy, sort_order: value });
};

const handleEnabledFilterUpdate = (value: ProductFilters['enabledFilter']) => {
  simulateLoading();
  setFilter('enabledFilter', value);
  trackAdminEvent('filter_enabled_status', { enabled_filter: value });
};

const handleClearFilters = () => {
  simulateLoading();
  clearFilters();
  clearUrlFilters();
  toast.info('Filters cleared');
  trackAdminEvent('filter_clear_all', { cleared: true });
};

// Pagination handlers
const handlePageUpdate = (page: number) => {
  simulateLoading();
  setPage(page);
};

const handleItemsPerPageUpdate = (count: number) => {
  simulateLoading();
  setItemsPerPage(count);
};

// Simulate loading for better UX
const simulateLoading = () => {
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
  }, 200);
};

// Watch filters and pagination to update URL
watch(
  [filters, pagination],
  ([newFilters, newPagination]) => {
    updateUrl(newFilters, newPagination);
  },
  { deep: true }
);

// Keyboard shortcuts
const handleGlobalKeydown = (event: KeyboardEvent) => {
  // Ctrl+K or Cmd+K to focus search
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    searchInput?.focus();
  }
};

// Initialize
onMounted(() => {
  // Check authentication
  if (!validateSession()) {
    router.push('/vadmin');
    return;
  }

  // Initialize mobile detection
  checkMobile();
  window.addEventListener('resize', checkMobile);
  document.addEventListener('keydown', handleGlobalKeydown);

  // Load filters from URL
  const urlFilters = parseFiltersFromUrl();
  const urlPagination = parsePaginationFromUrl();

  if (urlFilters.searchQuery) setFilter('searchQuery', urlFilters.searchQuery);
  if (urlFilters.categories) {
    urlFilters.categories.forEach(cat => {
      if (!filters.value.categories.includes(cat)) {
        toggleCategoryFilter(cat);
      }
    });
  }
  if (urlFilters.priceRange) setFilter('priceRange', urlFilters.priceRange);
  if (urlFilters.sortBy) setFilter('sortBy', urlFilters.sortBy);
  if (urlFilters.sortOrder) setFilter('sortOrder', urlFilters.sortOrder);

  if (urlPagination) {
    if (urlPagination.page > 1) setPage(urlPagination.page);
    if (urlPagination.perPage !== 12) setItemsPerPage(urlPagination.perPage);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  document.removeEventListener('keydown', handleGlobalKeydown);
});

// Computed styles for main content margin
const mainContentStyle = computed(() => ({
  marginLeft: isMobile.value ? '0' : (sidebarCollapsed.value ? '72px' : '240px'),
  transition: 'margin-left 0.2s ease',
}));
</script>

<template>
  <div class="admin-container">
    <!-- Sidebar -->
    <AdminSidebar
      :collapsed="sidebarCollapsed"
      :username="username"
      :is-mobile="isMobile"
      :show-mobile-sidebar="showMobileSidebar"
      @toggle-collapse="toggleSidebar"
      @close-mobile="closeMobileSidebar"
      @logout="handleLogout"
    />

    <!-- Mobile Sidebar Overlay -->
    <div
      v-if="showMobileSidebar"
      class="mobile-overlay"
      @click="closeMobileSidebar"
    ></div>

    <!-- Main Content -->
    <main class="admin-main" :style="mainContentStyle">
      <!-- Header -->
      <AdminHeader
        title="Products"
        :is-mobile="isMobile"
        @toggle-sidebar="toggleSidebar"
      />

      <!-- Stats Cards -->
      <StatsCards
        :stats="stats"
        :categories-count="filteredCategories.length"
      />

      <!-- Product List View -->
      <div class="admin-content">
        <!-- Filters Section -->
        <ProductFiltersComponent
          :filters="filters"
          :categories="filteredCategories"
          :result-count="filteredProducts.length"
          @update:search-query="handleSearchUpdate"
          @toggle-category="handleCategoryToggle"
          @update:price-range="handlePriceRangeUpdate"
          @update:sort-by="handleSortByUpdate"
          @update:sort-order="handleSortOrderUpdate"
          @update:enabled-filter="handleEnabledFilterUpdate"
          @clear-filters="handleClearFilters"
          @export-csv="exportToCSV"
        />

        <!-- Products Table -->
        <ProductTable
          :products="paginatedProducts"
          :is-loading="isLoading || productsLoading"
          :use-local-fallback="useLocalFallback"
          @select-product="openProductDrawer"
          @toggle-enabled="handleToggleEnabled"
          @edit-product="handleEditProduct"
        />

        <!-- Pagination -->
        <Pagination
          :current-page="pagination.currentPage"
          :total-pages="totalPages"
          :total-items="filteredProducts.length"
          :items-per-page="pagination.itemsPerPage"
          @update:current-page="handlePageUpdate"
          @update:items-per-page="handleItemsPerPageUpdate"
        />
      </div>
    </main>

    <!-- Product Detail Drawer -->
    <ProductDrawer
      :product="selectedProduct"
      :is-open="showProductDrawer"
      @close="closeProductDrawer"
    />

    <!-- Toast Notifications -->
    <ToastContainer />
  </div>
</template>

<style>
/* CSS Variables */
:root {
  --primary-color: #29275B;
  --border-color: #e2e8f0;
  --text-color: #2d3748;
  --muted-color: #6b7280;
}
</style>

<style scoped>
.admin-container {
  display: flex;
  min-height: 100vh;
  background-color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.admin-content {
  flex: 1;
  padding: 0 24px 24px;
}

/* Mobile sidebar overlay */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

/* Mobile styles */
@media (max-width: 767px) {
  .admin-main {
    margin-left: 0 !important;
    width: 100%;
  }

  .admin-content {
    padding: 0 16px 16px;
  }
}
</style>
