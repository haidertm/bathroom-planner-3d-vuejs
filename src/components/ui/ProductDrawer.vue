<template>
  <div>
    <!-- Product Drawer Overlay -->
    <div
        v-if="isOpen"
        :style="overlayStyle"
        @click="closeDrawer"
    ></div>

    <!-- Product Drawer -->
    <div :style="drawerStyle">
      <!-- Header -->
      <div :style="headerStyle">
        <button
            v-if="currentView === 'variants'"
            @click="goBackToProductList"
            :style="backButtonStyle"
            class="back-button"
        >
          ← Back to Products
        </button>
        <button
            v-else
            @click="closeDrawer"
            :style="backButtonStyle"
            class="back-button"
        >
          ← Go back
        </button>

        <h2 :style="titleStyle">
          {{ currentView === 'variants' ? 'Select Options' : selectedCategory }}
        </h2>

        <button
            @click="closeDrawer"
            :style="closeButtonStyle"
            class="close-button"
        >
          ✕
        </button>
      </div>

      <!-- Loading Error Display -->
      <div v-if="loadingError" :style="errorBannerStyle">
        <span>{{ loadingError }}</span>
        <button @click="$emit('retry-loading')" :style="retryButtonStyle">
          Retry
        </button>
      </div>

      <!-- PROGRESSIVE LOADING: Show ready products + skeletons for loading ones -->
      <div v-if="currentView === 'products'" :style="contentStyle">

        <!-- Show products that are ready (models loaded) -->
        <div
            v-for="product in readyProducts"
            :key="product.id"
            :style="productCardStyle"
            class="product-card"
        >
          <!-- Product Image -->
          <div :style="productImageStyle">
            <img :src="product.image" :alt="product.name" :style="imageStyle" />
          </div>

          <!-- Product Info -->
          <div :style="productInfoStyle">
            <div :style="brandStyle">{{ product.brand }}</div>
            <h3 :style="productNameStyle">{{ product.name }}</h3>
            <div :style="priceStyle">£{{ product.price }}</div>

            <!-- More Info Link -->
            <a :href="product.link" :style="moreInfoStyle" class="more-info-link" target="_blank">
              More info ↗
            </a>

            <!-- SELECT Button (original functionality) -->
            <button
                @click="selectProduct(product)"
                :style="addToRoomButtonStyle"
                class="select-button"
            >
              Add to Room
            </button>
          </div>
        </div>

        <!-- Show skeleton loaders for products still loading -->
        <div
            v-for="n in getLoadingProductCount()"
            :key="`skeleton-${n}`"
            :style="skeletonCardStyle"
            class="skeleton-card"
        >
          <!-- Skeleton Image -->
          <div :style="skeletonImageStyle">
            <div :style="skeletonShimmerStyle"></div>
          </div>

          <!-- Skeleton Content -->
          <div :style="skeletonContentStyle">
            <div :style="skeletonLineStyle"></div>
            <div :style="skeletonLineStyle"></div>
            <div :style="skeletonLineStyle"></div>
            <div :style="skeletonLineStyle"></div>
            <div :style="skeletonButtonStyle"></div>
          </div>
        </div>

        <!-- Loading progress indicator (optional) -->
        <div v-if="isAnythingLoading()" :style="loadingProgressStyle">
          <div :style="loadingSpinnerStyle"></div>
          <span>Loading {{ getLoadingProductCount() }} more products...</span>
        </div>

      </div>

      <!-- VARIANTS VIEW - Original Design -->
      <div v-else-if="currentView === 'variants'" :style="variantsContentStyle">
        <!-- Product Summary -->
        <div :style="productSummaryStyle">
          <div :style="productImageStyle">
            <img :src="getDisplayImage()" :alt="getDisplayName()" :style="imageStyle" />
          </div>
          <div :style="productInfoStyle">
            <h3 :style="productNameStyle">{{ getDisplayName() }}</h3>
            <div :style="brandStyle"><span style="font-weight: bold;">sku:</span> {{ getDisplaySku() }}</div>
            <div :style="priceStyle">£{{ getDisplayPrice() }}</div>
            <a :href="getLink()" :style="moreInfoStyle" class="more-info-link" target="_blank">
              More info ↗
            </a>
          </div>
        </div>

        <!-- Variants Selection (if product has variants) -->
        <div v-if="selectedProduct.variants && selectedProduct.variants.length > 0" :style="sectionStyle">
          <h4 :style="sectionTitleStyle">{{ selectedProduct.variantType || 'Size' }}</h4>
          <div :style="variantOptionsStyle">
            <button
                v-for="(variant, index) in selectedProduct.variants"
                :key="`variant-${index}`"
                @click="selectVariant(variant)"
                :style="getVariantButtonStyle(variant)"
                :disabled="isVariantLoadingState(variant) || isVariantLoading"
                class="variant-button"
            >
              <div
                  v-if="isVariantLoadingState(variant)"
                  :style="variantSpinnerStyle"
                  class="variant-spinner"
              ></div>

              <span :style="{ opacity: isVariantLoadingState(variant) ? 0 : 1 }">
        {{ variant.name }}
      </span>
            </button>
          </div>

          <div
              v-if="isVariantLoading"
              :style="variantLoadingIndicatorStyle"
              class="variant-loading-indicator"
          >
            <div :style="loadingSpinnerStyle"></div>
            <span>Loading variant options...</span>
          </div>
        </div>

        <!-- Color Selection (if product has colors) -->
        <div v-if="selectedProduct.colors && selectedProduct.colors.length > 0" :style="sectionStyle">
          <h4 :style="sectionTitleStyle">Color: {{ getSelectedColorName() }}</h4>
          <div :style="colorOptionsStyle">
            <div
                v-for="color in selectedProduct.colors"
                :key="color.id"
                @click="selectColor(color.id)"
                :style="getColorSwatchStyle(color)"
                class="color-swatch"
                :title="color.name"
            >
              <div :style="colorInnerStyle(color)"></div>
              <span :style="colorNameStyle">{{ color.name }}</span>
            </div>
          </div>
        </div>

        <!-- Hardware Section (if product has hardware) -->
        <div v-if="selectedProduct.hardware && selectedProduct.hardware.length > 0" :style="sectionStyle">
          <h4 :style="sectionTitleStyle">Included Hardware</h4>
          <div
              v-for="hardware in selectedProduct.hardware"
              :key="hardware.id"
              :style="hardwareItemStyle"
          >
            <div :style="hardwareIconStyle">🔧</div>
            <div :style="hardwareInfoStyle">
              <h5 :style="hardwareNameStyle">{{ hardware.name }}</h5>
              <div :style="hardwareBrandStyle">{{ hardware.brand }}</div>
              <div :style="hardwarePriceStyle">£{{ hardware.price }}</div>
              <button
                  @click="toggleHardwareChange(hardware.id)"
                  :style="hardwareChangeButtonStyle"
                  class="hardware-change-button"
              >
                🔄 Change
              </button>
            </div>
          </div>
        </div>

        <!-- Total Price Summary -->
        <div :style="priceSummaryStyle">
          <div :style="totalPriceLabelStyle">Total Price:</div>
          <div :style="totalPriceStyle">£{{ getTotalPrice() }}</div>
        </div>

        <!-- Action Buttons -->
        <div :style="actionButtonsStyle">
          <button
              @click="goBackToProductList"
              :style="backToCatalogueButtonStyle"
              class="back-to-catalogue-button"
          >
            BACK TO CATALOGUE
          </button>

          <button
              @click="confirmAddToRoom"
              :style="confirmAddButtonStyle"
              class="confirm-add-button"
          >
            ADD TO ROOM
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { isMobile } from '../../utils/helpers.js'
import productData from '../../mocks/productData'
import { ModelManager } from '../../models/bathroomFixtures.ts'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  selectedCategory: {
    type: String,
    default: ''
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  loadingError: {
    type: String,
    default: ''
  },
  // NEW: Progressive loading props
  loadedProducts: {
    type: Set,
    default: null,
    validator: (value) => value instanceof Set
  },
  failedProducts: {
    type: Set,
    default: null,
    validator: (value) => value instanceof Set
  },
  productLoadingStates: {
    type: Map,
    default: null,
    validator: (value) => value instanceof Map
  },
})

