<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuth } from '../../composables/useAdminAuth';
import { useAdminProducts } from '../../composables/useAdminProducts';
import { useUrlFilters } from '../../composables/useUrlFilters';
import { useToast } from '../../composables/useToast';
import { COMPONENTS, type ComponentType } from '../../constants/components';
import { DEFAULT_PAGINATION, type AdminProduct, type ProductFilters } from '../../types/admin';

// Components
import AdminSidebar from './components/AdminSidebar.vue';
import AdminHeader from './components/AdminHeader.vue';
import StatsCards from './components/StatsCards.vue';
import ProductFiltersComponent from './components/ProductFilters.vue';
import ProductTable from './components/ProductTable.vue';
import Pagination from './components/Pagination.vue';
import ProductDrawer from './components/ProductDrawer.vue';
import ProductForm from './ProductForm.vue';
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
  bulkEnableProducts,
  bulkDisableProducts,
  createProduct,
  refreshProducts,
} = useAdminProducts();

// Bulk selection state
const selectedProducts = ref<Set<string>>(new Set());
const isBulkActionLoading = ref(false);

const selectedCount = computed(() => selectedProducts.value.size);

const handleSelectionChange = (newSelection: Set<string>) => {
  selectedProducts.value = newSelection;
};

const clearSelection = () => {
  selectedProducts.value = new Set();
};

// Bulk action handlers
const handleBulkEnable = async () => {
  if (selectedProducts.value.size === 0) return;

  isBulkActionLoading.value = true;
  const result = await bulkEnableProducts(selectedProducts.value);
  isBulkActionLoading.value = false;

  if (result.success > 0) {
    toast.success(`Enabled ${result.success} product${result.success > 1 ? 's' : ''}`);
    trackAdminEvent('bulk_enable', {
      success_count: result.success,
      failed_count: result.failed,
      total_selected: selectedProducts.value.size,
    });
  }
  if (result.failed > 0) {
    toast.error(`Failed to enable ${result.failed} product${result.failed > 1 ? 's' : ''}`);
  }

  clearSelection();
};

const handleBulkDisable = async () => {
  if (selectedProducts.value.size === 0) return;

  isBulkActionLoading.value = true;
  const result = await bulkDisableProducts(selectedProducts.value);
  isBulkActionLoading.value = false;

  if (result.success > 0) {
    toast.success(`Disabled ${result.success} product${result.success > 1 ? 's' : ''}`);
    trackAdminEvent('bulk_disable', {
      success_count: result.success,
      failed_count: result.failed,
      total_selected: selectedProducts.value.size,
    });
  }
  if (result.failed > 0) {
    toast.error(`Failed to disable ${result.failed} product${result.failed > 1 ? 's' : ''}`);
  }

  clearSelection();
};

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

// Product Detail Drawer State
const selectedProduct = ref<AdminProduct | null>(null);
const showProductDrawer = ref(false);

// Add Product Modal State
const showAddProductModal = ref(false);
const productToDuplicate = ref<AdminProduct | null>(null);

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
    toast.success(`Product ${newStatus ? 'enabled' : 'disabled'} successfully`);
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

// Handle create product from modal
const handleCreateProduct = async (productData: Omit<AdminProduct, 'id' | 'createdAt' | 'updatedAt'>) => {
  const result = await createProduct(productData);
  if (result) {
    toast.success('Product created successfully');
    showAddProductModal.value = false;
    productToDuplicate.value = null;
    trackAdminEvent('product_created', {
      product_name: result.name,
      category: result.category,
      variant_count: result.variants?.length || 0,
    });
  } else {
    toast.error('Failed to create product');
  }
};

// Handle duplicate product
const handleDuplicateProduct = (product: AdminProduct) => {
  productToDuplicate.value = product;
  showAddProductModal.value = true;
  trackAdminEvent('product_duplicate_start', {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
  });
};

/**
 * Properly escape a CSV field value.
 * - Replaces double-quotes with two double-quotes
 * - Wraps in double-quotes if field contains comma, double-quote, or newline
 */
const escapeField = (value: string | number): string => {
  const str = String(value);
  const needsQuoting = /[",\n\r]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
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
    escapeField(product.id),
    escapeField(product.name),
    escapeField(product.category),
    escapeField(product.price),
    escapeField(product.variants.length > 0 ? product.variants[0].sku : ''),
    escapeField(product.variants.length),
    escapeField(product.features.join(', ')),
    escapeField(product.link || '')
  ]);

  const csvContent = [
    headers.map(escapeField).join(','),
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
  setFilter('searchQuery', value);
  if (value.length >= 2) {
    trackAdminEvent('filter_search', { search_query: value });
  }
};

const handleCategoryToggle = (category: ComponentType) => {
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
  setFilter('priceRange', value);
  trackAdminEvent('filter_price_range', {
    min_price: value.min ?? 0,
    max_price: value.max ?? 0,
    min_is_set: value.min !== null,
    max_is_set: value.max !== null,
  });
};

