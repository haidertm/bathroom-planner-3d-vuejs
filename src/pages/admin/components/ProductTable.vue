<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import type { AdminProduct, ProductFilters, ProductVariant } from '../../../types/admin';
import GlbPreviewModal from '../../../components/ui/GlbPreviewModal.vue';

type SortColumn = ProductFilters['sortBy'];
type SortOrder = ProductFilters['sortOrder'];

const props = defineProps<{
  products: AdminProduct[];
  isLoading?: boolean;
  sortBy?: SortColumn;
  sortOrder?: SortOrder;
  selectedProducts?: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'select-product', product: AdminProduct): void;
  (e: 'sort', column: SortColumn): void;
  (e: 'selection-change', productIds: Set<string>): void;
}>();

// Selection state
const localSelectedProducts = computed(() => props.selectedProducts ?? new Set<string>());

const isAllSelected = computed(() => {
  if (props.products.length === 0) return false;
  return props.products.every(p => localSelectedProducts.value.has(p.id));
});

const isSomeSelected = computed(() => {
  if (props.products.length === 0) return false;
  const selectedCount = props.products.filter(p => localSelectedProducts.value.has(p.id)).length;
  return selectedCount > 0 && selectedCount < props.products.length;
});

const toggleSelectAll = () => {
  const newSelection = new Set(localSelectedProducts.value);
  // If any products are selected (all or some), deselect them
  // Only select all when none are selected
  if (isAllSelected.value || isSomeSelected.value) {
    // Deselect all current page products
    props.products.forEach(p => newSelection.delete(p.id));
  } else {
    // Select all current page products
    props.products.forEach(p => newSelection.add(p.id));
  }
  emit('selection-change', newSelection);
};

const toggleProductSelection = (e: Event, product: AdminProduct) => {
  e.stopPropagation();
  const newSelection = new Set(localSelectedProducts.value);
  if (newSelection.has(product.id)) {
    newSelection.delete(product.id);
  } else {
    newSelection.add(product.id);
  }
  emit('selection-change', newSelection);
};

// Column definitions for sortable headers
const sortableColumns: { key: SortColumn; label: string }[] = [
  { key: 'name', label: 'Product' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price' },
  { key: 'variants', label: 'Variants' },
  { key: 'status', label: 'Status' },
];

const handleSort = (column: SortColumn) => {
  emit('sort', column);
};

// Get aria-sort value for a column
const getAriaSortValue = (columnKey: SortColumn): 'ascending' | 'descending' | 'none' => {
  if (props.sortBy !== columnKey) return 'none';
  return props.sortOrder === 'asc' ? 'ascending' : 'descending';
};

// Handle keyboard events for sortable headers (Enter or Space triggers sort)
const handleSortKeydown = (event: KeyboardEvent, column: SortColumn) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleSort(column);
  }
};

// Expanded variants state
const expandedProducts = ref<Set<string>>(new Set());

const toggleVariantsExpanded = async (e: Event, productId: string) => {
  e.stopPropagation();
  const isExpanding = !expandedProducts.value.has(productId);

  if (expandedProducts.value.has(productId)) {
    expandedProducts.value.delete(productId);
  } else {
    expandedProducts.value.add(productId);
  }
  // Trigger reactivity
  expandedProducts.value = new Set(expandedProducts.value);

  // Scroll the parent product row into view when expanding so both product and variants are visible
  if (isExpanding) {
    await nextTick();
    const productRow = document.querySelector(`[data-product-row="${productId}"]`);
    if (productRow) {
      productRow.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
};

const isProductExpanded = (productId: string): boolean => {
  return expandedProducts.value.has(productId);
};

// GLB Preview Modal state
const showGlbPreview = ref(false);
const previewModelPath = ref('');
const previewModelName = ref('');

const openGlbPreview = (e: Event, product: AdminProduct) => {
  e.stopPropagation();
  // Get the first variant's model path
  const modelPath = product.variants?.[0]?.path;
  if (!modelPath) return;
  previewModelPath.value = modelPath;
  previewModelName.value = product.name;
  showGlbPreview.value = true;
};

const openVariantGlbPreview = (e: Event, variant: ProductVariant, productName: string) => {
  e.stopPropagation();
  if (!variant.path) return;
  previewModelPath.value = variant.path;
  previewModelName.value = `${productName} - ${variant.name}`;
  showGlbPreview.value = true;
};

const closeGlbPreview = () => {
  showGlbPreview.value = false;
  previewModelPath.value = '';
  previewModelName.value = '';
};

const hasModelPath = (product: AdminProduct): boolean => {
  return !!product.variants?.[0]?.path;
};

const variantHasModelPath = (variant: ProductVariant): boolean => {
  return !!variant.path;
};

const formatPrice = (price: string): string => {
  const num = parseFloat(price?.trim() ?? '');
  if (!Number.isFinite(num)) {
    return 'N/A';
  }
  return `£${num.toFixed(2)}`;
};

const getImageUrl = (imagePath: string): string => {
  if (!imagePath) return '';
  if (imagePath.startsWith('/') || imagePath.startsWith('http')) {
    return imagePath;
  }
  return '/' + imagePath;
};

const getCategoryColor = (category: string): string => {
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
};

const handleView = (e: Event, product: AdminProduct) => {
  e.stopPropagation();
  handleSelectProduct(product);
};

const handleSelectProduct = (product: AdminProduct) => {
  // GTM Tracking
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: 'admin_product_select',
      product_id: product.id,
      product_name: product.name
    });
  }
  
  emit('select-product', product);
};
</script>

