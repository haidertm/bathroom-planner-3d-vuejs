<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { AdminProduct } from '../../../types/admin';
import { useToast } from '../../../composables/useToast';

const toast = useToast();

const props = defineProps<{
  product: AdminProduct | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const copiedSku = ref<string | null>(null);

const formatPrice = (price: string | null | undefined): string => {
  if (!price) {
    return '£0.00';
  }
  const num = parseFloat(price.trim());
  if (!Number.isFinite(num)) {
    return '£0.00';
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

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedSku.value = text;
    toast.success('SKU copied to clipboard');
    setTimeout(() => {
      copiedSku.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    toast.error('Failed to copy to clipboard');
  }
};

// Keyboard navigation - close on Escape
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen) {
    emit('close');
  }
};

// Focus trap for accessibility
const drawerRef = ref<HTMLElement | null>(null);
const previousActiveElement = ref<HTMLElement | null>(null);

// Selector for focusable elements within the drawer
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Get all focusable elements within the drawer
 */
const getFocusableElements = (): HTMLElement[] => {
  if (!drawerRef.value) return [];
  return Array.from(drawerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
};

/**
 * Handle Tab/Shift+Tab to trap focus within the drawer
 */
const handleFocusTrap = (event: KeyboardEvent) => {
  if (event.key !== 'Tab') return;

  const focusableElements = getFocusableElements();
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) {
    // Shift+Tab: if on first element, go to last
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab: if on last element, go to first
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
};

/**
 * GTM tracking helper for drawer events
 */
const trackDrawerEvent = (action: 'open' | 'close', product: AdminProduct | null) => {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: 'product_drawer',
      drawer_action: action,
      product_id: product?.id || null,
      product_name: product?.name || null,
      product_category: product?.category || null,
    });
  }
};

/**
 * Set up focus trap when drawer opens
 */
const setupFocusTrap = () => {
  // Store the currently focused element to restore later
  previousActiveElement.value = document.activeElement as HTMLElement;

  // Add focus trap handler to the drawer
  drawerRef.value?.addEventListener('keydown', handleFocusTrap);

  // Focus the first focusable element (or the close button)
  setTimeout(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      drawerRef.value?.focus();
    }
  }, 100);
};

/**
 * Clean up focus trap when drawer closes
 */
const cleanupFocusTrap = () => {
  // Remove focus trap handler
  drawerRef.value?.removeEventListener('keydown', handleFocusTrap);

  // Restore focus to the previously focused element
  if (previousActiveElement.value && typeof previousActiveElement.value.focus === 'function') {
    previousActiveElement.value.focus();
  }
  previousActiveElement.value = null;
};