// Emits - ADD 'back' event for better control
const emit = defineEmits(['close', 'add-to-room', 'retry-loading'])

// Reactive state
const currentView = ref('products') // 'products' or 'variants'
const selectedProduct = ref(null)
const selectedVariant = ref('')
const selectedColor = ref('')

const variantLoadingStates = ref(new Map()) // Track loading state per variant
const isVariantLoading = ref(false) // General variant loading state

// Reset view when drawer opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    currentView.value = 'products'
    selectedProduct.value = null
  }
})

// Initialize selections when product changes
watch(() => selectedProduct.value, (newProduct) => {
  if (newProduct) {
    selectedVariant.value = newProduct.variants?.[0] || null
    selectedColor.value = newProduct.colors?.[0]?.id || null  // CORRECT: stores ID
  }
})


// Computed
const isMobileDevice = computed(() => isMobile())

// Methods
const getProductsForCategory = (category) => {
  return productData[category] || []
}

 const readyProducts = computed(() => {
   const all = getProductsForCategory(props.selectedCategory)
   if (!props.isLoading) return all
   return all.filter(p => props.loadedProducts?.has(p.id) ?? false)
 })

const getLoadingProductCount = () => {
  if (!props.isLoading) return 0

  const allProducts = getProductsForCategory(props.selectedCategory)
  const readyCount = readyProducts.value.length
  const failedCount = props.failedProducts?.size ?? 0

  // NEW: Show skeletons for products that are still pending (not loaded AND not failed)
  const pendingCount = Math.max(0, allProducts.length - readyCount - failedCount)
  return Math.min(3, pendingCount) // Still cap at 3 skeletons for UI
}

