<script setup lang="ts">
// @ts-nocheck - Disable strict type checking for inline styles
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuth } from '../../composables/useAdminAuth';
import { useAdminProducts } from '../../composables/useAdminProducts';
import { COMPONENTS, type ComponentType } from '../../constants/components';

// Filter out Sink and Door from category filters
const filteredCategories = COMPONENTS.filter(
  (category) => !['Sink', 'Door'].includes(category)
);

const router = useRouter();
const { username, logout, validateSession } = useAdminAuth();
const {
  filters,
  pagination,
  filteredProducts,
  paginatedProducts,
  totalPages,
  stats,
  toggleCategoryFilter,
  setFilter,
  clearFilters,
  setPage,
  setItemsPerPage,
} = useAdminProducts();

// UI State
const sidebarCollapsed = ref(false);
const showFilters = ref(true);

// Product Detail Drawer State
const selectedProduct = ref<any>(null);
const showProductDrawer = ref(false);

const openProductDrawer = (product: any) => {
  selectedProduct.value = product;
  showProductDrawer.value = true;
};

const closeProductDrawer = () => {
  showProductDrawer.value = false;
  setTimeout(() => {
    selectedProduct.value = null;
  }, 300); // Wait for animation to complete
};

// Check authentication
onMounted(() => {
  if (!validateSession()) {
    router.push('/vadmin');
  }
});

// Handle logout
const handleLogout = () => {
  logout();
  router.push('/vadmin');
};

// Format price
const formatPrice = (price: string | number) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return `£${num.toFixed(2)}`;
};

// Export to CSV
const exportToCSV = () => {
  const products = filteredProducts.value;

  // CSV Headers
  const headers = ['ID', 'Name', 'Category', 'Price', 'SKU', 'Variants Count', 'Features', 'Link'];

  // CSV Rows
  const rows = products.map(product => [
    product.id,
    `"${product.name.replace(/"/g, '""')}"`, // Escape quotes
    product.category,
    product.price,
    product.variants.length > 0 ? product.variants[0].sku : '',
    product.variants.length,
    `"${product.features.join(', ').replace(/"/g, '""')}"`,
    product.link || ''
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Fix image path to be absolute
const getImageUrl = (imagePath: string) => {
  if (!imagePath) return '';
  // If already absolute or external URL, return as is
  if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
    return imagePath;
  }
  // Prepend / to make it absolute from public folder
  return '/' + imagePath;
};

// Max category count for chart scaling
const maxCategoryCount = computed(() => {
  if (!stats.value?.categoryCounts) return 1;
  const counts = Object.values(stats.value.categoryCounts) as number[];
  return Math.max(...counts, 1);
});

// Pagination helpers
const pageNumbers = computed(() => {
  const pages: number[] = [];
  const total = totalPages.value;
  const current = pagination.value.currentPage;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, -1, total);
    } else if (current >= total - 2) {
      pages.push(1, -1, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, -1, current - 1, current, current + 1, -1, total);
    }
  }

  return pages;
});
</script>

