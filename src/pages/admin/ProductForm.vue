<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { COMPONENTS, type ComponentType } from '../../constants/components';
import type { AdminProduct, ProductVariant, ValidationErrors } from '../../types/admin';

const props = defineProps<{
  product: AdminProduct | null;
  mode: 'add' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'save', product: Omit<AdminProduct, 'id' | 'createdAt' | 'updatedAt'> | AdminProduct): void;
  (e: 'cancel'): void;
}>();

// Form state
const formData = ref({
  id: '',
  category: 'Furniture' as ComponentType,
  name: '',
  price: '',
  link: '',
  image: '',
  variantType: 'Default',
  features: [] as string[],
  variants: [] as ProductVariant[],
});

const newFeature = ref('');
const errors = ref<ValidationErrors>({});
const activeTab = ref<'details' | 'variants'>('details');
const expandedVariant = ref<string | null>(null);
const showAddVariant = ref(false);

// New variant form
const newVariant = ref<ProductVariant>({
  id: '',
  name: '',
  sku: '',
  path: '',
  image: '',
  link: '',
  price: '',
  title: '',
  dimensions: { width: 0, height: 0, depth: 0 },
  orientation: {
    type: 'face_into_room',
    wallBuffer: 0,
  },
  movement: {
    snapToWall: true,
    allowVerticalMovement: false,
    allowFreeRotation: false,
  },
});

// Initialize form data from product prop
onMounted(() => {
  if (props.product) {
    formData.value = {
      id: props.product.id,
      category: props.product.category,
      name: props.product.name,
      price: props.product.price,
      link: props.product.link,
      image: props.product.image,
      variantType: props.product.variantType,
      features: [...props.product.features],
      variants: JSON.parse(JSON.stringify(props.product.variants)),
    };
  }
});

// Watch for product changes
watch(() => props.product, (newProduct) => {
  if (newProduct) {
    formData.value = {
      id: newProduct.id,
      category: newProduct.category,
      name: newProduct.name,
      price: newProduct.price,
      link: newProduct.link,
      image: newProduct.image,
      variantType: newProduct.variantType,
      features: [...newProduct.features],
      variants: JSON.parse(JSON.stringify(newProduct.variants)),
    };
  } else {
    resetForm();
  }
}, { immediate: true });

// Reset form
const resetForm = () => {
  formData.value = {
    id: '',
    category: 'Furniture',
    name: '',
    price: '',
    link: '',
    image: '',
    variantType: 'Default',
    features: [],
    variants: [],
  };
  errors.value = {};
};

// Add feature
const addFeature = () => {
  if (newFeature.value.trim() && !formData.value.features.includes(newFeature.value.trim())) {
    formData.value.features.push(newFeature.value.trim());
    newFeature.value = '';
  }
};

// Remove feature
const removeFeature = (index: number) => {
  formData.value.features.splice(index, 1);
};