const isAnythingLoading = () => {
  return props.isLoading && getLoadingProductCount() > 0
}

// Methods - Original functionality
const selectProduct = (product) => {
  console.log('select product>>>', product);
  selectedProduct.value = product
  currentView.value = 'variants'
}

const goBackToProductList = () => {
  currentView.value = 'products'
  selectedProduct.value = null
}

const selectVariant = async (variant) => {
  // Prevent multiple clicks while loading
  if (isVariantLoading.value) return

  const variantKey = variant.id || variant.sku || variant.name

  // Start loading
  isVariantLoading.value = true
  variantLoadingStates.value.set(variantKey, true)

  console.log('🔄 Loading variant model...', variant)
  console.log('📦 Model path:', variant.path)

  try {
    // Get ModelManager instance
    const modelManager = ModelManager.getInstance()

    // Create model configuration object
    const modelConfig = {
      name: variant.sku || variant.name,
      path: variant.path,
      scale: variant.scale || 1.0,
      dimensions: variant.dimensions
    }

    console.log('📦 Loading model with config:', modelConfig)

    // Load the 3D model - this will trigger network request
    const loadedModel = await modelManager.loadModel(variantKey, modelConfig)

    if (loadedModel) {
      console.log('✅ Model loaded successfully:', variantKey)
      console.log('📊 Model details:', {
        name: loadedModel.name,
        children: loadedModel.children.length,
        position: loadedModel.position,
        scale: loadedModel.scale
      })

      // Set the selected variant after successful loading
      selectedVariant.value = variant

      // Optional: You can also preview the model here if needed
      // previewModel(loadedModel)

    } else {
      console.warn('⚠️ Model loading returned null for:', variantKey)
      // Still set the variant even if model loading failed
      selectedVariant.value = variant
    }

  } catch (error) {
    console.error('❌ Failed to load variant model:', error)
    console.error('📍 Error details:', {
      variant: variantKey,
      path: variant.path,
      errorMessage: error.message
    })

    // Still set the variant even if model loading failed
    selectedVariant.value = variant

    // You could show an error message to user here
    // showErrorMessage(`Failed to load ${variant.name}`)

  } finally {
    // Stop loading
    isVariantLoading.value = false
    variantLoadingStates.value.set(variantKey, false)

    console.log('🏁 Variant selection complete for:', variantKey)
  }
}

const isVariantLoadingState = (variant) => {
  const variantKey = variant.id || variant.sku || variant.name
  return variantLoadingStates.value.get(variantKey) || false
}

// New display functions for variants
const getDisplayImage = () => {
  if (selectedVariant.value && selectedVariant.value.image) {
    return selectedVariant.value.image
  }
  return selectedProduct.value?.image || ''
}
const getTotalPrice = () => {
  return getDisplayPrice();
}

const getDisplayName = () => {
  if (selectedVariant.value && selectedVariant.value.title) {
    return selectedVariant.value.title
  }
  if (selectedVariant.value && selectedVariant.value.name) {
    return `${selectedProduct.value?.name} - ${selectedVariant.value.name}`
  }
  return selectedProduct.value?.name || ''
}

const getDisplaySku = () => {
  if (selectedVariant.value && selectedVariant.value.sku) {
    return selectedVariant.value.sku
  }
  return selectedProduct.value?.sku || ''
}