<template>
  <div class="table-container">
    <table class="product-table">
      <thead>
        <tr>
          <th scope="col" class="checkbox-header">
            <label class="checkbox-container" @click.stop.prevent="toggleSelectAll">
              <input
                type="checkbox"
                :checked="isAllSelected"
                :indeterminate="isSomeSelected"
                @click.prevent
              />
              <span class="checkmark" :class="{ 'indeterminate': isSomeSelected }"></span>
            </label>
          </th>
          <th
            v-for="col in sortableColumns"
            :key="col.key"
            scope="col"
            class="sortable-header"
            :class="{ 'sorted': sortBy === col.key }"
            tabindex="0"
            role="button"
            :aria-sort="getAriaSortValue(col.key)"
            @click="handleSort(col.key)"
            @keydown="(e) => handleSortKeydown(e, col.key)"
          >
            <span class="header-content">
              {{ col.label }}
              <span class="sort-icon">
                <!-- Ascending icon -->
                <svg
                  v-if="sortBy === col.key && sortOrder === 'asc'"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="sort-active"
                >
                  <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
                <!-- Descending icon -->
                <svg
                  v-else-if="sortBy === col.key && sortOrder === 'desc'"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="sort-active"
                >
                  <path d="M12 5v14M5 12l7 7 7-7"/>
                </svg>
                <!-- Default (unsorted) icon -->
                <svg
                  v-else
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="sort-default"
                >
                  <path d="M7 15l5 5 5-5M7 9l5-5 5 5"/>
                </svg>
              </span>
            </span>
          </th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <!-- Loading skeleton rows -->
        <template v-if="isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`" class="skeleton-row">
            <td><div class="skeleton skeleton-checkbox"></div></td>
            <td>
              <div class="product-cell">
                <div class="skeleton skeleton-image"></div>
                <div>
                  <div class="skeleton skeleton-text skeleton-text--name"></div>
                  <div class="skeleton skeleton-text skeleton-text--sku"></div>
                </div>
              </div>
            </td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-text skeleton-text--price"></div></td>
            <td><div class="skeleton skeleton-text skeleton-text--count"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
            <td><div class="skeleton skeleton-badge"></div></td>
          </tr>
        </template>

        <!-- Actual product rows -->
        <template v-else>
          <template v-for="product in products" :key="product.id">
          <tr
            @click="handleSelectProduct(product)"
            class="product-row"
            :class="{ 'row-selected': localSelectedProducts.has(product.id) }"
            :data-product-row="product.id"
            tabindex="0"
            @keydown.enter="handleSelectProduct(product)"
            @keydown.space.prevent="handleSelectProduct(product)"
          >
            <td class="checkbox-cell" @click.stop>
              <label class="checkbox-container">
                <input
                  type="checkbox"
                  :checked="localSelectedProducts.has(product.id)"
                  @change="(e) => toggleProductSelection(e, product)"
                />
                <span class="checkmark"></span>
              </label>
            </td>
            <td>
              <div class="product-cell">
                <img
                  :src="getImageUrl(product.image)"
                  :alt="product.name"
                  class="product-image"
                  loading="lazy"
                />
                <div>
                  <p class="product-name">{{ product.name }}</p>
                  <p class="product-sku">
                    SKU: {{ product.variants.length > 0 ? product.variants[0].sku : product.id }}
                    <span v-if="product.variants.length > 1" class="sku-more">
                      +{{ product.variants.length - 1 }} more
                    </span>
                  </p>
                </div>
              </div>
            </td>
            <td>
              <span
                class="category-badge"
                :style="{
                  backgroundColor: `${getCategoryColor(product.category)}15`,
                  color: getCategoryColor(product.category)
                }"
              >
                {{ product.category }}
              </span>
            </td>
            <td>{{ formatPrice(product.price) }}</td>
            <td>
              <button
                v-if="product.variants.length > 0"
                class="variants-toggle-btn"
                :class="{ 'expanded': isProductExpanded(product.id) }"
                @click="(e) => toggleVariantsExpanded(e, product.id)"
                :title="isProductExpanded(product.id) ? 'Hide variants' : 'Show variants'"
              >
                <span class="variants-count">{{ product.variants.length }}</span>
                <svg
                  class="chevron-icon"
                  :class="{ 'rotated': isProductExpanded(product.id) }"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              <span v-else class="variants-count-static">0</span>
            </td>
            <td>
              <span
                class="status-badge"
                :class="{
                  'status-enabled': product.enabled,
                  'status-disabled': !product.enabled
                }"
              >
                {{ product.enabled ? 'Enabled' : 'Disabled' }}
              </span>
            </td>
            <td>
              <div class="actions" @click.stop>
                <button
                  class="action-btn action-view"
                  title="View details"
                  @click="(e) => handleView(e, product)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>
                <button
                  class="action-btn action-preview"
                  :class="{ 'action-disabled': !hasModelPath(product) }"
                  :disabled="!hasModelPath(product)"
                  title="Preview 3D Model"
                  @click="(e) => openGlbPreview(e, product)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                    <line x1="12" y1="22.08" x2="12" y2="12"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>

          <!-- Variants Expansion Row -->
          <tr
            v-if="isProductExpanded(product.id) && product.variants.length > 0"
            :key="`${product.id}-variants`"
            :data-variants-row="product.id"
            class="variants-expansion-row"
          >
            <td colspan="7">
              <div class="variants-panel">
                <div class="variants-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                  <span>{{ product.variants.length }} Variant{{ product.variants.length !== 1 ? 's' : '' }}</span>
                </div>
                <div class="variants-list">
                  <div
                    v-for="variant in product.variants"
                    :key="variant.id"
                    class="variant-item"
                  >
                    <img
                      v-if="variant.image"
                      :src="getImageUrl(variant.image)"
                      :alt="variant.name"
                      class="variant-image"
                      loading="lazy"
                    />
                    <div v-else class="variant-image-placeholder">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                    <div class="variant-info">
                      <p class="variant-name">{{ variant.name }}</p>
                    </div>
                    <div class="variant-sku-col">
                      <span class="variant-sku">{{ variant.sku }}</span>
                    </div>
                    <div class="variant-dimensions-col">
                      <span class="variant-dimensions" v-if="variant.dimensions">
                        {{ variant.dimensions.width }}×{{ variant.dimensions.height }}{{ variant.dimensions.depth ? `×${variant.dimensions.depth}` : '' }} cm
                      </span>
                    </div>
                    <div class="variant-price-col">
                      <span class="variant-price">{{ formatPrice(variant.price) }}</span>
                      <span class="leader-line"></span>
                    </div>
                    <button
                      class="variant-preview-btn"
                      :class="{ 'disabled': !variantHasModelPath(variant) }"
                      :disabled="!variantHasModelPath(variant)"
                      :title="variantHasModelPath(variant) ? 'Preview 3D Model' : 'No 3D model available'"
                      @click="(e) => openVariantGlbPreview(e, variant, product.name)"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                        <line x1="12" y1="22.08" x2="12" y2="12"/>
                      </svg>
                      <span>3D</span>
                    </button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          </template>

          <!-- Empty state -->
          <tr v-if="products.length === 0">
            <td colspan="7" class="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <p>No products found</p>
              <p class="empty-state-sub">Try adjusting your filters</p>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <!-- GLB Preview Modal -->
    <GlbPreviewModal
      :is-open="showGlbPreview"
      :model-path="previewModelPath"
      :model-name="previewModelName"
      @close="closeGlbPreview"
    />
  </div>