// Handle column header click for sorting
const handleColumnSort = (column: ProductFilters['sortBy']) => {
  if (filters.value.sortBy === column) {
    // Toggle sort order if same column
    const newOrder = filters.value.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilter('sortOrder', newOrder);
    trackAdminEvent('filter_sort', { sort_by: column, sort_order: newOrder });
  } else {
    // Set new column with ascending order
    setFilter('sortBy', column);
    setFilter('sortOrder', 'asc');
    trackAdminEvent('filter_sort', { sort_by: column, sort_order: 'asc' });
  }
};

const handleEnabledFilterUpdate = (value: ProductFilters['enabledFilter']) => {
  setFilter('enabledFilter', value);
  trackAdminEvent('filter_enabled_status', { enabled_filter: value });
};

const handleUpdatedAtFilterUpdate = (value: ProductFilters['updatedAtFilter']) => {
  setFilter('updatedAtFilter', value);
  trackAdminEvent('filter_updated_at', {
    preset: value.preset,
    has_custom_from: !!value.customRange.from,
    has_custom_to: !!value.customRange.to,
  });
};

const handleClearFilters = () => {
  clearFilters();
  clearUrlFilters();
  toast.info('Filters cleared');
  trackAdminEvent('filter_clear_all', { cleared: true });
};

// Pagination handlers
const handlePageUpdate = (page: number) => {
  setPage(page);
};

const handleItemsPerPageUpdate = (count: number) => {
  setItemsPerPage(count);
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
onMounted(async () => {
  // Check authentication
  if (!validateSession()) {
    router.push('/vadmin');
    return;
  }

  // Initialize mobile detection
  checkMobile();
  window.addEventListener('resize', checkMobile);
  document.addEventListener('keydown', handleGlobalKeydown);

  // Refresh products to get latest data (e.g., after returning from edit page)
  await refreshProducts();

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
    if (urlPagination.perPage !== DEFAULT_PAGINATION.itemsPerPage) setItemsPerPage(urlPagination.perPage);
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
          @update:enabled-filter="handleEnabledFilterUpdate"
          @update:updated-at-filter="handleUpdatedAtFilterUpdate"
          @clear-filters="handleClearFilters"
          @export-csv="exportToCSV"
          @add-product="showAddProductModal = true"
        />

        <!-- Bulk Action Bar -->
        <Transition name="slide-down">
          <div v-if="selectedCount > 0" class="bulk-action-bar">
            <div class="bulk-action-info">
              <span class="selected-count">{{ selectedCount }}</span>
              <span class="selected-label">product{{ selectedCount > 1 ? 's' : '' }} selected</span>
            </div>
            <div class="bulk-action-buttons">
              <button
                class="bulk-btn bulk-btn-enable"
                :disabled="isBulkActionLoading || useLocalFallback"
                @click="handleBulkEnable"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Enable
              </button>
              <button
                class="bulk-btn bulk-btn-disable"
                :disabled="isBulkActionLoading || useLocalFallback"
                @click="handleBulkDisable"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                Disable
              </button>
              <button
                class="bulk-btn bulk-btn-clear"
                @click="clearSelection"
              >
                Clear
              </button>
            </div>
          </div>
        </Transition>

        <!-- Products Table -->
        <ProductTable
          :products="paginatedProducts"
          :is-loading="productsLoading"
          :use-local-fallback="useLocalFallback"
          :sort-by="filters.sortBy"
          :sort-order="filters.sortOrder"
          :selected-products="selectedProducts"
          @select-product="openProductDrawer"
          @toggle-enabled="handleToggleEnabled"
          @edit-product="handleEditProduct"
          @duplicate-product="handleDuplicateProduct"
          @sort="handleColumnSort"
          @selection-change="handleSelectionChange"
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

    <!-- Add Product Modal -->
    <div
      v-if="showAddProductModal"
      class="modal-overlay"
      @click.self="showAddProductModal = false; productToDuplicate = null"
    >
      <div class="modal-content">
        <ProductForm
          :product="productToDuplicate"
          mode="add"
          @save="handleCreateProduct"
          @cancel="showAddProductModal = false; productToDuplicate = null"
        />
      </div>
    </div>

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

/* Add Product Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  width: 100%;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

@media (max-width: 767px) {
  .modal-overlay {
    padding: 10px;
  }

  .modal-content {
    max-height: 95vh;
  }
}

/* Bulk Action Bar */
.bulk-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--primary-color, #29275B);
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(41, 39, 91, 0.2);
}

.bulk-action-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
}

.selected-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
}

.selected-label {
  font-size: 14px;
}

.bulk-action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bulk-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.bulk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bulk-btn-enable {
  background-color: #dcfce7;
  color: #166534;
}

.bulk-btn-enable:hover:not(:disabled) {
  background-color: #bbf7d0;
}

.bulk-btn-disable {
  background-color: #fee2e2;
  color: #991b1b;
}

.bulk-btn-disable:hover:not(:disabled) {
  background-color: #fecaca;
}

.bulk-btn-clear {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
}

.bulk-btn-clear:hover {
  background-color: rgba(255, 255, 255, 0.25);
}

/* Slide transition */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 767px) {
  .bulk-action-bar {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .bulk-action-buttons {
    width: 100%;
    justify-content: center;
  }

  .bulk-btn {
    flex: 1;
    justify-content: center;
    padding: 10px 12px;
  }
}
</style>