const getDisplayPrice = () => {
  if (selectedVariant.value && selectedVariant.value.price) {
    return selectedVariant.value.price
  }
  return selectedProduct.value?.price || ''
}

const getLink = () => {
  if (selectedVariant.value && selectedVariant.value.link) {
    return selectedVariant.value.link
  }
  return selectedProduct.value?.link || ''
}

const selectColor = (colorId) => {
  selectedColor.value = colorId
}

const getSelectedColorName = () => {
  if (!selectedProduct.value || !selectedProduct.value.colors) return ''
  const color = selectedProduct.value.colors.find(c => c.id === selectedColor.value)
  return color?.name || ''
}

const toggleHardwareChange = (hardwareId) => {
  console.log('Toggle hardware change for:', hardwareId)
}

const calculateTotalPrice = () => {
  if (!selectedProduct.value) return '0.00'

  let total = parseFloat(selectedProduct.value.price)

  if (selectedProduct.value.hardware) {
    selectedProduct.value.hardware.forEach(hw => {
      total += parseFloat(hw.price)
    })
  }

  return total.toFixed(2)
}

const confirmAddToRoom = () => {
  if (!selectedProduct.value) {
    console.log('No Product has been selected');
    return
  }

  if (!selectedVariant.value) {
    console.log('No Variant for the product has been selected');
    return
  }

  if (typeof selectedVariant.value === 'string') {
    console.log('select variant type is string');
    return;
  }

  //SelectedCategory
  const componentType = props.selectedCategory;

  const productData = {
    type: componentType,
    product: selectedProduct.value,
    selectedVariant: selectedVariant.value,
    selectedColor: selectedColor.value,
    totalPrice: calculateTotalPrice()
  }

  console.log('productData toBe added>>>>', productData);

  console.log('UnifiedProductDrawer: Adding to room:', productData)
  emit('add-to-room', productData)
}

const closeDrawer = () => {
  emit('close')
}

// Dynamic styles methods for variants
const getVariantButtonStyle = (variant) => {
  const isSelected = selectedVariant.value === variant
  const isLoading = isVariantLoadingState(variant)

  return {
    padding: '12px 16px',
    border: isSelected ? '2px solid #29275B' : '2px solid #e0e0e0',
    borderRadius: '6px',
    backgroundColor: isSelected ? '#f0f8f0' : '#ffffff',
    color: isSelected ? '#29275B' : '#333',
    cursor: isLoading || isVariantLoading.value ? 'not-allowed' : 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    opacity: isLoading ? 0.7 : 1,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    minWidth: '60px'
  }
}

const variantSpinnerStyle = computed(() => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '16px',
  height: '16px',
  border: '2px solid #f3f3f3',
  borderTop: '2px solid #29275B',
  borderRadius: '50%',
  animation: 'variant-spin 1s linear infinite',
  zIndex: 1
}))

const variantLoadingIndicatorStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px',
  backgroundColor: '#f8f9fa',
  borderRadius: '6px',
  border: '1px solid #e9ecef',
  color: '#666',
  fontSize: '14px',
  marginTop: '12px'
}))

const getColorSwatchStyle = (color) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  padding: '12px',
  border: selectedColor.value === color.id ? '2px solid #29275B' : '2px solid #e0e0e0',
  borderRadius: '8px',
  backgroundColor: selectedColor.value === color.id ? '#f0f8f0' : '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
})

const colorInnerStyle = (color) => ({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: color.color,
  border: '2px solid #e0e0e0',
  boxShadow: selectedColor.value === color.id ? '0 0 0 2px rgba(76, 175, 80, 0.2)' : 'none'
})

// ORIGINAL STYLES - Keeping your exact design
const overlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1800,
  opacity: props.isOpen ? '1' : '0',
  visibility: props.isOpen ? 'visible' : 'hidden',
  transition: 'opacity 0.3s ease, visibility 0.3s ease'
}))

const drawerStyle = computed(() => ({
  position: 'fixed',
  top: isMobileDevice.value ? '0' : '60px',
  left: '0',
  maxHeight: isMobileDevice.value ? '100vh' : 'calc(100vh - 60px)',
  height: isMobileDevice.value ? '100vh' : 'calc(100vh - 60px)',
  width: isMobileDevice.value ? '100vw' : '500px',
  maxWidth: '100vw',
  backgroundColor: currentView.value === 'variants' ? '#ffffff' : '#f5f5f5',
  zIndex: 1900,
  transform: props.isOpen ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'Arial, sans-serif',
  boxShadow: '2px 0 20px rgba(0, 0, 0, 0.15)',
  paddingBottom: isMobileDevice.value ? '20px' : '40px'
}))