watch(() => props.isOpen, (isOpen, wasOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';

    // Track drawer open event
    trackDrawerEvent('open', props.product);

    // Set up focus trap after DOM updates
    setTimeout(() => {
      setupFocusTrap();
    }, 50);
  } else {
    document.body.style.overflow = '';

    // Track drawer close event (only if it was previously open)
    if (wasOpen) {
      trackDrawerEvent('close', props.product);
    }

    // Clean up focus trap
    cleanupFocusTrap();
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);

  // Clean up focus trap if drawer is open when component unmounts
  if (props.isOpen) {
    drawerRef.value?.removeEventListener('keydown', handleFocusTrap);
  }

  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <!-- Overlay -->
    <Transition name="fade">
      <div v-if="isOpen" class="drawer-overlay" @click="emit('close')"></div>
    </Transition>

    <!-- Drawer -->
    <Transition name="slide">
      <div
        v-if="isOpen && product"
        ref="drawerRef"
        class="product-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        tabindex="-1"
      >
        <div class="drawer-content">
          <!-- Drawer Header -->
          <div class="drawer-header">
            <h2 id="drawer-title" class="drawer-title">Product Details</h2>
            <button @click="emit('close')" class="drawer-close-btn" aria-label="Close drawer">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- Product Image & Basic Info -->
          <div class="drawer-product-header">
            <img
              :src="getImageUrl(product.image)"
              :alt="product.name"
              class="drawer-product-image"
              loading="lazy"
            />
            <div class="drawer-product-info">
              <h3 class="drawer-product-name">{{ product.name }}</h3>
              <div class="sku-copy-container">
                <span class="drawer-product-id">SKU: {{ product.variants?.[0]?.sku || product.id }}</span>
                <button
                  @click.stop="copyToClipboard(product.variants?.[0]?.sku || product.id)"
                  class="copy-btn"
                  :title="copiedSku === (product.variants?.[0]?.sku || product.id) ? 'Copied!' : 'Copy SKU'"
                  :aria-label="copiedSku === (product.variants?.[0]?.sku || product.id) ? 'Copied!' : 'Copy SKU'"
                >
                  <svg v-if="copiedSku !== (product.variants?.[0]?.sku || product.id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
              <span
                class="category-badge"
                :style="{
                  backgroundColor: `${getCategoryColor(product.category)}15`,
                  color: getCategoryColor(product.category)
                }"
              >
                {{ product.category }}
              </span>
              <p class="drawer-product-price">{{ formatPrice(product.price) }}</p>
            </div>
          </div>

          <!-- Features Section -->
          <div v-if="product.features && product.features.length > 0" class="drawer-section">
            <h4 class="drawer-section-title">Features</h4>
            <div class="drawer-features">
              <span v-for="(feature, idx) in product.features" :key="idx" class="drawer-feature-tag">
                {{ feature }}
              </span>
            </div>
          </div>

          <!-- Product Link -->
          <div v-if="product.link" class="drawer-section">
            <h4 class="drawer-section-title">Product Link</h4>
            <a :href="product.link" target="_blank" rel="noopener noreferrer" class="drawer-link-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              View on Bathroom Mountain
            </a>
          </div>

          <!-- Variants Section -->
          <div v-if="product.variants && product.variants.length > 0" class="drawer-section">
            <h4 class="drawer-section-title">Variants ({{ product.variants.length }})</h4>
            <div class="variants-container">
              <div v-for="(variant, idx) in product.variants" :key="idx" class="variant-card">
                <div class="variant-header">
                  <img
                    v-if="variant.image"
                    :src="getImageUrl(variant.image)"
                    :alt="variant.name"
                    class="variant-image"
                    loading="lazy"
                  />
                  <div class="variant-header-info">
                    <span class="variant-name">{{ variant.name }}</span>
                    <span class="variant-sku">{{ variant.sku }}</span>
                  </div>
                </div>
                <div class="variant-details">
                  <div class="variant-detail-row">
                    <span class="variant-label">Dimensions:</span>
                    <span class="variant-value">
                      {{ variant.dimensions?.width || '-' }} × {{ variant.dimensions?.depth || '-' }} × {{ variant.dimensions?.height || '-' }} cm
                    </span>
                  </div>
                  <div class="variant-detail-row">
                    <span class="variant-label">Price:</span>
                    <span class="variant-value">{{ formatPrice(variant.price || '0') }}</span>
                  </div>
                  <div v-if="variant.path" class="variant-detail-row">
                    <span class="variant-label">Model:</span>
                    <span class="variant-model-path" :title="variant.path">{{ variant.path }}</span>
                  </div>
                  <div v-if="variant.spawnHeight !== undefined" class="variant-detail-row">
                    <span class="variant-label">Spawn Height:</span>
                    <span class="variant-value">{{ variant.spawnHeight }} cm</span>
                  </div>
                  <div v-if="variant.floorOffset !== undefined" class="variant-detail-row">
                    <span class="variant-label">Floor Offset:</span>
                    <span class="variant-value">{{ variant.floorOffset }} cm</span>
                  </div>

                  <!-- Orientation Config -->
                  <div v-if="variant.orientation" class="variant-config-section">
                    <span class="variant-config-title">Orientation</span>
                    <div class="variant-config-grid">
                      <div class="config-item">
                        <span class="config-label">Type:</span>
                        <span class="config-value config-badge">{{ variant.orientation.type }}</span>
                      </div>
                      <div v-if="variant.orientation.wallBuffer !== undefined" class="config-item">
                        <span class="config-label">Wall Buffer:</span>
                        <span class="config-value">{{ variant.orientation.wallBuffer }} cm</span>
                      </div>
                      <div v-if="variant.orientation.rotationOffset !== undefined" class="config-item">
                        <span class="config-label">Rotation Offset:</span>
                        <span class="config-value">{{ variant.orientation.rotationOffset }}°</span>
                      </div>
                      <div v-if="variant.orientation.description" class="config-item config-item-full">
                        <span class="config-label">Description:</span>
                        <span class="config-value">{{ variant.orientation.description }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Movement Config -->
                  <div v-if="variant.movement" class="variant-config-section">
                    <span class="variant-config-title">Movement</span>
                    <div class="variant-config-grid">
                      <div class="config-item">
                        <span class="config-label">Snap to Wall:</span>
                        <span class="config-value" :class="variant.movement.snapToWall ? 'config-yes' : 'config-no'">
                          {{ variant.movement.snapToWall ? 'Yes' : 'No' }}
                        </span>
                      </div>
                      <div v-if="variant.movement.cornerInstallOnly !== undefined" class="config-item">
                        <span class="config-label">Corner Only:</span>
                        <span class="config-value" :class="variant.movement.cornerInstallOnly ? 'config-yes' : 'config-no'">
                          {{ variant.movement.cornerInstallOnly ? 'Yes' : 'No' }}
                        </span>
                      </div>
                      <div v-if="variant.movement.allowVerticalMovement !== undefined" class="config-item">
                        <span class="config-label">Vertical Move:</span>
                        <span class="config-value" :class="variant.movement.allowVerticalMovement ? 'config-yes' : 'config-no'">
                          {{ variant.movement.allowVerticalMovement ? 'Yes' : 'No' }}
                        </span>
                      </div>
                      <div v-if="variant.movement.allowFreeRotation !== undefined" class="config-item">
                        <span class="config-label">Free Rotation:</span>
                        <span class="config-value" :class="variant.movement.allowFreeRotation ? 'config-yes' : 'config-no'">
                          {{ variant.movement.allowFreeRotation ? 'Yes' : 'No' }}
                        </span>
                      </div>
                      <div v-if="variant.movement.minHeight !== undefined" class="config-item">
                        <span class="config-label">Min Height:</span>
                        <span class="config-value">{{ variant.movement.minHeight }} cm</span>
                      </div>
                      <div v-if="variant.movement.maxHeight !== undefined" class="config-item">
                        <span class="config-label">Max Height:</span>
                        <span class="config-value">{{ variant.movement.maxHeight }} cm</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Overlay */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* Drawer */
.product-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 500px;
  max-width: 90vw;
  height: 100vh;
  background-color: #ffffff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  overflow-y: auto;
}