<template>
  <div :style="containerStyle">
    <!-- Sidebar -->
    <aside :style="sidebarStyle">
      <div :style="sidebarHeaderStyle">
        <div :style="logoStyle">
          <img src="/assets/logo.svg" alt="Logo" :style="logoImageStyle" />
        </div>
        <span v-if="!sidebarCollapsed" :style="logoTextStyle">Admin Panel</span>
      </div>

      <nav :style="navStyle">
        <button :style="[navItemStyle, navItemActiveStyle]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <span v-if="!sidebarCollapsed">Products</span>
        </button>
      </nav>

      <div :style="sidebarFooterStyle">
        <div :style="userInfoStyle">
          <div :style="avatarStyle">{{ username.charAt(0).toUpperCase() }}</div>
          <span v-if="!sidebarCollapsed" :style="usernameStyle">{{ username }}</span>
        </div>
        <button @click="handleLogout" :style="logoutButtonStyle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span v-if="!sidebarCollapsed">Logout</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main :style="mainStyle">
      <!-- Header -->
      <header :style="headerStyle">
        <div :style="headerLeftStyle">
          <button @click="sidebarCollapsed = !sidebarCollapsed" :style="menuButtonStyle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <h1 :style="pageTitleStyle">Products</h1>
        </div>
        <router-link to="/planner" :style="viewSiteLinkStyle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          View Site
        </router-link>
      </header>

      <!-- Stats Cards -->
      <div :style="statsGridStyle">
        <div :style="statCardStyle">
          <div :style="statIconStyle('#3b82f6')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          </div>
          <div>
            <p :style="statLabelStyle">Total Products</p>
            <p :style="statValueStyle">{{ stats.totalProducts }}</p>
          </div>
        </div>
        <div :style="statCardStyle">
          <div :style="statIconStyle('#10b981')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div>
            <p :style="statLabelStyle">Total Variants</p>
            <p :style="statValueStyle">{{ stats.totalVariants }}</p>
          </div>
        </div>
        <div :style="statCardStyle">
          <div :style="statIconStyle('#f59e0b')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <p :style="statLabelStyle">Categories</p>
            <p :style="statValueStyle">{{ filteredCategories.length }}</p>
          </div>
        </div>
      </div>

      <!-- Category Distribution Chart -->
      <div v-if="stats && stats.categoryCounts" :style="chartContainerStyle">
        <div :style="chartHeaderStyle">
          <h3 :style="chartTitleStyle">Products by Category</h3>
          <span :style="chartSubtitleStyle">Distribution of {{ stats.totalProducts }} products</span>
        </div>
        <div :style="chartBodyStyle">
          <div
            v-for="category in filteredCategories"
            :key="category"
            :style="chartRowStyle"
          >
            <div :style="chartLabelStyle">
              <span :style="chartCategoryDotStyle(category)"></span>
              {{ category }}
            </div>
            <div :style="chartBarContainerStyle">
              <div
                :style="chartBarStyle(category, stats.categoryCounts[category] || 0, maxCategoryCount)"
              ></div>
            </div>
            <div :style="chartCountStyle">{{ stats.categoryCounts[category] || 0 }}</div>
          </div>
        </div>
      </div>

      <!-- Product List View -->
      <div :style="contentStyle">
        <!-- Filters Section -->
        <div :style="filtersContainerStyle">
          <div :style="filterHeaderStyle">
            <button @click="showFilters = !showFilters" :style="filterToggleStyle">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filters
              <svg
                :style="{ transform: showFilters ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <button v-if="filters.categories.length > 0 || filters.searchQuery || filters.priceRange.min || filters.priceRange.max" @click="clearFilters" :style="clearFiltersStyle">
              Clear all
            </button>
            <button @click="exportToCSV" :style="exportButtonStyle">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          </div>

          <div v-if="showFilters" :style="filtersGridStyle">
            <!-- Search -->
            <div :style="filterGroupStyle">
              <label :style="filterLabelStyle">Search</label>
              <div :style="searchInputWrapperStyle">
                <svg :style="searchIconStyle" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  :value="filters.searchQuery"
                  @input="setFilter('searchQuery', ($event.target as HTMLInputElement).value)"
                  type="text"
                  placeholder="Search products..."
                  :style="searchInputStyle"
                />
              </div>
            </div>

            <!-- Category Multi-select -->
            <div :style="filterGroupStyle">
              <label :style="filterLabelStyle">Categories (Multi-select)</label>
              <div :style="categoryChipsStyle">
                <button
                  v-for="category in filteredCategories"
                  :key="category"
                  @click="toggleCategoryFilter(category)"
                  :style="[
                    categoryChipStyle,
                    filters.categories.includes(category) && categoryChipActiveStyle(category)
                  ]"
                >
                  {{ category }}
                  <span v-if="filters.categories.includes(category)" :style="chipCheckStyle">✓</span>
                </button>
              </div>
            </div>

            <!-- Price Range Filter -->
            <div :style="filterGroupStyle">
              <label :style="filterLabelStyle">Price Range</label>
              <div :style="priceRangeContainerStyle">
                <div :style="priceInputWrapperStyle">
                  <span :style="priceInputPrefixStyle">£</span>
                  <input
                    type="number"
                    :value="filters.priceRange.min"
                    @input="setFilter('priceRange', { ...filters.priceRange, min: $event.target.value ? Number($event.target.value) : null })"
                    placeholder="Min"
                    :style="priceInputStyle"
                    min="0"
                  />
                </div>
                <span :style="priceRangeSeparatorStyle">to</span>
                <div :style="priceInputWrapperStyle">
                  <span :style="priceInputPrefixStyle">£</span>
                  <input
                    type="number"
                    :value="filters.priceRange.max"
                    @input="setFilter('priceRange', { ...filters.priceRange, max: $event.target.value ? Number($event.target.value) : null })"
                    placeholder="Max"
                    :style="priceInputStyle"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <!-- Sort -->
            <div :style="filterGroupStyle">
              <label :style="filterLabelStyle">Sort by</label>
              <div :style="sortContainerStyle">
                <select
                  :value="filters.sortBy"
                  @change="setFilter('sortBy', ($event.target as HTMLSelectElement).value as any)"
                  :style="selectStyle"
                >
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="category">Category</option>
                </select>
                <button
                  @click="setFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')"
                  :style="sortOrderButtonStyle"
                >
                  <svg
                    :style="{ transform: filters.sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0)' }"
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <polyline points="19 12 12 19 5 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Results Count -->
        <div :style="actionsBarStyle">
          <span :style="resultCountStyle">
            {{ filteredProducts.length }} product{{ filteredProducts.length !== 1 ? 's' : '' }} found
          </span>
        </div>

        <!-- Products Table -->
        <div :style="tableContainerStyle">
          <table :style="tableStyle">
            <thead>
              <tr>
                <th :style="thStyle">Product</th>
                <th :style="thStyle">Category</th>
                <th :style="thStyle">Price</th>
                <th :style="thStyle">Variants</th>
                <th :style="thStyle">Features</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="product in paginatedProducts"
                :key="product.id"
                :style="trStyle"
                @click="openProductDrawer(product)"
                class="product-row"
              >
                <td :style="tdStyle">
                  <div :style="productCellStyle">
                    <img :src="getImageUrl(product.image)" :alt="product.name" :style="productImageStyle" />
                    <div>
                      <p :style="productNameStyle">{{ product.name }}</p>
                      <p :style="productSkuStyle">
                        SKU: {{ product.variants.length > 0 ? product.variants[0].sku : product.id }}
                        <span v-if="product.variants.length > 1" :style="skuMoreStyle">
                          +{{ product.variants.length - 1 }} more
                        </span>
                      </p>
                    </div>
                  </div>
                </td>
                <td :style="tdStyle">
                  <span :style="categoryBadgeStyle(product.category)">
                    {{ product.category }}
                  </span>
                </td>
                <td :style="tdStyle">{{ formatPrice(product.price) }}</td>
                <td :style="tdStyle">{{ product.variants.length }}</td>
                <td :style="tdStyle">
                  <div :style="featuresStyle">
                    <span v-for="(feature, idx) in product.features.slice(0, 2)" :key="idx" :style="featureTagStyle">
                      {{ feature }}
                    </span>
                    <span v-if="product.features.length > 2" :style="moreTagStyle">
                      +{{ product.features.length - 2 }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="paginatedProducts.length === 0">
                <td colspan="5" :style="emptyStateStyle">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                  <p>No products found</p>
                  <p :style="emptyStateSubStyle">Try adjusting your filters</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="totalPages > 1" :style="paginationStyle">
          <div :style="paginationInfoStyle">
            Showing {{ ((pagination.currentPage - 1) * pagination.itemsPerPage) + 1 }}
            to {{ Math.min(pagination.currentPage * pagination.itemsPerPage, filteredProducts.length) }}
            of {{ filteredProducts.length }}
          </div>
          <div :style="paginationButtonsStyle">
            <button
              @click="setPage(pagination.currentPage - 1)"
              :disabled="pagination.currentPage === 1"
              :style="paginationButtonStyle"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <template v-for="page in pageNumbers" :key="page">
              <span v-if="page === -1" :style="paginationEllipsisStyle">...</span>
              <button
                v-else
                @click="setPage(page)"
                :style="[paginationButtonStyle, page === pagination.currentPage && paginationButtonActiveStyle]"
              >
                {{ page }}
              </button>
            </template>
            <button
              @click="setPage(pagination.currentPage + 1)"
              :disabled="pagination.currentPage === totalPages"
              :style="paginationButtonStyle"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
          <select
            :value="pagination.itemsPerPage"
            @change="setItemsPerPage(Number(($event.target as HTMLSelectElement).value))"
            :style="itemsPerPageSelectStyle"
          >
            <option :value="12">12 per page</option>
            <option :value="24">24 per page</option>
            <option :value="48">48 per page</option>
          </select>
        </div>
      </div>
    </main>

    <!-- Product Detail Drawer -->
    <div v-if="showProductDrawer" :style="drawerOverlayStyle" @click="closeProductDrawer"></div>
    <div :style="drawerStyle" :class="{ 'drawer-open': showProductDrawer }">
      <div v-if="selectedProduct" :style="drawerContentStyle">
        <!-- Drawer Header -->
        <div :style="drawerHeaderStyle">
          <h2 :style="drawerTitleStyle">Product Details</h2>
          <button @click="closeProductDrawer" :style="drawerCloseButtonStyle">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Product Image & Basic Info -->
        <div :style="drawerProductHeaderStyle">
          <img :src="getImageUrl(selectedProduct.image)" :alt="selectedProduct.name" :style="drawerProductImageStyle" />
          <div :style="drawerProductInfoStyle">
            <h3 :style="drawerProductNameStyle">{{ selectedProduct.name }}</h3>
            <p :style="drawerProductIdStyle">ID: {{ selectedProduct.id }}</p>
            <span :style="categoryBadgeStyle(selectedProduct.category)">{{ selectedProduct.category }}</span>
            <p :style="drawerProductPriceStyle">{{ formatPrice(selectedProduct.price) }}</p>
          </div>
        </div>

        <!-- Features Section -->
        <div v-if="selectedProduct.features && selectedProduct.features.length > 0" :style="drawerSectionStyle">
          <h4 :style="drawerSectionTitleStyle">Features</h4>
          <div :style="drawerFeaturesStyle">
            <span v-for="(feature, idx) in selectedProduct.features" :key="idx" :style="drawerFeatureTagStyle">
              {{ feature }}
            </span>
          </div>
        </div>

        <!-- Product Link -->
        <div v-if="selectedProduct.link" :style="drawerSectionStyle">
          <h4 :style="drawerSectionTitleStyle">Product Link</h4>
          <a :href="selectedProduct.link" target="_blank" :style="drawerLinkButtonStyle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            View on Bathroom Mountain
          </a>
        </div>

        <!-- Variants Section -->
        <div v-if="selectedProduct.variants && selectedProduct.variants.length > 0" :style="drawerSectionStyle">
          <h4 :style="drawerSectionTitleStyle">Variants ({{ selectedProduct.variants.length }})</h4>
          <div :style="variantsContainerStyle">
            <div v-for="(variant, idx) in selectedProduct.variants" :key="idx" :style="variantCardStyle">
              <div :style="variantHeaderStyle">
                <img
                  v-if="variant.image"
                  :src="getImageUrl(variant.image)"
                  :alt="variant.name"
                  :style="variantImageStyle"
                />
                <div :style="variantHeaderInfoStyle">
                  <span :style="variantNameStyle">{{ variant.name }}</span>
                  <span :style="variantSkuStyle">{{ variant.sku }}</span>
                </div>
              </div>
              <div :style="variantDetailsStyle">
                <div :style="variantDetailRowStyle">
                  <span :style="variantLabelStyle">Dimensions:</span>
                  <span :style="variantValueStyle">
                    {{ variant.dimensions?.width || '-' }} × {{ variant.dimensions?.depth || '-' }} × {{ variant.dimensions?.height || '-' }} cm
                  </span>
                </div>
                <div :style="variantDetailRowStyle">
                  <span :style="variantLabelStyle">Price:</span>
                  <span :style="variantValueStyle">{{ formatPrice(variant.price || 0) }}</span>
                </div>
                <div v-if="variant.path" :style="variantDetailRowStyle">
                  <span :style="variantLabelStyle">Model:</span>
                  <span :style="variantModelPathStyle">{{ variant.path }}</span>
                </div>
                <div v-if="variant.spawnHeight !== undefined" :style="variantDetailRowStyle">
                  <span :style="variantLabelStyle">Spawn Height:</span>
                  <span :style="variantValueStyle">{{ variant.spawnHeight }} cm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// @ts-nocheck - Disable strict type checking for inline styles
const primaryColor = '#29275B';
const borderColor = '#e2e8f0';
const textColor = '#2d3748';
const mutedColor = '#6b7280';

export default {
  methods: {
    getCategoryColor(category: string): string {
      const colors: Record<string, string> = {
        Toilet: '#3b82f6',
        Sink: '#10b981',
        Bath: '#8b5cf6',
        Shower: '#06b6d4',
        Radiator: '#f59e0b',
        TowelRails: '#ec4899',
        Mirror: '#6366f1',
        Door: '#84cc16',
        Furniture: '#f97316',
        WindowAndDoor: '#14b8a6',
      };
      return colors[category] || '#6b7280';
    },
  },
  computed: {
    containerStyle() {
      return {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      };
    },
    sidebarStyle() {
      return {
        width: this.sidebarCollapsed ? '72px' : '240px',
        backgroundColor: primaryColor,
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100,
      };
    },
    sidebarHeaderStyle() {
      return {
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      };
    },
    logoStyle() {
      return {
        width: '100px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        padding: '4px 8px',
      };
    },
    logoImageStyle() {
      return {
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
      };
    },
    logoTextStyle() {
      return {
        fontSize: '16px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
      };
    },
    navStyle() {
      return {
        flex: 1,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      };
    },
    navItemStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '8px',
        border: 'none',
        background: 'transparent',
        color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        textAlign: 'left',
        width: '100%',
      };
    },
    navItemActiveStyle() {
      return {
        backgroundColor: 'rgba(255,255,255,0.15)',
        color: '#ffffff',
      };
    },
    sidebarFooterStyle() {
      return {
        padding: '16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
      };
    },
    userInfoStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
      };
    },
    avatarStyle() {
      return {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '600',
        flexShrink: 0,
      };
    },
    usernameStyle() {
      return {
        fontSize: '14px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      };
    },
    logoutButtonStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: '#ffffff',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      };
    },
    mainStyle() {
      return {
        flex: 1,
        marginLeft: this.sidebarCollapsed ? '72px' : '240px',
        transition: 'margin-left 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      };
    },
    headerStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        backgroundColor: '#ffffff',
        borderBottom: `1px solid ${borderColor}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      };
    },
    headerLeftStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      };
    },
    menuButtonStyle() {
      return {
        padding: '8px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    },
    pageTitleStyle() {
      return {
        fontSize: '20px',
        fontWeight: '600',
        color: textColor,
        margin: 0,
      };
    },
    viewSiteLinkStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: '8px',
        backgroundColor: '#f1f5f9',
        color: textColor,
        fontSize: '14px',
        textDecoration: 'none',
        transition: 'background-color 0.2s ease',
      };
    },
    statsGridStyle() {
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        padding: '24px',
      };
    },
    statCardStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      };
    },
    statIconStyle() {
      return (color: string) => ({
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        backgroundColor: `${color}15`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      });
    },
    statLabelStyle() {
      return {
        fontSize: '13px',
        color: mutedColor,
        margin: '0 0 4px',
      };
    },
    statValueStyle() {
      return {
        fontSize: '24px',
        fontWeight: '700',
        color: textColor,
        margin: 0,
      };
    },
    // Chart styles
    chartContainerStyle() {
      return {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        overflow: 'hidden',
      };
    },
    chartHeaderStyle() {
      return {
        padding: '20px 24px',
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      };
    },
    chartTitleStyle() {
      return {
        fontSize: '16px',
        fontWeight: '600',
        color: textColor,
        margin: 0,
      };
    },
    chartSubtitleStyle() {
      return {
        fontSize: '13px',
        color: mutedColor,
      };
    },
    chartBodyStyle() {
      return {
        padding: '20px 24px',
      };
    },
    chartRowStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px',
      };
    },
    chartLabelStyle() {
      return {
        width: '120px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: textColor,
      };
    },
    chartCategoryDotStyle() {
      return (category: string) => ({
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: this.getCategoryColor(category),
        flexShrink: 0,
      });
    },
    chartBarContainerStyle() {
      return {
        flex: 1,
        height: '24px',
        backgroundColor: '#f1f5f9',
        borderRadius: '4px',
        overflow: 'hidden',
      };
    },
    chartBarStyle() {
      return (category: string, count: number, maxCount: number) => {
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return {
          height: '100%',
          width: `${percentage}%`,
          backgroundColor: this.getCategoryColor(category),
          borderRadius: '4px',
          transition: 'width 0.5s ease',
          minWidth: count > 0 ? '4px' : '0',
        };
      };
    },
    chartCountStyle() {
      return {
        width: '40px',
        textAlign: 'right',
        fontSize: '14px',
        fontWeight: '600',
        color: textColor,
      };
    },
    contentStyle() {
      return {
        flex: 1,
        padding: '0 24px 24px',
      };
    },
    filtersContainerStyle() {
      return {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '16px',
        overflow: 'hidden',
      };
    },
    filterHeaderStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: this.showFilters ? `1px solid ${borderColor}` : 'none',
      };
    },
    filterToggleStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0',
        border: 'none',
        background: 'none',
        fontSize: '14px',
        fontWeight: '500',
        color: textColor,
        cursor: 'pointer',
      };
    },
    exportButtonStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#dcfce7',
        color: '#166534',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      };
    },
    clearFiltersStyle() {
      return {
        padding: '6px 12px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        fontSize: '13px',
        cursor: 'pointer',
      };
    },
    filtersGridStyle() {
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        padding: '20px',
      };
    },
    filterGroupStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      };
    },
    filterLabelStyle() {
      return {
        fontSize: '13px',
        fontWeight: '500',
        color: textColor,
      };
    },
    searchInputWrapperStyle() {
      return {
        position: 'relative',
      };
    },
    searchIconStyle() {
      return {
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: mutedColor,
      };
    },
    searchInputStyle() {
      return {
        width: '100%',
        padding: '10px 12px 10px 40px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s ease',
        boxSizing: 'border-box',
      };
    },
    categoryChipsStyle() {
      return {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
      };
    },
    categoryChipStyle() {
      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '6px 12px',
        border: `1px solid ${borderColor}`,
        borderRadius: '20px',
        backgroundColor: '#ffffff',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      };
    },
    categoryChipActiveStyle() {
      return (category: string) => ({
        backgroundColor: this.getCategoryColor(category),
        borderColor: this.getCategoryColor(category),
        color: '#ffffff',
      });
    },
    chipCheckStyle() {
      return {
        fontSize: '10px',
        marginLeft: '2px',
      };
    },
    priceRangeContainerStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      };
    },
    priceInputWrapperStyle() {
      return {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      };
    },
    priceInputPrefixStyle() {
      return {
        position: 'absolute',
        left: '10px',
        color: mutedColor,
        fontSize: '14px',
        pointerEvents: 'none',
      };
    },
    priceInputStyle() {
      return {
        width: '90px',
        padding: '8px 10px 8px 24px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
      };
    },
    priceRangeSeparatorStyle() {
      return {
        color: mutedColor,
        fontSize: '13px',
      };
    },
    sortContainerStyle() {
      return {
        display: 'flex',
        gap: '8px',
      };
    },
    selectStyle() {
      return {
        flex: 1,
        padding: '10px 12px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
      };
    },
    sortOrderButtonStyle() {
      return {
        padding: '10px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: textColor,
      };
    },
    actionsBarStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '16px',
      };
    },
    resultCountStyle() {
      return {
        fontSize: '14px',
        color: mutedColor,
      };
    },
    tableContainerStyle() {
      return {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      };
    },
    tableStyle() {
      return {
        width: '100%',
        borderCollapse: 'collapse',
      };
    },
    thStyle() {
      return {
        padding: '14px 16px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: '600',
        color: mutedColor,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        backgroundColor: '#f8fafc',
        borderBottom: `1px solid ${borderColor}`,
      };
    },
    trStyle() {
      return {
        transition: 'background-color 0.2s ease',
      };
    },
    tdStyle() {
      return {
        padding: '14px 16px',
        borderBottom: `1px solid ${borderColor}`,
        fontSize: '14px',
        color: textColor,
      };
    },
    productCellStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      };
    },
    productImageStyle() {
      return {
        width: '48px',
        height: '48px',
        borderRadius: '8px',
        objectFit: 'cover',
        backgroundColor: '#f1f5f9',
      };
    },
    productNameStyle() {
      return {
        fontWeight: '500',
        margin: '0 0 2px',
        maxWidth: '280px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      };
    },
    productSkuStyle() {
      return {
        fontSize: '12px',
        color: mutedColor,
        margin: 0,
        fontFamily: 'monospace',
      };
    },
    skuMoreStyle() {
      return {
        fontSize: '11px',
        color: '#9ca3af',
        marginLeft: '6px',
        fontStyle: 'italic',
        fontFamily: 'inherit',
      };
    },
    categoryBadgeStyle() {
      return (category: string) => ({
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: `${this.getCategoryColor(category)}15`,
        color: this.getCategoryColor(category),
      });
    },
    featuresStyle() {
      return {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
      };
    },
    featureTagStyle() {
      return {
        padding: '2px 8px',
        backgroundColor: '#f1f5f9',
        borderRadius: '4px',
        fontSize: '11px',
        color: mutedColor,
      };
    },
    moreTagStyle() {
      return {
        padding: '2px 8px',
        backgroundColor: '#e2e8f0',
        borderRadius: '4px',
        fontSize: '11px',
        color: textColor,
        fontWeight: '500',
      };
    },
    emptyStateStyle() {
      return {
        textAlign: 'center',
        padding: '60px 20px',
        color: mutedColor,
      };
    },
    emptyStateSubStyle() {
      return {
        fontSize: '13px',
        marginTop: '4px',
      };
    },
    paginationStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '16px',
        padding: '16px 20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      };
    },
    paginationInfoStyle() {
      return {
        fontSize: '13px',
        color: mutedColor,
      };
    },
    paginationButtonsStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      };
    },
    paginationButtonStyle() {
      return {
        minWidth: '36px',
        height: '36px',
        padding: '0 12px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
        fontSize: '14px',
        color: textColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    },
    paginationButtonActiveStyle() {
      return {
        backgroundColor: primaryColor,
        borderColor: primaryColor,
        color: '#ffffff',
      };
    },
    paginationEllipsisStyle() {
      return {
        padding: '0 8px',
        color: mutedColor,
      };
    },
    itemsPerPageSelectStyle() {
      return {
        padding: '8px 12px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '13px',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
      };
    },
    // Drawer Styles
    drawerOverlayStyle() {
      return {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        transition: 'opacity 0.3s ease',
      };
    },
    drawerStyle() {
      return {
        position: 'fixed',
        top: 0,
        right: 0,
        width: '500px',
        maxWidth: '90vw',
        height: '100vh',
        backgroundColor: '#ffffff',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1001,
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        overflowY: 'auto',
      };
    },
    drawerContentStyle() {
      return {
        padding: '24px',
      };
    },
    drawerHeaderStyle() {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${borderColor}`,
      };
    },
    drawerTitleStyle() {
      return {
        fontSize: '20px',
        fontWeight: '600',
        color: textColor,
        margin: 0,
      };
    },
    drawerCloseButtonStyle() {
      return {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '8px',
        color: mutedColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.2s ease',
      };
    },
    drawerProductHeaderStyle() {
      return {
        display: 'flex',
        gap: '20px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
      };
    },
    drawerProductImageStyle() {
      return {
        width: '120px',
        height: '120px',
        borderRadius: '8px',
        objectFit: 'cover',
        backgroundColor: '#ffffff',
        border: `1px solid ${borderColor}`,
      };
    },
    drawerProductInfoStyle() {
      return {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      };
    },
    drawerProductNameStyle() {
      return {
        fontSize: '18px',
        fontWeight: '600',
        color: textColor,
        margin: 0,
        lineHeight: '1.3',
      };
    },
    drawerProductIdStyle() {
      return {
        fontSize: '13px',
        color: mutedColor,
        margin: 0,
        fontFamily: 'monospace',
      };
    },
    drawerProductPriceStyle() {
      return {
        fontSize: '20px',
        fontWeight: '700',
        color: primaryColor,
        margin: '8px 0 0',
      };
    },
    drawerSectionStyle() {
      return {
        marginBottom: '24px',
      };
    },
    drawerSectionTitleStyle() {
      return {
        fontSize: '14px',
        fontWeight: '600',
        color: textColor,
        margin: '0 0 12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      };
    },
    drawerFeaturesStyle() {
      return {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
      };
    },
    drawerFeatureTagStyle() {
      return {
        padding: '6px 12px',
        backgroundColor: '#f1f5f9',
        borderRadius: '6px',
        fontSize: '13px',
        color: textColor,
      };
    },
    drawerLinkButtonStyle() {
      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: primaryColor,
        color: '#ffffff',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: '500',
        borderRadius: '8px',
        transition: 'background-color 0.2s ease',
      };
    },
    variantsContainerStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      };
    },
    variantCardStyle() {
      return {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        border: `1px solid ${borderColor}`,
      };
    },
    variantHeaderStyle() {
      return {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: `1px solid ${borderColor}`,
      };
    },
    variantImageStyle() {
      return {
        width: '70px',
        height: '70px',
        borderRadius: '8px',
        objectFit: 'cover',
        backgroundColor: '#ffffff',
        border: `1px solid ${borderColor}`,
        flexShrink: 0,
      };
    },
    variantHeaderInfoStyle() {
      return {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      };
    },
    variantNameStyle() {
      return {
        fontSize: '14px',
        fontWeight: '600',
        color: textColor,
        lineHeight: '1.3',
      };
    },
    variantSkuStyle() {
      return {
        fontSize: '12px',
        color: mutedColor,
        fontFamily: 'monospace',
        backgroundColor: '#e2e8f0',
        padding: '2px 8px',
        borderRadius: '4px',
        alignSelf: 'flex-start',
      };
    },
    variantDetailsStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      };
    },
    variantDetailRowStyle() {
      return {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
      };
    },
    variantLabelStyle() {
      return {
        color: mutedColor,
      };
    },
    variantValueStyle() {
      return {
        color: textColor,
        fontWeight: '500',
      };
    },
    variantModelPathStyle() {
      return {
        color: textColor,
        fontFamily: 'monospace',
        fontSize: '11px',
        backgroundColor: '#e2e8f0',
        padding: '2px 6px',
        borderRadius: '4px',
        maxWidth: '200px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      };
    },
  },
};
</script>

<style scoped>
input:focus, select:focus {
  border-color: #29275B !important;
  box-shadow: 0 0 0 3px rgba(41, 39, 91, 0.1);
}

button:hover {
  opacity: 0.9;
}

/* Product row styles */
.product-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.product-row:hover {
  background-color: #f1f5f9 !important;
}

/* Drawer animation */
.drawer-open {
  transform: translateX(0) !important;
}

/* Drawer close button hover */
.drawer-close:hover {
  background-color: #f1f5f9;
}

/* Link hover in drawer */
a:hover {
  text-decoration: underline;
}

/* Scrollbar styling for drawer */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