const headerStyle = computed(() => ({
  backgroundColor: currentView.value === 'variants' ? '#29275B' : '#ffffff',
  color: currentView.value === 'variants' ? 'white' : '#333',
  padding: '20px',
  borderBottom: currentView.value === 'variants' ? 'none' : '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  position: 'sticky',
  top: 0,
  zIndex: 10
}))

const backButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: currentView.value === 'variants' ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
  color: currentView.value === 'variants' ? 'white' : '#666',
  fontSize: '14px',
  cursor: 'pointer',
  padding: '8px 12px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  transition: 'background-color 0.2s ease',
  fontFamily: 'Arial, sans-serif'
}))

const titleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '18px' : '20px',
  fontWeight: 'bold',
  color: currentView.value === 'variants' ? 'white' : '#333',
  fontFamily: 'Arial, sans-serif'
}))

const closeButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: currentView.value === 'variants' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid #e0e0e0',
  color: currentView.value === 'variants' ? 'white' : '#666',
  fontSize: '18px',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Arial, sans-serif'
}))

const contentStyle = computed(() => ({
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: currentView.value === 'variants' ? '25px' : '20px'
}))

// Product List Styles
const productCardStyle = computed(() => ({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  gap: '15px',
  position: 'relative',
  transition: 'box-shadow 0.2s ease',
  flexDirection: isMobileDevice.value ? 'column' : 'row'
}))

const productImageStyle = computed(() => ({
  width: isMobileDevice.value ? '100%' : currentView.value === 'variants' ? '120px' : '200px',
  height: isMobileDevice.value ? '150px' : currentView.value === 'variants' ? '120px' : '150px',
  flexShrink: 0,
  borderRadius: '4px',
  overflow: 'hidden',
  backgroundColor: '#f8f8f8'
}))

const imageStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}))

const productInfoStyle = computed(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: currentView.value === 'variants' ? '8px' : '10px'
}))

const brandStyle = computed(() => ({
  fontSize: currentView.value === 'variants' ? '12px' : '14px',
  color: '#666',
  fontWeight: '500',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: 'Arial, sans-serif'
}))

const productNameStyle = computed(() => ({
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0',
  lineHeight: currentView.value === 'variants' ? '1.3' : '1.4',
  fontFamily: 'Arial, sans-serif'
}))

const priceStyle = computed(() => ({
  fontSize: currentView.value === 'variants' ? '18px' : '20px',
  fontWeight: 'bold',
  color: '#e74c3c',
  fontFamily: 'Arial, sans-serif'
}))

const moreInfoStyle = computed(() => ({
  fontSize: '14px',
  color: '#007bff',
  textDecoration: 'none',
  fontWeight: '500',
  alignSelf: 'flex-start',
  fontFamily: 'Arial, sans-serif'
}))

const addToRoomButtonStyle = computed(() => ({
  backgroundColor: '#29275B',
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  marginTop: '10px',
  alignSelf: 'flex-start',
  fontFamily: 'Arial, sans-serif'
}))

const skeletonCardStyle = computed(() => ({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: isMobileDevice.value ? 'column' : 'row',
  gap: '15px',
  position: 'relative',
  overflow: 'hidden'
}))

const skeletonImageStyle = computed(() => ({
  width: isMobileDevice.value ? '100%' : '200px',
  height: '150px',
  backgroundColor: '#f0f0f0',
  borderRadius: '8px',
  position: 'relative',
  overflow: 'hidden'
}))

const skeletonShimmerStyle = computed(() => ({
  position: 'absolute',
  top: '0',
  left: '-100%',
  width: '100%',
  height: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
  animation: 'shimmer 1.5s infinite'
}))

const skeletonContentStyle = computed(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
}))

const skeletonLineStyle = computed(() => ({
  height: '20px',
  backgroundColor: '#f0f0f0',
  borderRadius: '6px',
  width: isMobileDevice.value ? '70%' : '90%',
  marginTop: '8px'
}))

const skeletonButtonStyle = computed(() => ({
  height: '36px',
  backgroundColor: '#f0f0f0',
  borderRadius: '4px',
  width: '135px',
  marginTop: '8px'
}))