</template>

<style scoped>
.table-container {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: auto;
  max-height: calc(100vh - 340px);
  min-height: 400px;
}

.product-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.product-table th {
  padding: 14px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted-color, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background-color: #f8fafc;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Sortable header styles */
.sortable-header {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.sortable-header:hover {
  background-color: #eef2f7;
  color: var(--text-color, #2d3748);
}

.sortable-header.sorted {
  color: var(--primary-color, #29275B);
  background-color: #f0f0ff;
}

.sortable-header:focus {
  outline: 2px solid var(--primary-color, #29275B);
  outline-offset: -2px;
  background-color: #eef2f7;
  color: var(--text-color, #2d3748);
}

.sortable-header:focus-visible {
  outline: 2px solid var(--primary-color, #29275B);
  outline-offset: -2px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sort-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sort-icon .sort-default {
  opacity: 0.3;
  transition: opacity 0.15s ease;
}

.sortable-header:hover .sort-default {
  opacity: 0.6;
}

.sort-icon .sort-active {
  color: var(--primary-color, #29275B);
}

.product-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  font-size: 14px;
  color: var(--text-color, #2d3748);
}

.product-row {
  cursor: pointer;
  transition: background-color 0.15s ease;
  scroll-margin-top: 48px; /* Account for sticky header height */
}

.product-row:hover {
  background-color: #f1f5f9;
}

.product-row:focus {
  outline: none;
  background-color: #e2e8f0;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  background-color: #f1f5f9;
}

.product-name {
  font-weight: 500;
  margin: 0 0 2px;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-sku {
  font-size: 12px;
  color: var(--muted-color, #6b7280);
  margin: 0;
  font-family: monospace;
}

.sku-more {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 6px;
  font-style: italic;
  font-family: inherit;
}

.category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.features {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.feature-tag {
  padding: 2px 8px;
  background-color: #f1f5f9;
  border-radius: 4px;
  font-size: 11px;
  color: var(--muted-color, #6b7280);
}

.more-tag {
  padding: 2px 8px;
  background-color: #e2e8f0;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-color, #2d3748);
  font-weight: 500;
}

/* Status badge styles */
.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-enabled {
  background-color: #dcfce7;
  color: #166534;
}

.status-disabled {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Action buttons */
.actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background-color: transparent;
  cursor: pointer;
  color: var(--muted-color, #6b7280);
  transition: all 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background-color: #f1f5f9;
  color: var(--text-color, #2d3748);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-view:hover:not(:disabled) {
  background-color: #f3e8ff;
  color: #7c3aed;
}

.action-preview {
  color: #29275B;
}

.action-preview:hover:not(:disabled) {
  background-color: #29275B;
  color: #ffffff;
}

.action-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Variants toggle button */
.variants-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 16px;
  background-color: #f8fafc;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color, #2d3748);
  cursor: pointer;
  transition: all 0.15s ease;
}

.variants-toggle-btn:hover {
  background-color: #eef2f7;
  border-color: var(--primary-color, #29275B);
}

.variants-toggle-btn.expanded {
  background-color: var(--primary-color, #29275B);
  border-color: var(--primary-color, #29275B);
  color: #ffffff;
}

.variants-toggle-btn .chevron-icon {
  transition: transform 0.2s ease;
}

.variants-toggle-btn .chevron-icon.rotated {
  transform: rotate(180deg);
}

.variants-count {
  font-weight: 600;
}

.variants-count-static {
  font-size: 14px;
  color: var(--muted-color, #6b7280);
}

/* Variants expansion row */
.variants-expansion-row {
  background-color: #f8fafc;
}

.variants-expansion-row td {
  padding: 0 !important;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.variants-panel {
  padding: 16px 20px 16px 36px;
  margin-left: 48px;
  background: linear-gradient(to right, rgba(41, 39, 91, 0.03), transparent 40%);
  border-left: 3px solid var(--primary-color, #29275B);
  position: relative;
}

.variants-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color, #29275B);
  margin-bottom: 12px;
  margin-left: 24px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.variants-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 28px;
}

/* Vertical connector line */
.variants-list::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 20px;
  width: 1px;
  background-color: #d1d5db;
}

.variant-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  margin-top: 8px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.15s ease;
  position: relative;
}

/* L-connector elbow for each variant */
.variant-item::before {
  content: '';
  position: absolute;
  left: -28px;
  top: 50%;
  width: 20px;
  height: 1px;
  background-color: #d1d5db;
}

.variant-item:first-child {
  margin-top: 0;
}

.variant-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-color: #c7d2fe;
  background-color: #fafaff;
}

.variant-item:hover::before {
  background-color: var(--primary-color, #29275B);
}

.variant-image {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  background-color: #f1f5f9;
  flex-shrink: 0;
}

.variant-image-placeholder {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  flex-shrink: 0;
}

.variant-info {
  width: 160px;
  min-width: 120px;
  flex-shrink: 0;
}

.variant-name {
  font-weight: 450;
  font-size: 13px;
  margin: 0;
  color: var(--text-color, #2d3748);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.variant-sku-col {
  width: 120px;
  flex-shrink: 0;
}

.variant-sku {
  font-size: 11px;
  color: var(--muted-color, #6b7280);
  font-family: 'SF Mono', Monaco, monospace;
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
}

.variant-dimensions-col {
  width: 100px;
  flex-shrink: 0;
}

.variant-dimensions {
  font-size: 12px;
  color: #4b5563;
  margin: 0;
}

.variant-price-col {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.variant-price {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color, #2d3748);
  white-space: nowrap;
}

.leader-line {
  width: 24px;
  height: 1px;
  background: linear-gradient(to right, #d1d5db 50%, transparent 50%);
  background-size: 6px 1px;
}

.variant-preview-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background-color: var(--primary-color, #29275B);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.variant-preview-btn svg {
  width: 14px;
  height: 14px;
}

.variant-preview-btn:hover:not(:disabled) {
  background-color: #1e1b4b;
  transform: translateY(-1px);
}

.variant-preview-btn.disabled {
  background-color: #e2e8f0;
  color: #9ca3af;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted-color, #6b7280);
}

.empty-state svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
}

.empty-state-sub {
  font-size: 13px;
  margin-top: 4px;
}

/* Skeleton loading styles */
.skeleton-row {
  pointer-events: none;
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  flex-shrink: 0;
}

.skeleton-text {
  height: 14px;
}

.skeleton-text--name {
  width: 180px;
  margin-bottom: 6px;
}

.skeleton-text--sku {
  width: 100px;
  height: 12px;
}

.skeleton-text--price {
  width: 60px;
}

.skeleton-text--count {
  width: 30px;
}

.skeleton-badge {
  width: 70px;
  height: 24px;
  border-radius: 12px;
}

.skeleton-features {
  display: flex;
  gap: 4px;
}

.skeleton-tag {
  width: 50px;
  height: 20px;
  border-radius: 4px;
}

.skeleton-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 4px;
}

/* Checkbox styles */
.checkbox-header,
.checkbox-cell {
  width: 48px;
  padding: 14px 12px !important;
}

.checkbox-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  width: 18px;
  height: 18px;
  background-color: #fff;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-container:hover .checkmark {
  border-color: var(--primary-color, #29275B);
}

.checkbox-container input:checked ~ .checkmark {
  background-color: var(--primary-color, #29275B);
  border-color: var(--primary-color, #29275B);
}

.checkbox-container input:checked ~ .checkmark::after {
  content: '';
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.checkmark.indeterminate {
  background-color: var(--primary-color, #29275B);
  border-color: var(--primary-color, #29275B);
}

.checkmark.indeterminate::after {
  content: '';
  width: 8px;
  height: 2px;
  background-color: white;
}

/* Selected row highlight */
.product-row.row-selected {
  background-color: #f0f0ff;
}

.product-row.row-selected:hover {
  background-color: #e8e8f8;
}

/* Mobile styles */
@media (max-width: 767px) {
  .table-container {
    max-height: calc(100vh - 280px);
    min-height: 300px;
  }

  .product-table {
    min-width: 700px;
  }

  .variants-panel {
    margin-left: 16px;
    padding: 12px 14px 12px 24px;
  }

  .variants-list {
    padding-left: 20px;
  }

  .variants-list::before {
    left: 6px;
  }

  .variant-item::before {
    left: -20px;
    width: 14px;
  }

  .variant-item {
    flex-wrap: wrap;
    gap: 8px;
  }

  .variant-info {
    width: auto;
    flex: 1 1 150px;
  }

  .variant-sku-col,
  .variant-dimensions-col {
    width: auto;
    flex: 0 0 auto;
  }

  .variant-price-col {
    order: 3;
    width: 100%;
    margin-left: 0;
    justify-content: space-between;
    margin-top: 4px;
  }

  .leader-line {
    display: none;
  }

  .variant-preview-btn {
    order: 4;
  }
}
</style>
