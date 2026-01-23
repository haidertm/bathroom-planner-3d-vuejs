<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import type { AdminProduct } from '../../../types/admin';

defineProps<{
  products: AdminProduct[];
  isLoading?: boolean;
  useLocalFallback?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-product', product: AdminProduct): void;
  (e: 'toggle-enabled', product: AdminProduct): void;
  (e: 'edit-product', product: AdminProduct): void;
}>();

const togglingProducts = ref<Set<string>>(new Set());
const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

// Clean up pending timeouts on unmount to prevent memory leaks
onBeforeUnmount(() => {
  for (const timeoutId of pendingTimeouts) {
    clearTimeout(timeoutId);
  }
  pendingTimeouts.clear();
});

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

const handleToggle = (e: Event, product: AdminProduct) => {
  e.stopPropagation();
  togglingProducts.value.add(product.id);
  emit('toggle-enabled', product);
  // Remove from toggling after a delay (actual update happens in parent)
  const timeoutId = setTimeout(() => {
    togglingProducts.value.delete(product.id);
    pendingTimeouts.delete(timeoutId);
  }, 1000);
  pendingTimeouts.add(timeoutId);
};

const handleEdit = (e: Event, product: AdminProduct) => {
  e.stopPropagation();
  emit('edit-product', product);
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
          <th scope="col">Product</th>
          <th scope="col">Category</th>
          <th scope="col">Price</th>
          <th scope="col">Variants</th>
          <th scope="col">Status</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        <!-- Loading skeleton rows -->
        <template v-if="isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`" class="skeleton-row">
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
            <td><div class="skeleton skeleton-text skeleton-text--price"></div></td>
          </tr>
        </template>

        <!-- Actual product rows -->
        <template v-else>
          <tr
            v-for="product in products"
            :key="product.id"
            @click="handleSelectProduct(product)"
            class="product-row"
            tabindex="0"
            @keydown.enter="handleSelectProduct(product)"
            @keydown.space.prevent="handleSelectProduct(product)"
          >
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
            <td>{{ product.variants.length }}</td>
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
                  class="action-btn action-toggle"
                  :class="{ 'toggling': togglingProducts.has(product.id) }"
                  :disabled="useLocalFallback || togglingProducts.has(product.id)"
                  :title="product.enabled ? 'Disable product' : 'Enable product'"
                  @click="(e) => handleToggle(e, product)"
                >
                  <svg v-if="product.enabled" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
                <button
                  class="action-btn action-edit"
                  title="Edit product"
                  @click="(e) => handleEdit(e, product)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  class="action-btn action-view"
                  title="View details"
                  @click="emit('select-product', product)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-if="products.length === 0">
            <td colspan="6" class="empty-state">
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
  </div>
</template>

<style scoped>
.table-container {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.product-table {
  width: 100%;
  border-collapse: collapse;
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

.action-btn.toggling {
  animation: pulse 0.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.action-toggle:hover:not(:disabled) {
  background-color: #fef3c7;
  color: #b45309;
}

.action-edit:hover:not(:disabled) {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.action-view:hover:not(:disabled) {
  background-color: #f3e8ff;
  color: #7c3aed;
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

/* Mobile styles */
@media (max-width: 767px) {
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .product-table {
    min-width: 700px;
  }
}
</style>