const loadingSpinnerStyle = computed(() => ({
  width: '20px',
  height: '20px',
  border: '2px solid #e0e0e0',
  borderTop: '2px solid #007bff',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
}))

const loadingProgressStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '16px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#666',
  justifyContent: 'center',
  marginTop: '10px'
}))

// Error Styles
const errorBannerStyle = computed(() => ({
  backgroundColor: '#fee',
  border: '1px solid #fcc',
  color: '#c33',
  padding: '12px 20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '14px'
}))

const retryButtonStyle = computed(() => ({
  backgroundColor: '#c33',
  color: 'white',
  border: 'none',
  padding: '6px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px'
}))

// Variants View Styles (Original)
const variantsContentStyle = computed(() => ({
  flex: 1,
  overflowY: 'auto',
  padding: '25px',
  display: 'flex',
  flexDirection: 'column',
  gap: '25px'
}))

const productSummaryStyle = computed(() => ({
  display: 'flex',
  gap: '15px',
  padding: '15px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e9ecef',
  flexDirection: isMobileDevice.value ? 'column' : 'row'
}))

const sectionStyle = computed(() => ({
  padding: '0'
}))

const sectionTitleStyle = computed(() => ({
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 15px 0',
  fontFamily: 'Arial, sans-serif'
}))

const variantOptionsStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
}))

const colorOptionsStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: isMobileDevice.value ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
  gap: '12px'
}))

const colorNameStyle = computed(() => ({
  fontSize: '12px',
  color: '#333',
  fontWeight: '500',
  textAlign: 'center',
  fontFamily: 'Arial, sans-serif'
}))

const hardwareItemStyle = computed(() => ({
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  padding: '15px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e9ecef'
}))

const hardwareIconStyle = computed(() => ({
  fontSize: '20px',
  color: '#666',
  flexShrink: 0,
  marginTop: '2px'
}))

const hardwareInfoStyle = computed(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
}))

const hardwareNameStyle = computed(() => ({
  fontSize: '14px',
  fontWeight: '600',
  color: '#333',
  margin: '0',
  fontFamily: 'Arial, sans-serif'
}))

const hardwareBrandStyle = computed(() => ({
  fontSize: '12px',
  color: '#666',
  fontWeight: '500',
  fontFamily: 'Arial, sans-serif'
}))

const hardwarePriceStyle = computed(() => ({
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#e74c3c',
  fontFamily: 'Arial, sans-serif'
}))

const hardwareChangeButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: '1px solid #29275B',
  color: '#29275B',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  alignSelf: 'flex-start',
  marginTop: '5px',
  fontFamily: 'Arial, sans-serif'
}))

const priceSummaryStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  backgroundColor: '#29275B',
  color: 'white',
  borderRadius: '8px',
  fontFamily: 'Arial, sans-serif'
}))

const totalPriceLabelStyle = computed(() => ({
  fontSize: '16px',
  fontWeight: '500',
  fontFamily: 'Arial, sans-serif'
}))

const totalPriceStyle = computed(() => ({
  fontSize: '24px',
  fontWeight: 'bold',
  fontFamily: 'Arial, sans-serif'
}))

const actionButtonsStyle = computed(() => ({
  display: 'flex',
  gap: '10px',
  marginTop: '10px',
  flexDirection: isMobileDevice.value ? 'column' : 'row'
}))

const backToCatalogueButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: '1px solid #666',
  color: '#666',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flex: isMobileDevice.value ? '1' : '0 0 auto',
  fontFamily: 'Arial, sans-serif'
}))

const confirmAddButtonStyle = computed(() => ({
  backgroundColor: '#29275B',
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  flex: '1',
  fontFamily: 'Arial, sans-serif'
}))
</script>

<style scoped>
/* Hover effects */
.product-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

.back-button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.select-button:hover {
  background-color: #1e1a4a !important;
}

.variant-button:hover {
  border-color: #29275B !important;
  background-color: #f0f8f0 !important;
}

.color-swatch:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.hardware-change-button:hover {
  background-color: #29275B !important;
  color: white !important;
}

.confirm-add-button:hover {
  background-color: #29275B !important;
}

.back-to-catalogue-button:hover {
  background-color: #f8f9fa !important;
  border-color: #333 !important;
}

.more-info-link:hover {
  text-decoration: underline !important;
}

/* Loading animations */
@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>