.product-drawer:focus {
  outline: none;
}

.drawer-content {
  padding: 24px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.drawer-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color, #2d3748);
  margin: 0;
}

.drawer-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  color: var(--muted-color, #6b7280);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.drawer-close-btn:hover {
  background-color: #f1f5f9;
}

.drawer-close-btn:focus {
  outline: 2px solid var(--primary-color, #29275B);
  outline-offset: 2px;
}

.drawer-product-header {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 12px;
}

.drawer-product-image {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  object-fit: cover;
  background-color: #ffffff;
  border: 1px solid var(--border-color, #e2e8f0);
}

.drawer-product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.drawer-product-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color, #2d3748);
  margin: 0;
  line-height: 1.3;
}

.sku-copy-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-product-id {
  font-size: 13px;
  color: var(--muted-color, #6b7280);
  font-family: monospace;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 4px;
  background-color: #ffffff;
  color: var(--muted-color, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  background-color: #f1f5f9;
  border-color: #cbd5e1;
}

.category-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  align-self: flex-start;
}

.drawer-product-price {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color, #29275B);
  margin: 8px 0 0;
}

.drawer-section {
  margin-bottom: 24px;
}

.drawer-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #2d3748);
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.drawer-features {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.drawer-feature-tag {
  padding: 6px 12px;
  background-color: #f1f5f9;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-color, #2d3748);
}

.drawer-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: var(--primary-color, #29275B);
  color: #ffffff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.drawer-link-btn:hover {
  background-color: #1e1c44;
}

.variants-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.variant-card {
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 10px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.variant-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}

.variant-image {
  width: 70px;
  height: 70px;
  border-radius: 8px;
  object-fit: cover;
  background-color: #ffffff;
  border: 1px solid var(--border-color, #e2e8f0);
  flex-shrink: 0;
}

.variant-header-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.variant-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #2d3748);
  line-height: 1.3;
}

.variant-sku {
  font-size: 12px;
  color: var(--muted-color, #6b7280);
  font-family: monospace;
  background-color: #e2e8f0;
  padding: 2px 8px;
  border-radius: 4px;
  align-self: flex-start;
}

.variant-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variant-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.variant-label {
  color: var(--muted-color, #6b7280);
}

.variant-value {
  color: var(--text-color, #2d3748);
  font-weight: 500;
}

.variant-model-path {
  color: var(--text-color, #2d3748);
  font-family: monospace;
  font-size: 11px;
  background-color: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Configuration sections */
.variant-config-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color, #e2e8f0);
}

.variant-config-title {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted-color, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.variant-config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.config-item-full {
  grid-column: 1 / -1;
}

.config-label {
  color: var(--muted-color, #6b7280);
}

.config-value {
  color: var(--text-color, #2d3748);
  font-weight: 500;
}

.config-badge {
  background-color: #e0e7ff;
  color: #4338ca;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.config-yes {
  color: #166534;
  background-color: #dcfce7;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

.config-no {
  color: #991b1b;
  background-color: #fee2e2;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}

/* Scrollbar styling */
.product-drawer::-webkit-scrollbar {
  width: 8px;
}

.product-drawer::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.product-drawer::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.product-drawer::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Mobile styles */
@media (max-width: 767px) {
  .product-drawer {
    width: 100%;
    max-width: 100%;
  }

  .drawer-content {
    padding: 16px;
  }

  .drawer-product-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .drawer-product-info {
    align-items: center;
  }
}
</style>