// Generate variant ID
const generateVariantId = () => {
  return `var_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
};

// Reset new variant form
const resetNewVariant = () => {
  newVariant.value = {
    id: generateVariantId(),
    name: '',
    sku: '',
    path: '',
    image: '',
    link: '',
    price: '',
    title: '',
    dimensions: { width: 0, height: 0, depth: 0 },
    orientation: {
      type: 'face_into_room',
      wallBuffer: 0,
    },
    movement: {
      snapToWall: true,
      allowVerticalMovement: false,
      allowFreeRotation: false,
    },
  };
};

// Add variant
const addVariant = () => {
  if (!newVariant.value.name.trim() || !newVariant.value.sku.trim()) {
    return;
  }

  newVariant.value.id = generateVariantId();
  formData.value.variants.push({ ...newVariant.value });
  resetNewVariant();
  showAddVariant.value = false;
};

// Remove variant
const removeVariant = (index: number) => {
  formData.value.variants.splice(index, 1);
};

// Toggle variant expansion
const toggleVariant = (id: string) => {
  expandedVariant.value = expandedVariant.value === id ? null : id;
};

// Validate form
const validate = (): boolean => {
  errors.value = {};

  if (!formData.value.name.trim()) {
    errors.value.name = 'Product name is required';
  }

  if (!formData.value.price.trim()) {
    errors.value.price = 'Price is required';
  } else if (isNaN(parseFloat(formData.value.price))) {
    errors.value.price = 'Price must be a valid number';
  }

  if (!formData.value.category) {
    errors.value.category = 'Category is required';
  }

  if (formData.value.variants.length === 0) {
    errors.value.variants = 'At least one variant is required';
  }

  return Object.keys(errors.value).length === 0;
};

// Submit form
// Get the primary SKU from the first variant
const primarySku = computed(() => {
  if (formData.value.variants && formData.value.variants.length > 0) {
    return formData.value.variants[0].sku || 'N/A';
  }
  return 'No variants';
});

// Format image path for preview (add leading slash if needed)
const formatImagePath = (path: string) => {
  if (!path) return '';
  // If it's already an absolute URL or starts with /, return as-is
  if (path.startsWith('http') || path.startsWith('/')) {
    return path;
  }
  // Add leading slash for relative paths
  return '/' + path;
};

const handleSubmit = () => {
  if (!validate()) {
    return;
  }

  // Sync the first variant's title with the product name
  // This ensures consistency between product name and variant title
  const updatedVariants = formData.value.variants.map((variant, index) => {
    if (index === 0) {
      return {
        ...variant,
        title: formData.value.name, // Sync first variant title with product name
      };
    }
    return variant;
  });

  const productData = {
    ...formData.value,
    variants: updatedVariants,
  };

  if (props.mode === 'edit' && props.product) {
    emit('save', {
      ...productData,
      id: props.product.id,
      createdAt: props.product.createdAt,
    } as AdminProduct);
  } else {
    const { id, ...dataWithoutId } = productData;
    emit('save', dataWithoutId);
  }
};

// Cancel
const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <div class="form-container">
    <div class="form-header">
      <h2 class="form-title">{{ mode === 'add' ? 'Add New Product' : 'Edit Product' }}</h2>
      <p class="form-subtitle">{{ mode === 'add' ? 'Create a new product with variants' : 'Update product details and variants' }}</p>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        @click="activeTab = 'details'"
        :class="['tab', { 'tab-active': activeTab === 'details' }]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        Product Details
      </button>
      <button
        @click="activeTab = 'variants'"
        :class="['tab', { 'tab-active': activeTab === 'variants' }]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        Variants ({{ formData.variants.length }})
        <span v-if="errors.variants" class="tab-error">!</span>
      </button>
    </div>

    <form @submit.prevent="handleSubmit" class="form">
      <!-- Details Tab -->
      <div v-show="activeTab === 'details'" class="tab-content">
        <div class="form-grid">
          <!-- Primary SKU (read-only, from first variant) -->
          <div v-if="mode === 'edit'" class="input-group">
            <label class="label">Product SKU</label>
            <input
              :value="primarySku"
              type="text"
              readonly
              class="input input-readonly"
            />
            <span class="sku-hint">SKU from first variant (read-only)</span>
          </div>

          <!-- Name -->
          <div class="input-group">
            <label class="label">Product Name *</label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="Enter product name"
              :class="['input', { 'input-error': errors.name }]"
            />
            <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
          </div>

          <!-- Category -->
          <div class="input-group">
            <label class="label">Category *</label>
            <select v-model="formData.category" :class="['select', { 'input-error': errors.category }]">
              <option v-for="cat in COMPONENTS" :key="cat" :value="cat">{{ cat }}</option>
            </select>
            <span v-if="errors.category" class="error-text">{{ errors.category }}</span>
          </div>

          <!-- Price -->
          <div class="input-group">
            <label class="label">Price (£) *</label>
            <input
              v-model="formData.price"
              type="text"
              placeholder="0.00"
              :class="['input', { 'input-error': errors.price }]"
            />
            <span v-if="errors.price" class="error-text">{{ errors.price }}</span>
          </div>

          <!-- Variant Type -->
          <div class="input-group">
            <label class="label">Variant Type</label>
            <input
              v-model="formData.variantType"
              type="text"
              placeholder="e.g., Size Options, Color Options"
              class="input"
            />
          </div>

          <!-- Link -->
          <div class="input-group full-width">
            <label class="label">Product Link</label>
            <input
              v-model="formData.link"
              type="url"
              placeholder="https://example.com/product"
              class="input"
            />
          </div>

          <!-- Image URL -->
          <div class="input-group full-width">
            <label class="label">Image URL</label>
            <div class="image-input-wrapper">
              <input
                v-model="formData.image"
                type="text"
                placeholder="assets/productImages/category/image.webp"
                class="input image-input"
              />
              <div v-if="formData.image" class="image-preview">
                <img :src="formatImagePath(formData.image)" alt="Preview" class="preview-image" />
              </div>
            </div>
          </div>

          <!-- Features -->
          <div class="input-group full-width">
            <label class="label">Features</label>
            <div class="feature-input-wrapper">
              <input
                v-model="newFeature"
                type="text"
                placeholder="Add a feature..."
                @keyup.enter="addFeature"
                class="input feature-input"
              />
              <button type="button" @click="addFeature" class="add-feature-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
            <div v-if="formData.features.length > 0" class="features-list">
              <span
                v-for="(feature, index) in formData.features"
                :key="index"
                class="feature-tag"
              >
                {{ feature }}
                <button type="button" @click="removeFeature(index)" class="remove-feature-btn">×</button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Variants Tab -->
      <div v-show="activeTab === 'variants'" class="tab-content">
        <div v-if="errors.variants" class="variant-error">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ errors.variants }}
        </div>

        <!-- Add Variant Button -->
        <button type="button" @click="showAddVariant = true" class="add-variant-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Variant
        </button>

        <!-- Add Variant Form -->
        <div v-if="showAddVariant" class="variant-form">
          <div class="variant-form-header">
            <h4 class="variant-form-title">New Variant</h4>
            <button type="button" @click="showAddVariant = false" class="close-variant-form">×</button>
          </div>

          <div class="variant-form-grid">
            <div class="input-group">
              <label class="small-label">Variant Name *</label>
              <input v-model="newVariant.name" type="text" placeholder="e.g., 600mm Width" class="small-input" />
            </div>
            <div class="input-group">
              <label class="small-label">SKU *</label>
              <input v-model="newVariant.sku" type="text" placeholder="e.g., C76236" class="small-input" />
            </div>
            <div class="input-group">
              <label class="small-label">Price (£)</label>
              <input v-model="newVariant.price" type="text" placeholder="0.00" class="small-input" />
            </div>
            <div class="input-group">
              <label class="small-label">GLB Model Path</label>
              <input v-model="newVariant.path" type="text" placeholder="../../models/category/model.glb" class="small-input" />
            </div>
            <div class="input-group">
              <label class="small-label">Image URL</label>
              <input v-model="newVariant.image" type="text" placeholder="assets/productImages/..." class="small-input" />
            </div>
            <div class="input-group">
              <label class="small-label">Product Link</label>
              <input v-model="newVariant.link" type="url" placeholder="https://..." class="small-input" />
            </div>
          </div>

          <!-- Dimensions -->
          <div class="dimensions-section">
            <label class="small-label">Dimensions (cm)</label>
            <div class="dimensions-grid">
              <div class="dimension-input-group">
                <span>Width</span>
                <input v-model.number="newVariant.dimensions.width" type="number" step="0.1" class="dimension-input" />
              </div>
              <div class="dimension-input-group">
                <span>Height</span>
                <input v-model.number="newVariant.dimensions.height" type="number" step="0.1" class="dimension-input" />
              </div>
              <div class="dimension-input-group">
                <span>Depth</span>
                <input v-model.number="newVariant.dimensions.depth" type="number" step="0.1" class="dimension-input" />
              </div>
            </div>
          </div>

          <!-- Movement Options -->
          <div class="movement-section">
            <label class="small-label">Movement Options</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="newVariant.movement!.snapToWall" class="checkbox-input" />
                Snap to Wall
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="newVariant.movement!.allowVerticalMovement" class="checkbox-input" />
                Allow Vertical Movement
              </label>
              <label class="checkbox-label">
                <input type="checkbox" v-model="newVariant.movement!.allowFreeRotation" class="checkbox-input" />
                Allow Free Rotation
              </label>
            </div>
          </div>

          <div class="variant-form-actions">
            <button type="button" @click="showAddVariant = false" class="variant-cancel-btn">Cancel</button>
            <button type="button" @click="addVariant" class="variant-save-btn">Add Variant</button>
          </div>
        </div>

        <!-- Existing Variants -->
        <div class="variants-list">
          <div
            v-for="(variant, index) in formData.variants"
            :key="variant.id || index"
            class="variant-card"
          >
            <div class="variant-card-header" @click="toggleVariant(variant.id)">
              <div class="variant-info">
                <img v-if="variant.image" :src="formatImagePath(variant.image)" :alt="variant.title || variant.name" class="variant-thumbnail" />
                <div class="variant-placeholder" v-else>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div>
                  <p class="variant-name">{{ index === 0 ? formData.name : (variant.title || variant.name) }}</p>
                  <p class="variant-sku">SKU: {{ variant.sku }} | £{{ variant.price }}</p>
                </div>
              </div>
              <div class="variant-actions">
                <button type="button" @click.stop="removeVariant(index)" class="remove-variant-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
                <svg
                  :class="['expand-icon', { 'expand-icon-rotated': expandedVariant === variant.id }]"
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            <!-- Expanded Variant Details -->
            <div v-if="expandedVariant === variant.id" class="variant-details">
              <div class="variant-form-grid">
                <div class="input-group">
                  <label class="small-label">Name</label>
                  <input v-model="variant.name" type="text" class="small-input" />
                </div>
                <div class="input-group">
                  <label class="small-label">SKU</label>
                  <input v-model="variant.sku" type="text" class="small-input" />
                </div>
                <div class="input-group">
                  <label class="small-label">Price</label>
                  <input v-model="variant.price" type="text" class="small-input" />
                </div>
                <div class="input-group">
                  <label class="small-label">Model Path</label>
                  <input v-model="variant.path" type="text" class="small-input" />
                </div>
              </div>
              <div class="dimensions-section">
                <label class="small-label">Dimensions (cm)</label>
                <div class="dimensions-grid">
                  <div class="dimension-input-group">
                    <span>W</span>
                    <input v-model.number="variant.dimensions.width" type="number" step="0.1" class="dimension-input" />
                  </div>
                  <div class="dimension-input-group">
                    <span>H</span>
                    <input v-model.number="variant.dimensions.height" type="number" step="0.1" class="dimension-input" />
                  </div>
                  <div class="dimension-input-group">
                    <span>D</span>
                    <input v-model.number="variant.dimensions.depth" type="number" step="0.1" class="dimension-input" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="formData.variants.length === 0 && !showAddVariant" class="empty-variants">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <p>No variants added yet</p>
            <p class="empty-subtext">Click "Add Variant" to create product variants</p>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="handleCancel" class="cancel-btn">
          Cancel
        </button>
        <button type="submit" class="submit-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ mode === 'add' ? 'Create Product' : 'Save Changes' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* CSS Variables */
:root {
  --primary-color: #29275B;
  --border-color: #e2e8f0;
  --text-color: #2d3748;
  --muted-color: #6b7280;
  --error-color: #dc2626;
}

/* Form Container */
.form-container {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

.form-header {
  padding: 24px 24px 0;
}

.form-title {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 4px;
}

.form-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 4px;
  padding: 20px 24px 0;
  border-bottom: 1px solid #e2e8f0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-bottom: 2px solid transparent;
  background-color: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;
  position: relative;
}

.tab-active {
  color: #29275B;
  border-bottom-color: #29275B;
}

.tab-error {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #dc2626;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
}

.tab-content {
  padding: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

/* Input Group */
.input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.full-width {
  grid-column: 1 / -1;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
}

.small-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.input {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
}

.input-readonly {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.sku-hint {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.small-input {
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}

.input-error {
  border-color: #dc2626;
}

.select {
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background-color: #ffffff;
  cursor: pointer;
}

.error-text {
  font-size: 12px;
  color: #dc2626;
}

/* Image Input */
.image-input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.image-input {
  flex: 1;
}

.image-preview {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background-color: #f8fafc;
  flex-shrink: 0;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Feature Input */
.feature-input-wrapper {
  display: flex;
  gap: 8px;
}

.feature-input {
  flex: 1;
}

.add-feature-btn {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #f8fafc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2d3748;
}

.features-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.feature-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: #f1f5f9;
  border-radius: 16px;
  font-size: 13px;
  color: #2d3748;
}

.remove-feature-btn {
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: #6b7280;
  line-height: 1;
}

/* Variant Error */
.variant-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: #fef2f2;
  border: 1px solid #dc2626;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 16px;
}

/* Add Variant Button */
.add-variant-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  border: 2px dashed #e2e8f0;
  border-radius: 10px;
  background-color: #f8fafc;
  font-size: 14px;
  font-weight: 500;
  color: #29275B;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s ease;
}

/* Variant Form */
.variant-form {
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 10px;
  margin-bottom: 16px;
  border: 1px solid #e2e8f0;
}

.variant-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.variant-form-title {
  font-size: 16px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
}

.close-variant-form {
  padding: 4px 8px;
  border: none;
  background: none;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
}

.variant-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

/* Dimensions */
.dimensions-section {
  margin-bottom: 16px;
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 8px;
}

.dimension-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6b7280;
}

.dimension-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  width: 100%;
}

/* Movement Section */
.movement-section {
  margin-bottom: 16px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #2d3748;
  cursor: pointer;
}

.checkbox-input {
  width: 16px;
  height: 16px;
  accent-color: #29275B;
}

/* Variant Form Actions */
.variant-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.variant-cancel-btn {
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #ffffff;
  font-size: 13px;
  cursor: pointer;
  color: #2d3748;
}

.variant-save-btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background-color: #29275B;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

/* Variants List */
.variants-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.variant-card {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  background-color: #ffffff;
}

.variant-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.variant-card-header:hover {
  background-color: #f8fafc;
}

.variant-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.variant-thumbnail {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  background-color: #f1f5f9;
}

.variant-placeholder {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background-color: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.variant-name {
  font-size: 14px;
  font-weight: 500;
  color: #2d3748;
  margin: 0 0 2px;
}

.variant-sku {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
}

.variant-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #6b7280;
}

.remove-variant-btn {
  padding: 6px;
  border: none;
  border-radius: 6px;
  background-color: #fef2f2;
  color: #dc2626;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-icon {
  transition: transform 0.2s;
}

.expand-icon-rotated {
  transform: rotate(180deg);
}

.variant-details {
  padding: 16px;
  background-color: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

/* Empty Variants */
.empty-variants {
  text-align: center;
  padding: 48px 20px;
  color: #6b7280;
}

.empty-subtext {
  font-size: 13px;
  margin-top: 4px;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e2e8f0;
  background-color: #f8fafc;
}

.cancel-btn {
  padding: 12px 24px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  color: #2d3748;
}

.submit-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background-color: #29275B;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* Focus States */
.input:focus,
.select:focus,
.small-input:focus,
.dimension-input:focus {
  border-color: #29275B;
  box-shadow: 0 0 0 3px rgba(41, 39, 91, 0.1);
}

/* Hover States */
button:hover {
  opacity: 0.9;
}
</style>
