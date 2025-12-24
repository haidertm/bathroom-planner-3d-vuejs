<script setup lang="ts">
// @ts-nocheck - Disable strict type checking for inline styles
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
  return `var_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
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
const handleSubmit = () => {
  if (!validate()) {
    return;
  }

  const productData = {
    ...formData.value,
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
  <div :style="formContainerStyle">
    <div :style="formHeaderStyle">
      <h2 :style="formTitleStyle">{{ mode === 'add' ? 'Add New Product' : 'Edit Product' }}</h2>
      <p :style="formSubtitleStyle">{{ mode === 'add' ? 'Create a new product with variants' : 'Update product details and variants' }}</p>
    </div>

    <!-- Tabs -->
    <div :style="tabsStyle">
      <button
        @click="activeTab = 'details'"
        :style="[tabStyle, activeTab === 'details' && tabActiveStyle]"
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
        :style="[tabStyle, activeTab === 'variants' && tabActiveStyle]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
        Variants ({{ formData.variants.length }})
        <span v-if="errors.variants" :style="tabErrorStyle">!</span>
      </button>
    </div>

    <form @submit.prevent="handleSubmit" :style="formStyle">
      <!-- Details Tab -->
      <div v-show="activeTab === 'details'" :style="tabContentStyle">
        <div :style="formGridStyle">
          <!-- Name -->
          <div :style="inputGroupStyle">
            <label :style="labelStyle">Product Name *</label>
            <input
              v-model="formData.name"
              type="text"
              placeholder="Enter product name"
              :style="[inputStyle, errors.name && inputErrorStyle]"
            />
            <span v-if="errors.name" :style="errorTextStyle">{{ errors.name }}</span>
          </div>

          <!-- Category -->
          <div :style="inputGroupStyle">
            <label :style="labelStyle">Category *</label>
            <select v-model="formData.category" :style="[selectStyle, errors.category && inputErrorStyle]">
              <option v-for="cat in COMPONENTS" :key="cat" :value="cat">{{ cat }}</option>
            </select>
            <span v-if="errors.category" :style="errorTextStyle">{{ errors.category }}</span>
          </div>

          <!-- Price -->
          <div :style="inputGroupStyle">
            <label :style="labelStyle">Price (£) *</label>
            <input
              v-model="formData.price"
              type="text"
              placeholder="0.00"
              :style="[inputStyle, errors.price && inputErrorStyle]"
            />
            <span v-if="errors.price" :style="errorTextStyle">{{ errors.price }}</span>
          </div>

          <!-- Variant Type -->
          <div :style="inputGroupStyle">
            <label :style="labelStyle">Variant Type</label>
            <input
              v-model="formData.variantType"
              type="text"
              placeholder="e.g., Size Options, Color Options"
              :style="inputStyle"
            />
          </div>

          <!-- Link -->
          <div :style="[inputGroupStyle, { gridColumn: '1 / -1' }]">
            <label :style="labelStyle">Product Link</label>
            <input
              v-model="formData.link"
              type="url"
              placeholder="https://example.com/product"
              :style="inputStyle"
            />
          </div>

          <!-- Image URL -->
          <div :style="[inputGroupStyle, { gridColumn: '1 / -1' }]">
            <label :style="labelStyle">Image URL</label>
            <div :style="imageInputWrapperStyle">
              <input
                v-model="formData.image"
                type="text"
                placeholder="assets/productImages/category/image.webp"
                :style="imageInputStyle"
              />
              <div v-if="formData.image" :style="imagePreviewStyle">
                <img :src="formData.image" alt="Preview" :style="previewImageStyle" />
              </div>
            </div>
          </div>

          <!-- Features -->
          <div :style="[inputGroupStyle, { gridColumn: '1 / -1' }]">
            <label :style="labelStyle">Features</label>
            <div :style="featureInputWrapperStyle">
              <input
                v-model="newFeature"
                type="text"
                placeholder="Add a feature..."
                @keyup.enter="addFeature"
                :style="featureInputStyle"
              />
              <button type="button" @click="addFeature" :style="addFeatureButtonStyle">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
            <div v-if="formData.features.length > 0" :style="featuresListStyle">
              <span
                v-for="(feature, index) in formData.features"
                :key="index"
                :style="featureTagStyle"
              >
                {{ feature }}
                <button type="button" @click="removeFeature(index)" :style="removeFeatureButtonStyle">×</button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Variants Tab -->
      <div v-show="activeTab === 'variants'" :style="tabContentStyle">
        <div v-if="errors.variants" :style="variantErrorStyle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {{ errors.variants }}
        </div>

        <!-- Add Variant Button -->
        <button type="button" @click="showAddVariant = true" :style="addVariantButtonStyle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Variant
        </button>

        <!-- Add Variant Form -->
        <div v-if="showAddVariant" :style="variantFormStyle">
          <div :style="variantFormHeaderStyle">
            <h4 :style="variantFormTitleStyle">New Variant</h4>
            <button type="button" @click="showAddVariant = false" :style="closeVariantFormStyle">×</button>
          </div>

          <div :style="variantFormGridStyle">
            <div :style="inputGroupStyle">
              <label :style="smallLabelStyle">Variant Name *</label>
              <input v-model="newVariant.name" type="text" placeholder="e.g., 600mm Width" :style="smallInputStyle" />
            </div>
            <div :style="inputGroupStyle">
              <label :style="smallLabelStyle">SKU *</label>
              <input v-model="newVariant.sku" type="text" placeholder="e.g., C76236" :style="smallInputStyle" />
            </div>
            <div :style="inputGroupStyle">
              <label :style="smallLabelStyle">Price (£)</label>
              <input v-model="newVariant.price" type="text" placeholder="0.00" :style="smallInputStyle" />
            </div>
            <div :style="inputGroupStyle">
              <label :style="smallLabelStyle">GLB Model Path</label>
              <input v-model="newVariant.path" type="text" placeholder="../../models/category/model.glb" :style="smallInputStyle" />
            </div>
            <div :style="inputGroupStyle">
              <label :style="smallLabelStyle">Image URL</label>
              <input v-model="newVariant.image" type="text" placeholder="assets/productImages/..." :style="smallInputStyle" />
            </div>
            <div :style="inputGroupStyle">
              <label :style="smallLabelStyle">Product Link</label>
              <input v-model="newVariant.link" type="url" placeholder="https://..." :style="smallInputStyle" />
            </div>
          </div>

          <!-- Dimensions -->
          <div :style="dimensionsSectionStyle">
            <label :style="smallLabelStyle">Dimensions (cm)</label>
            <div :style="dimensionsGridStyle">
              <div :style="dimensionInputGroupStyle">
                <span>Width</span>
                <input v-model.number="newVariant.dimensions.width" type="number" step="0.1" :style="dimensionInputStyle" />
              </div>
              <div :style="dimensionInputGroupStyle">
                <span>Height</span>
                <input v-model.number="newVariant.dimensions.height" type="number" step="0.1" :style="dimensionInputStyle" />
              </div>
              <div :style="dimensionInputGroupStyle">
                <span>Depth</span>
                <input v-model.number="newVariant.dimensions.depth" type="number" step="0.1" :style="dimensionInputStyle" />
              </div>
            </div>
          </div>

          <!-- Movement Options -->
          <div :style="movementSectionStyle">
            <label :style="smallLabelStyle">Movement Options</label>
            <div :style="checkboxGroupStyle">
              <label :style="checkboxLabelStyle">
                <input type="checkbox" v-model="newVariant.movement!.snapToWall" :style="checkboxInputStyle" />
                Snap to Wall
              </label>
              <label :style="checkboxLabelStyle">
                <input type="checkbox" v-model="newVariant.movement!.allowVerticalMovement" :style="checkboxInputStyle" />
                Allow Vertical Movement
              </label>
              <label :style="checkboxLabelStyle">
                <input type="checkbox" v-model="newVariant.movement!.allowFreeRotation" :style="checkboxInputStyle" />
                Allow Free Rotation
              </label>
            </div>
          </div>

          <div :style="variantFormActionsStyle">
            <button type="button" @click="showAddVariant = false" :style="variantCancelButtonStyle">Cancel</button>
            <button type="button" @click="addVariant" :style="variantSaveButtonStyle">Add Variant</button>
          </div>
        </div>

        <!-- Existing Variants -->
        <div :style="variantsListStyle">
          <div
            v-for="(variant, index) in formData.variants"
            :key="variant.id || index"
            :style="variantCardStyle"
          >
            <div :style="variantCardHeaderStyle" @click="toggleVariant(variant.id)">
              <div :style="variantInfoStyle">
                <img v-if="variant.image" :src="variant.image" :alt="variant.name" :style="variantThumbnailStyle" />
                <div :style="variantPlaceholderStyle" v-else>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <div>
                  <p :style="variantNameStyle">{{ variant.name }}</p>
                  <p :style="variantSkuStyle">SKU: {{ variant.sku }} | £{{ variant.price }}</p>
                </div>
              </div>
              <div :style="variantActionsStyle">
                <button type="button" @click.stop="removeVariant(index)" :style="removeVariantButtonStyle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
                <svg
                  :style="{ transform: expandedVariant === variant.id ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }"
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            <!-- Expanded Variant Details -->
            <div v-if="expandedVariant === variant.id" :style="variantDetailsStyle">
              <div :style="variantFormGridStyle">
                <div :style="inputGroupStyle">
                  <label :style="smallLabelStyle">Name</label>
                  <input v-model="variant.name" type="text" :style="smallInputStyle" />
                </div>
                <div :style="inputGroupStyle">
                  <label :style="smallLabelStyle">SKU</label>
                  <input v-model="variant.sku" type="text" :style="smallInputStyle" />
                </div>
                <div :style="inputGroupStyle">
                  <label :style="smallLabelStyle">Price</label>
                  <input v-model="variant.price" type="text" :style="smallInputStyle" />
                </div>
                <div :style="inputGroupStyle">
                  <label :style="smallLabelStyle">Model Path</label>
                  <input v-model="variant.path" type="text" :style="smallInputStyle" />
                </div>
              </div>
              <div :style="dimensionsSectionStyle">
                <label :style="smallLabelStyle">Dimensions (cm)</label>
                <div :style="dimensionsGridStyle">
                  <div :style="dimensionInputGroupStyle">
                    <span>W</span>
                    <input v-model.number="variant.dimensions.width" type="number" step="0.1" :style="dimensionInputStyle" />
                  </div>
                  <div :style="dimensionInputGroupStyle">
                    <span>H</span>
                    <input v-model.number="variant.dimensions.height" type="number" step="0.1" :style="dimensionInputStyle" />
                  </div>
                  <div :style="dimensionInputGroupStyle">
                    <span>D</span>
                    <input v-model.number="variant.dimensions.depth" type="number" step="0.1" :style="dimensionInputStyle" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="formData.variants.length === 0 && !showAddVariant" :style="emptyVariantsStyle">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <p>No variants added yet</p>
            <p :style="emptySubtextStyle">Click "Add Variant" to create product variants</p>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div :style="formActionsStyle">
        <button type="button" @click="handleCancel" :style="cancelButtonStyle">
          Cancel
        </button>
        <button type="submit" :style="submitButtonStyle">
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

<script lang="ts">
// @ts-nocheck - Disable strict type checking for inline styles
const primaryColor = '#29275B';
const borderColor = '#e2e8f0';
const textColor = '#2d3748';
const mutedColor = '#6b7280';
const errorColor = '#dc2626';

export default {
  computed: {
    formContainerStyle() {
      return {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      };
    },
    formHeaderStyle() {
      return {
        padding: '24px 24px 0',
      };
    },
    formTitleStyle() {
      return {
        fontSize: '20px',
        fontWeight: '600',
        color: textColor,
        margin: '0 0 4px',
      };
    },
    formSubtitleStyle() {
      return {
        fontSize: '14px',
        color: mutedColor,
        margin: 0,
      };
    },
    tabsStyle() {
      return {
        display: 'flex',
        gap: '4px',
        padding: '20px 24px 0',
        borderBottom: `1px solid ${borderColor}`,
      };
    },
    tabStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        border: 'none',
        borderBottom: '2px solid transparent',
        backgroundColor: 'transparent',
        fontSize: '14px',
        fontWeight: '500',
        color: mutedColor,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        marginBottom: '-1px',
        position: 'relative',
      };
    },
    tabActiveStyle() {
      return {
        color: primaryColor,
        borderBottomColor: primaryColor,
      };
    },
    tabErrorStyle() {
      return {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        backgroundColor: errorColor,
        color: '#ffffff',
        fontSize: '12px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    },
    formStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
      };
    },
    tabContentStyle() {
      return {
        padding: '24px',
      };
    },
    formGridStyle() {
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
      };
    },
    inputGroupStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      };
    },
    labelStyle() {
      return {
        fontSize: '14px',
        fontWeight: '500',
        color: textColor,
      };
    },
    smallLabelStyle() {
      return {
        fontSize: '12px',
        fontWeight: '500',
        color: mutedColor,
      };
    },
    inputStyle() {
      return {
        padding: '12px 14px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        transition: 'all 0.2s ease',
      };
    },
    smallInputStyle() {
      return {
        padding: '8px 10px',
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        fontSize: '13px',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
      };
    },
    inputErrorStyle() {
      return {
        borderColor: errorColor,
      };
    },
    selectStyle() {
      return {
        padding: '12px 14px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none',
        backgroundColor: '#ffffff',
        cursor: 'pointer',
      };
    },
    errorTextStyle() {
      return {
        fontSize: '12px',
        color: errorColor,
      };
    },
    imageInputWrapperStyle() {
      return {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
      };
    },
    imageInputStyle() {
      return {
        ...this.inputStyle,
        flex: 1,
      };
    },
    imagePreviewStyle() {
      return {
        width: '80px',
        height: '80px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: `1px solid ${borderColor}`,
        backgroundColor: '#f8fafc',
        flexShrink: 0,
      };
    },
    previewImageStyle() {
      return {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      };
    },
    featureInputWrapperStyle() {
      return {
        display: 'flex',
        gap: '8px',
      };
    },
    featureInputStyle() {
      return {
        ...this.inputStyle,
        flex: 1,
      };
    },
    addFeatureButtonStyle() {
      return {
        padding: '12px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        backgroundColor: '#f8fafc',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: textColor,
      };
    },
    featuresListStyle() {
      return {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '8px',
      };
    },
    featureTagStyle() {
      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: '#f1f5f9',
        borderRadius: '16px',
        fontSize: '13px',
        color: textColor,
      };
    },
    removeFeatureButtonStyle() {
      return {
        padding: '0',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        color: mutedColor,
        lineHeight: 1,
      };
    },
    variantErrorStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        border: `1px solid ${errorColor}`,
        borderRadius: '8px',
        color: errorColor,
        fontSize: '14px',
        marginBottom: '16px',
      };
    },
    addVariantButtonStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '14px',
        border: `2px dashed ${borderColor}`,
        borderRadius: '10px',
        backgroundColor: '#f8fafc',
        fontSize: '14px',
        fontWeight: '500',
        color: primaryColor,
        cursor: 'pointer',
        marginBottom: '16px',
        transition: 'all 0.2s ease',
      };
    },
    variantFormStyle() {
      return {
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '10px',
        marginBottom: '16px',
        border: `1px solid ${borderColor}`,
      };
    },
    variantFormHeaderStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
      };
    },
    variantFormTitleStyle() {
      return {
        fontSize: '16px',
        fontWeight: '600',
        color: textColor,
        margin: 0,
      };
    },
    closeVariantFormStyle() {
      return {
        padding: '4px 8px',
        border: 'none',
        background: 'none',
        fontSize: '20px',
        cursor: 'pointer',
        color: mutedColor,
      };
    },
    variantFormGridStyle() {
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      };
    },
    dimensionsSectionStyle() {
      return {
        marginBottom: '16px',
      };
    },
    dimensionsGridStyle() {
      return {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginTop: '8px',
      };
    },
    dimensionInputGroupStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: mutedColor,
      };
    },
    dimensionInputStyle() {
      return {
        flex: 1,
        padding: '8px 10px',
        border: `1px solid ${borderColor}`,
        borderRadius: '6px',
        fontSize: '13px',
        outline: 'none',
        width: '100%',
      };
    },
    movementSectionStyle() {
      return {
        marginBottom: '16px',
      };
    },
    checkboxGroupStyle() {
      return {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        marginTop: '8px',
      };
    },
    checkboxLabelStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: textColor,
        cursor: 'pointer',
      };
    },
    checkboxInputStyle() {
      return {
        width: '16px',
        height: '16px',
        accentColor: primaryColor,
      };
    },
    variantFormActionsStyle() {
      return {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
      };
    },
    variantCancelButtonStyle() {
      return {
        padding: '10px 16px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        fontSize: '13px',
        cursor: 'pointer',
        color: textColor,
      };
    },
    variantSaveButtonStyle() {
      return {
        padding: '10px 16px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: primaryColor,
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
      };
    },
    variantsListStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      };
    },
    variantCardStyle() {
      return {
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
      };
    },
    variantCardHeaderStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease',
      };
    },
    variantInfoStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      };
    },
    variantThumbnailStyle() {
      return {
        width: '44px',
        height: '44px',
        borderRadius: '8px',
        objectFit: 'cover',
        backgroundColor: '#f1f5f9',
      };
    },
    variantPlaceholderStyle() {
      return {
        width: '44px',
        height: '44px',
        borderRadius: '8px',
        backgroundColor: '#f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: mutedColor,
      };
    },
    variantNameStyle() {
      return {
        fontSize: '14px',
        fontWeight: '500',
        color: textColor,
        margin: '0 0 2px',
      };
    },
    variantSkuStyle() {
      return {
        fontSize: '12px',
        color: mutedColor,
        margin: 0,
      };
    },
    variantActionsStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: mutedColor,
      };
    },
    removeVariantButtonStyle() {
      return {
        padding: '6px',
        border: 'none',
        borderRadius: '6px',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    },
    variantDetailsStyle() {
      return {
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderTop: `1px solid ${borderColor}`,
      };
    },
    emptyVariantsStyle() {
      return {
        textAlign: 'center',
        padding: '48px 20px',
        color: mutedColor,
      };
    },
    emptySubtextStyle() {
      return {
        fontSize: '13px',
        marginTop: '4px',
      };
    },
    formActionsStyle() {
      return {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        padding: '20px 24px',
        borderTop: `1px solid ${borderColor}`,
        backgroundColor: '#f8fafc',
      };
    },
    cancelButtonStyle() {
      return {
        padding: '12px 24px',
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        color: textColor,
      };
    },
    submitButtonStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: primaryColor,
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
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

.variant-card-header:hover {
  background-color: #f8fafc;
}
</style>
