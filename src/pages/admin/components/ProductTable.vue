<script setup lang="ts">
import type { AdminProduct } from '../../../types/admin';

defineProps<{
  products: AdminProduct[];
  isLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-product', product: AdminProduct): void;
}>();

const formatPrice = (price: string | number): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
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
          <th scope="col">Features</th>
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
            <td>
              <div class="skeleton-features">
                <div class="skeleton skeleton-tag"></div>
                <div class="skeleton skeleton-tag"></div>
              </div>
            </td>
          </tr>
        </template>

        <!-- Actual product rows -->
        <template v-else>
          <tr
            v-for="product in products"
            :key="product.id"
            @click="emit('select-product', product)"
            class="product-row"
            tabindex="0"
            @keydown.enter="emit('select-product', product)"
            @keydown.space.prevent="emit('select-product', product)"
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
              <div class="features">
                <span v-for="(feature, idx) in product.features.slice(0, 2)" :key="idx" class="feature-tag">
                  {{ feature }}
                </span>
                <span v-if="product.features.length > 2" class="more-tag">
                  +{{ product.features.length - 2 }}
                </span>
              </div>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-if="products.length === 0">
            <td colspan="5" class="empty-state">
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
