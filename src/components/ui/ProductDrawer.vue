<template>
  <div>
    <div v-if="isSingleProductSearchMode" style="padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
        <h3 style="font-size: 24px; font-weight: 600; color: #29275B; margin: 0; font-family: Arial, sans-serif;">Product Found</h3>
        <div style="background-color: #10b981; color: #ffffff; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;" aria-label="Exact SKU match">Exact Match</div>
      </div>

      <div
          v-for="product in readyProducts"
          :key="product.id"
          style="background-color: #ffffff; border: 2px solid #f0f0f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);"
      >
        <!-- Product Image -->
        <div style="width: 100%; height: 300px; overflow: hidden; background-color: #f8fafc; display: flex; align-items: center; justify-content: center;">
          <img
              :src="product.image"
              :alt="product.name"
              style="width: 100%; height: 100%; object-fit: cover;"
              loading="lazy"
          />
        </div>

        <!-- Product Details -->
        <div style="padding: 24px;">
          <h4 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 12px; line-height: 1.4; font-family: Arial, sans-serif;">{{ product.name }}</h4>

          <div v-if="product.searchContext.matchingVariant?.sku" style="font-size: 14px; color: #6b7280; margin-bottom: 8px; padding: 8px 12px; background-color: #f3f4f6; border-radius: 8px; font-family: monospace;">
            <strong>SKU:</strong> {{ product.searchContext.matchingVariant.sku }}
          </div>

          <div v-if="product.searchContext.matchingVariant?.dimensions" style="font-size: 14px; color: #6b7280; margin-bottom: 12px; padding: 8px 12px; background-color: #f9fafb; border-radius: 8px;">
            <strong>Dimensions:</strong>
            {{ formatDimensions(product.searchContext.matchingVariant.dimensions) }}
          </div>

          <div style="font-size: 28px; font-weight: 700; color: #29275B; margin-bottom: 16px; font-family: Arial, sans-serif;">£{{ product.price }}</div>
        </div>

        <!-- Action Buttons -->
        <div style="padding: 20px 24px; border-top: 1px solid #f0f0f0; background-color: #f9fafb; display: flex; gap: 12px; align-items: center;">
          <a
              :href="product.link"
              style="display: flex; align-items: center; gap: 6px; color: #6b7280; text-decoration: none; font-size: 14px; font-weight: 500; padding: 10px 16px; border-radius: 8px; border: 1px solid #d1d5db; background-color: #ffffff; transition: all 0.2s ease; font-family: Arial, sans-serif;"
              target="_blank"
              rel="noopener noreferrer"
          >
            View Details
          </a>

          <button
              @click="handleDirectAddToRoom(product)"
              style="display: flex; align-items: center; justify-content: center; gap: 8px; background-color: #29275B; color: #ffffff; border: none; border-radius: 10px; padding: 14px 24px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(41, 39, 91, 0.3); flex: 1; min-height: 50px; font-family: Arial, sans-serif;"
          >
            Add to Room
          </button>
        </div>
      </div>
    </div>
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

        <h2 :style="titleStyle" v-html="drawerTitle" />

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
            <h3 :style="productNameStyle" v-html="getHighlightedName(product)">
            </h3>
            <div v-if="product.searchContext" :style="searchContextStyle">
              <div v-if="product.searchContext.matchingVariant" :style="searchVariantStyle">
                SKU: {{ product.searchContext.matchingVariant.sku }}
              </div>
            </div>
            <div :style="priceStyle">
              <span v-if="hasMultiplePrices(product)" style="font-size: 18px; font-weight: normal; color: #666; margin-right: 4px;">From</span>£{{ getLowestVariantPrice(product) }}
            </div>

            <!-- More Info Link -->
            <a :href="product.link" :style="moreInfoStyle" class="more-info-link" target="_blank" rel="noopener noreferrer">
              More info ↗
            </a>

            <!-- SELECT Button (original functionality) -->
            <button
                @click="selectProduct(product)"
                :style="getSearchAwareButtonStyle(product)"
                class="select-button"
            >
              {{ getButtonText(product) }}
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
            <a :href="getLink()" :style="moreInfoStyle" class="more-info-link" target="_blank" rel="noopener noreferrer">
              More info ↗
            </a>
          </div>
        </div>

        <!-- Variants Selection (if product has variants) -->
        <div v-if="selectedProduct.variants && selectedProduct.variants.length > 0" :style="sectionStyle">
          <h4 :style="sectionTitleStyle">{{ selectedProduct.variantType || 'Size' }}</h4>
          <div :style="variantOptionsStyle">
            <button
                v-for="(variant, index) in displayedVariants"
                :key="variant.id || variant.sku || variant.name || index"
                @click="selectVariant(variant)"
                :style="getVariantButtonStyle(variant)"
                class="variant-button"
                :title="isVariantTooLarge(variant) ? getTooLargeTooltip(variant) : ''"
            >
              <span :style="{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }">
                <span>{{ variant.name }}</span>
                <!-- Show too large badge for variants that don't fit -->
                <span v-if="isVariantTooLarge(variant)" :style="tooLargeBadgeStyle">
                  ⚠ Too Large
                </span>
              </span>
            </button>
          </div>

          <!-- See More / See Less Button -->
          <div
              v-if="shouldShowSeeMoreButton"
              :style="seeMoreContainerStyle"
          >
            <button
                @click="toggleShowAllVariants"
                :style="seeMoreButtonStyle"
                class="see-more-button"
            >
              {{ showAllVariants ? 'See Less' : `See More (${selectedProduct.variants.length - 5} more)` }}
              <span :style="{ marginLeft: '8px' }">
            {{ showAllVariants ? '↑' : '↓' }}
          </span>
            </button>
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

        <!-- Action Button -->
        <div :style="actionButtonsStyle">
          <button
              @click="confirmAddToRoom"
              :style="confirmAddButtonStyle"
              class="confirm-add-button"
              :disabled="isVariantTooLarge(selectedVariant)"
          >
            ADD TO ROOM
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, watch} from 'vue'
import { isMobile } from '../../utils/helpers.js'
import localProductData from '../../mocks/productData'
import { ModelManager } from '../../models/bathroomFixtures'
import {
  isVariantModelLoaded,
  isModelCached,
  isVariantModelLoadedWithCache,
  loadVariantModelProgressively
} from '../../utils/modelLoader'
import { findFreeWallPosition } from '../../utils/constraints'
import { getMovementConfig } from '../../utils/models'

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
  searchResults: {
    type: [Array, Object], // Allow both Array and Object (for reactive refs)
    default: () => [],
    validator: (value) => {
      // Allow arrays, reactive refs, or null/undefined
      return Array.isArray(value) ||
          value === null ||
          value === undefined ||
          (typeof value === 'object' && value !== null)
    }
  },
  searchQuery: {
    type: String,
    default: ''
  },
  searchTriggered: {
    type: Number,
    default: 0
  },
  // Constraint checking props
  roomWidth: {
    type: Number,
    default: 300
  },
  roomHeight: {
    type: Number,
    default: 250
  },
  existingItems: {
    type: Array,
    default: () => []
  },
  notchWidth: {
    type: Number,
    default: 0
  },
  notchHeight: {
    type: Number,
    default: 0
  },
  productData: {
    type: Object,
    default: () => JSON.parse(JSON.stringify(localProductData))
  }
})

// Emits - ADD 'back' event for better control
const emit = defineEmits(['close', 'add-to-room', 'retry-loading'])

// Reactive state
const currentView = ref('products') // 'products' or 'variants'
const selectedProduct = ref(null)
const selectedVariant = ref('')
const selectedColor = ref('')

const firstVariantPreloaded = ref(new Map()) // Track which products have preloaded first variants
const productPreloading = ref(new Map()) // Track which products are currently preloading

const showAllVariants = ref(false)

// Add this computed property for filtered variants
const displayedVariants = computed(() => {
  if (!selectedProduct.value?.variants) return []

  const variants = selectedProduct.value.variants

  // If we have 5 or fewer variants, show all
  if (variants.length <= 5) {
    return variants
  }

  // If "See More" hasn't been clicked, show only first 5
  if (!showAllVariants.value) {
    return variants.slice(0, 5)
  }

  // Otherwise show all variants
  return variants
})

// Check if we should show the "See More" button
const shouldShowSeeMoreButton = computed(() => {
  return selectedProduct.value?.variants?.length > 5
})

// Function to toggle showing all variants
const toggleShowAllVariants = () => {
  showAllVariants.value = !showAllVariants.value
}

// Reset showAllVariants when product changes
watch(() => selectedProduct.value, () => {
  showAllVariants.value = false
})

// Check if variant is too large or would collide with existing items
const isVariantTooLarge = (variant) => {
  if (!variant?.dimensions) return false

  const variantWidth = variant.dimensions.width || 0
  const variantDepth = variant.dimensions.depth || 0
  const maxVariantDim = Math.max(variantWidth, variantDepth)
  const maxWallLength = Math.max(props.roomWidth, props.roomHeight)

  // First check: Does it fit in room dimensions?
  if (maxVariantDim > maxWallLength) return true

  // Get the category for movement config lookup
  const category = selectedProduct.value?.category ||
                   selectedProduct.value?.searchContext?.category ||
                   props.selectedCategory

  // Get objectType from category - preserve camelCase if already capitalized
  const objectType = category && category !== 'search'
    ? (category.charAt(0) === category.charAt(0).toUpperCase()
        ? category  // Already properly capitalized (e.g., "WindowAndDoor", "TowelRails")
        : category.charAt(0).toUpperCase() + category.slice(1))  // Capitalize first letter
    : null

  // Check if the new variant is wall-mounted at height (radiators, mirrors, towel rails)
  // These items don't occupy floor space and can be placed above floor-level items
  const variantMovement = variant.movement || (objectType ? getMovementConfig(objectType) : null)
  const isWallMountedAtHeight = variantMovement?.allowVerticalMovement === true ||
                                 (variant.spawnHeight && variant.spawnHeight > 50)

  // Second check: Is there enough floor space considering existing items?
  // Skip this check for wall-mounted items that can be placed at height
  if (!isWallMountedAtHeight && props.existingItems && props.existingItems.length > 0) {
    // Calculate total floor area used by existing items (with buffer)
    // Only count floor-mounted items, not wall-mounted items at height
    const buffer = 20 // 20cm buffer around each item
    let usedFloorArea = 0

    for (const item of props.existingItems) {
      if (item.variant?.dimensions) {
        // Check if existing item is wall-mounted at height
        const itemMovement = item.variant?.movement || (item.type ? getMovementConfig(item.type) : null)
        const itemIsWallMountedAtHeight = itemMovement?.allowVerticalMovement === true ||
                                           (item.variant?.spawnHeight && item.variant.spawnHeight > 50)

        // Only count floor-mounted items in floor area calculation
        if (!itemIsWallMountedAtHeight) {
          const itemWidth = (item.variant.dimensions.width || 0) + buffer * 2
          const itemDepth = (item.variant.dimensions.depth || 0) + buffer * 2
          usedFloorArea += itemWidth * itemDepth
        }
      }
    }

    // Calculate available floor area
    const totalFloorArea = props.roomWidth * props.roomHeight
    const variantArea = (variantWidth + buffer * 2) * (variantDepth + buffer * 2)
    const remainingArea = totalFloorArea - usedFloorArea

    // If variant area is larger than remaining area, it won't fit
    if (variantArea > remainingArea) return true
  }

  // Third check: Can it be placed without collision using findFreeWallPosition?
  if (!category || category === 'search' || !objectType) return false

  // Check if a valid position exists using findFreeWallPosition
  // Pass variant as model so dimensions can be looked up directly (for database products)
  const freePosition = findFreeWallPosition(
    props.roomWidth,
    props.roomHeight,
    objectType,
    1.0, // scale
    props.existingItems,
    50, // maxAttempts
    variant.orientation,
    variant.movement,
    variant.spawnHeight,
    variant.floorOffset,
    variant.sku,
    props.notchWidth,
    props.notchHeight,
    variant // Pass variant as model - it has dimensions property
  )

  // If no valid position found, variant is too large/no space
  return freePosition === null
}

const getTooLargeTooltip = (variant) => {
  if (!variant?.dimensions) return ''
  if (!isVariantTooLarge(variant)) return ''

  const maxVariantDim = Math.max(variant.dimensions.width || 0, variant.dimensions.depth || 0)
  const maxWallLength = Math.max(props.roomWidth, props.roomHeight)

  if (maxVariantDim > maxWallLength) {
    return `Item exceeds room size (Requires ${maxVariantDim * 10}mm, Available ${maxWallLength * 10}mm).`
  }

  return 'Not enough space - room is too crowded with existing items.'
}

watch(() => props.searchTriggered, (newValue, oldValue) => {
  if (newValue > oldValue && newValue > 0) {
    // Force reset to products view when search is triggered
    currentView.value = 'products';
    selectedProduct.value = null;
    selectedVariant.value = '';
    selectedColor.value = '';
  }
});

// Reset view when drawer opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // Only reset if not search mode to avoid conflicts
    if (props.selectedCategory !== 'search') {
      currentView.value = 'products';
      selectedProduct.value = null;
      selectedVariant.value = '';
      selectedColor.value = '';
    }
  } else {
    productPreloading.value.clear();
  }
});

const formatDimensions = (d = {}) => {
  const parts = []
  if (d.width != null) parts.push(`${d.width}cm`)
  const useHeightAsDepth = d.depth == null && d.height != null
  if (d.depth != null) parts.push(`${d.depth}cm`)
  else if (useHeightAsDepth) parts.push(`${d.height}cm`)
  if (d.height != null && !useHeightAsDepth) parts.push(`${d.height}cm`)
  return parts.join(' × ')
}

const handleDirectAddToRoom = async (product) => {
  if (!product?.productData) return

  const variant = product?.searchContext?.matchingVariant
  if (!variant) {
    console.warn('No matching variant to add')
    return
  }
  const variantKey = variant.id || variant.sku || variant.name
  const modelManager = ModelManager.getInstance()
  const alreadyLoaded = modelManager.isModelLoaded(variantKey)

  // Load model if needed (progressive loading handles this in background)
  if (!alreadyLoaded && variant.path) {
    try {
      if (!modelManager.isModelLoaded?.(variantKey)) {
        const modelConfig = {
          name: variantKey,
          path: variant.path,
          scale: variant.scale ?? 1.0,
          dimensions: variant.dimensions,
          movement: variant.movement,
          orientation: variant.orientation
        }
        await modelManager.loadModel(variantKey, modelConfig)
      }
    } catch (modelError) {
      console.warn('⚠️ Model loading failed, but continuing:', modelError)
    }
  }

  // Emit add-to-room with progressive loading flag
  emit('add-to-room', {
    ...product.productData,
    fromDirectSearch: true,
    searchQuery: props.searchQuery,
    useProgressiveLoading: !alreadyLoaded
  })

  console.log('✅ Product added directly from search:', variantKey)
  emit('close')
}

// Category display label mapping (component type -> display label)
const categoryDisplayLabels = {
  'Bath': 'Baths',
  'Shower': 'Showers',
  'Toilet': 'Toilets',
  'Furniture': 'Vanities & Basins',
  'Radiator': 'Radiators',
  'TowelRails': 'Heated Towel Rails',
  'Mirror': 'Mirrors',
  'WindowAndDoor': 'Windows & Doors',
  'Plumbing': 'Soil Pipe'
}

const drawerTitle = computed(() => {
  if (props.selectedCategory === 'search') {
    const raw = (props && props.searchResults && 'value' in props.searchResults)
        ? props.searchResults.value
        : props.searchResults
    const count = Array.isArray(raw) ? raw.length : 0
    return `<span style="color:#EC048C">${count} </span> Results Found`
  }

  // Use display label mapping, fallback to category name
  return categoryDisplayLabels[props.selectedCategory] || props.selectedCategory || 'Products'
})

// 4. FIXED search result highlighting that properly handles Vue refs
const getHighlightedName = (product) => {
  const escapeHtml = (s = '') =>
      String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  if (props.selectedCategory === 'search') {
    let searchQuery = props.searchQuery

    if (searchQuery && typeof searchQuery === 'object' && 'value' in searchQuery) {
      searchQuery = searchQuery.value
    }

    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const rawName = product.name || ''
      let result = escapeHtml(rawName)

      const searchTerms = query.split(/\s+/).filter(term => term.length > 0)

      if (searchTerms.length === 1) {
        // Single word - highlight normally
        const term = searchTerms[0]
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escapedTerm})`, 'gi')

        result = result.replace(regex, (match) => {
          return `<span style="color: #EC048C; font-weight: 600;">${match}</span>`
        })
      } else {
        // Multiple words - look for phrase patterns

        // Try exact phrase first
        const exactPhrase = query
        const exactRegex = new RegExp(`(${exactPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')

        if (rawName.toLowerCase().includes(exactPhrase.toLowerCase())) {
          result = result.replace(exactRegex, (match) => {
            return `<span style="color: #EC048C; font-weight: 600;">${match}</span>`
          })
        } else {
          // Try phrase with up to 2 words between search terms
          const firstWord = searchTerms[0]
          const lastWord = searchTerms[searchTerms.length - 1]

          // Pattern: word1 (0-2 words) word2
          const flexiblePattern = `(${firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+\\w+){0,2}\\s+${lastWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
          const flexibleRegex = new RegExp(flexiblePattern, 'gi')

          const flexibleMatch = rawName.match(flexibleRegex)
          if (flexibleMatch) {
            result = result.replace(flexibleRegex, (match) => {
              return `<span style="color: #EC048C; font-weight: 600;">${match}</span>`
            })
          }
          // If no flexible match found, don't highlight individual scattered words
        }
      }

      return result
    }
  }

  return escapeHtml(product.name || '')
}


// Get the lowest price from all variants
const getLowestVariantPrice = (product) => {
  if (!product.variants || product.variants.length === 0) {
    return product.price
  }

  const prices = product.variants
      .map(variant => parseFloat(variant.price))
      .filter(price => !isNaN(price))

  if (prices.length === 0) {
    return product.price
  }

  return Math.min(...prices).toFixed(2)
}

// Check if product has multiple different prices across variants
const hasMultiplePrices = (product) => {
  if (!product.variants || product.variants.length <= 1) {
    return false
  }

  const prices = product.variants
      .map(variant => parseFloat(variant.price))
      .filter(price => !isNaN(price))

  const uniquePrices = [...new Set(prices)]
  return uniquePrices.length > 1
}

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
  return props.productData[category] || []
}

const readyProducts = computed(() => {
  // Handle search results
  if (props.selectedCategory === 'search') {

    // Get search results array safely
    let searchResultsArray = []
    try {
      let unwrapped = props.searchResults
      if (unwrapped && typeof unwrapped === 'object' && 'value' in unwrapped) {
        unwrapped = unwrapped.value
      }
      if (Array.isArray(unwrapped)) {
        searchResultsArray = unwrapped
      } else if (unwrapped && typeof unwrapped === 'object' && unwrapped.length !== undefined) {
        searchResultsArray = Array.from(unwrapped)
      }
    } catch (error) {
      console.warn('🔍 Error processing searchResults:', error)
      searchResultsArray = []
    }

    if (searchResultsArray.length === 0) {
      return []
    }

    // Transform search results based on match type
    const transformedResults = searchResultsArray.map((result, index) => {

      const { category, product, matchingVariant, matchType, isExactMatch } = result

      // For EXACT SKU matches - show direct add functionality
      if (isExactMatch && matchType === 'exact_sku' && matchingVariant) {
        return {
          id: matchingVariant.id || matchingVariant.sku,
          name: product.name || matchingVariant.title || matchingVariant.name,
          price: matchingVariant.price || product.price,
          image: matchingVariant.image || product.image,
          link: matchingVariant.link || product.link,
          category: category,

          // Enhanced search context for exact SKU matches
          searchContext: {
            isExactMatch: true,
            matchType: 'exact_sku',
            matchingVariant: matchingVariant,
            originalProduct: product,
            showDirectAdd: true // Direct add for exact SKU matches
          },

          // Product data ready for direct adding
          productData: {
            type: category,
            product: product,
            selectedVariant: matchingVariant,
            selectedColor: product.colors?.[0]?.id || null
          }
        }
      }

      // For NAME matches or partial SKU matches - show regular SELECT button
      return {
        id: product.id,
        name: product.name,
        price: product.price, // Use product base price, not variant price
        image: product.image, // Use product main image
        link: product.link,
        category: category,
        variants: product.variants, // Include variants for selection
        colors: product.colors, // Include colors
        variantType: product.variantType,
        features: product.features,

        // Search context for name/partial matches
        searchContext: {
          isExactMatch: false,
          matchType: matchType,
          matchingVariant: matchingVariant, // Keep for reference
          originalProduct: product,
          showDirectAdd: false, // Show SELECT button instead
          highlightedVariant: matchingVariant // Highlight the matching variant
        },

        // No direct productData - user must select variant first
        productData: null
      }
    })
    return transformedResults
  }

  // Handle regular category products (unchanged)
  const categoryProducts = getProductsForCategory(props.selectedCategory)
  return categoryProducts || []
})

const isSingleProductSearchMode = computed(() => {
   return props.selectedCategory === 'search' &&
       readyProducts.value.length === 1 &&
       readyProducts.value[0]?.searchContext?.isExactMatch === true &&
       readyProducts.value[0]?.searchContext?.matchType === 'exact_sku'
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
const selectProduct = async (product) => {

  // If it's a direct add product (exact SKU match), add directly
  if (product.searchContext?.showDirectAdd) {
    handleDirectAddToRoom(product)
    return
  }

  // Regular product selection flow
  selectedProduct.value = product

  // If there's a highlighted variant from search, pre-select it
  if (product.searchContext?.highlightedVariant) {
    selectedVariant.value = product.searchContext.highlightedVariant
  } else {
    // Default to first variant
    selectedVariant.value = product.variants?.[0] || ''
  }

  selectedColor.value = product.colors?.[0]?.id || ''
  currentView.value = 'variants'

  // Auto-load the first variant when product is selected (in background)
  if (product.variants && product.variants.length > 0 && selectedVariant.value) {
    const firstVariant = selectedVariant.value
    const variantKey = firstVariant.id || firstVariant.sku || firstVariant.name

    // Get the component type for consistent cache key checking
    const componentType = props.selectedCategory !== 'search'
      ? props.selectedCategory
      : (product.category || product.searchContext?.category || '')

    // Check if already loaded/cached - use full key format
    const isAlreadyLoaded = isVariantModelLoaded(firstVariant) || isModelCached(firstVariant, componentType)

    if (!isAlreadyLoaded) {
      // Mark as preloading
      productPreloading.value.set(product.id, {
        variantKey: variantKey,
        status: 'loading'
      })

      // Use progressive loading in background (no blocking)
      // componentType already defined above
      const fullCacheKey = componentType ? `${componentType}-${variantKey}` : variantKey

      loadVariantModelProgressively(firstVariant, {
        onFullModelReady: () => {
          firstVariantPreloaded.value.set(product.id, {
            variantKey: fullCacheKey,
            loadedAt: Date.now()
          })
          productPreloading.value.set(product.id, {
            variantKey: fullCacheKey,
            status: 'loaded'
          })
          console.log('✅ First variant preloaded:', fullCacheKey)
        },
        onError: (error) => {
          console.error('❌ Failed to preload first variant:', error)
          productPreloading.value.set(product.id, {
            variantKey: fullCacheKey,
            status: 'failed'
          })
        }
      }, componentType).catch(error => {
        console.error('❌ Progressive loading failed:', error)
      })
    } else {
      // Already loaded, mark it
      if (!firstVariantPreloaded.value.has(product.id)) {
        firstVariantPreloaded.value.set(product.id, {
          variantKey: variantKey,
          loadedAt: Date.now()
        })
      }
    }
  }
}


const goBackToProductList = () => {
  currentView.value = 'products'
  selectedProduct.value = null
}

const selectVariant = async (variant) => {
  // Don't allow selection of variants that are too large
  if (isVariantTooLarge(variant)) {
    console.log('⚠️ Cannot select variant - too large for available space')
    return
  }

  const variantKey = variant.id || variant.sku || variant.name
  console.log('🔄 Selecting variant...', variant.name || variant.sku)

  // Always select immediately - no blocking
  selectedVariant.value = variant

  // Get the component type for consistent cache key checking
  const componentType = props.selectedCategory !== 'search'
    ? props.selectedCategory
    : (selectedProduct.value?.category || selectedProduct.value?.searchContext?.category || '')

  // Check if model is already cached - no need to load
  if (isModelCached(variant, componentType)) {
    console.log('✅ Model already cached')
    return
  }

  // Check if this is a preloaded first variant
  if (selectedProduct.value &&
      selectedProduct.value.variants &&
      selectedProduct.value.variants[0] === variant &&
      firstVariantPreloaded.value.has(selectedProduct.value.id)) {
    console.log('✅ First variant already preloaded')
    return
  }

  // Check if already loaded
  const isLoaded = isVariantModelLoadedWithCache(variant, selectedProduct.value, firstVariantPreloaded.value)
  if (isLoaded) {
    console.log('✅ Model already loaded')
    return
  }

  // Preload in background (non-blocking) for faster add-to-room later
  // Pass the type for consistent cache keys
  console.log('🔄 Preloading variant in background')
  loadVariantModelProgressively(variant, {
    onFullModelReady: () => {
      console.log('✅ Background preload completed:', componentType ? `${componentType}-${variantKey}` : variantKey)
    },
    onError: (error) => {
      console.error('❌ Background preload error:', error)
    }
  }, componentType).catch(error => {
    console.error('❌ Failed to preload variant:', error)
  })
}

watch(() => props.selectedCategory, (newCategory, oldCategory) => {

  // If switching to search while drawer is open, reset to products view
  if (newCategory === 'search' && props.isOpen) {
    currentView.value = 'products';
    selectedProduct.value = null;
    selectedVariant.value = '';
    selectedColor.value = '';
  }
});

// New display functions for variants
const getDisplayImage = () => {
  if (selectedVariant.value && selectedVariant.value.image) {
    return selectedVariant.value.image
  }
  return selectedProduct.value?.image || ''
}

const getDisplayName = () => {
  // Always prioritize product.name for consistency with dashboard
  // This ensures the name from the database is shown, not the variant title
  if (selectedProduct.value?.name) {
    return selectedProduct.value.name
  }
  // Fallback to variant title/name if product name not available
  if (selectedVariant.value && selectedVariant.value.title) {
    return selectedVariant.value.title
  }
  if (selectedVariant.value && selectedVariant.value.name) {
    return selectedVariant.value.name
  }
  return ''
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

const confirmAddToRoom = async () => {
  if (!selectedProduct.value || !selectedVariant.value) {
    console.log('No product or variant selected')
    return
  }

  // Hard stop - prevent adding if variant is too large
  if (isVariantTooLarge(selectedVariant.value)) {
    console.log('⚠️ Cannot add - variant too large for room')
    return
  }

  const variant = selectedVariant.value
  const variantKey = variant.id || variant.sku || variant.name

  // Get the component type for consistent cache key checking
  const componentType = props.selectedCategory !== 'search'
    ? props.selectedCategory
    : (selectedProduct.value?.category || selectedProduct.value?.searchContext?.category || '')
  const fullCacheKey = componentType ? `${componentType}-${variantKey}` : variantKey

  // Check if model is cached (instant add) - use type for full key check
  const isCached = isModelCached(variant, componentType)

  // Check if model is loaded
  const isLoaded = isVariantModelLoadedWithCache(variant, selectedProduct.value, firstVariantPreloaded.value)

  // Determine if progressive loading is needed
  const needsProgressiveLoading = !isCached && !isLoaded

  console.log('🔍 Add to Room - Loading Status:', {
    variantKey,
    fullCacheKey,
    componentType,
    isCached,
    isLoaded,
    needsProgressiveLoading,
    message: needsProgressiveLoading
      ? '🔲 Will use progressive loading with placeholder'
      : '⚡ Model ready - instant add (no placeholder needed)'
  })

  // Add to room - progressive loading shows placeholder if model isn't ready
  addProductToRoom(needsProgressiveLoading)
}

const addProductToRoom = (useProgressiveLoading = false) => {
  if (!selectedProduct.value) {
    console.log('No Product has been selected')
    return
  }

  if (!selectedVariant.value) {
    console.log('No Variant for the product has been selected')
    return
  }

  if (typeof selectedVariant.value === 'string') {
    console.log('select variant type is string')
    return
  }

  // SelectedCategory
  let componentType = props.selectedCategory
  // If we're in search mode, get the actual category from the selected product
  if (props.selectedCategory === 'search') {
    // Try to get category from multiple possible locations
    componentType = selectedProduct.value.category ||
        selectedProduct.value.searchContext?.category ||
        selectedProduct.value.searchContext?.originalProduct?.category ||
        ''
    if (!componentType) {
      console.warn('No valid component type resolved for add-to-room; aborting emit')
      return
    }
  }

  const productData = {
    type: componentType,
    product: selectedProduct.value,
    selectedVariant: selectedVariant.value,
    selectedColor: selectedColor.value,
    totalPrice: calculateTotalPrice(),
    useProgressiveLoading: useProgressiveLoading
  }

  console.log('📦 ProductDrawer - Emitting add-to-room:', {
    type: componentType,
    useProgressiveLoading: useProgressiveLoading,
    variantSku: selectedVariant.value?.sku
  })

  // Emit the add-to-room event
  emit('add-to-room', productData)
}

const getButtonText = (product) => {
  if (product.searchContext?.showDirectAdd) {
    return 'Add to Room'
  }
  return 'SELECT'
}

const getSearchAwareButtonStyle = (product) => {
  const baseStyle = addToRoomButtonStyle.value

  if (product.searchContext?.showDirectAdd) {
    return {
      ...baseStyle,
      backgroundColor: '#29275B',
    }
  }

  return baseStyle // Regular purple for SELECT
}


const closeDrawer = () => {
  emit('close')
}

// Add these styles to your existing styles object
const seeMoreContainerStyle = {
  marginTop: '16px',
  display: 'flex',
  justifyContent: 'center',
  width: '100%'
}

const seeMoreButtonStyle = {
  padding: '12px 24px',
  backgroundColor: '#f5f5f5',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#333',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

// Style for variants that are too large to fit
const tooLargeBadgeStyle = computed(() => ({
  fontSize: '11px',
  fontWeight: '600',
  color: '#dc2626',
  backgroundColor: '#fef2f2',
  padding: '2px 8px',
  borderRadius: '4px',
  border: '1px solid #fecaca'
}))

// Dynamic styles methods for variants
const getVariantButtonStyle = (variant) => {
  const isSelected = selectedVariant.value === variant
  const isCached = isModelCached(variant)
  const isTooLarge = isVariantTooLarge(variant)

  // Disabled style for variants that are too large
  if (isTooLarge) {
    return {
      padding: '12px 16px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      backgroundColor: '#f3f4f6',
      color: '#9ca3af',
      fontSize: '14px',
      fontWeight: '400',
      transition: 'all 0.2s ease',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: '44px',
      minWidth: '60px',
      boxShadow: 'none',
      transform: 'none',
      cursor: 'not-allowed',
      opacity: '0.7'
    }
  }

  return {
    padding: '12px 16px',
    border: isSelected
        ? '2px solid #29275B'
        : (isCached ? '1px solid #10b981' : '2px solid #e0e0e0'),
    borderRadius: '6px',
    backgroundColor: isSelected
        ? '#29275B'
        : '#ffffff',
    color: isSelected
        ? '#ffffff'
        : '#333',
    fontSize: '14px',
    fontWeight: isSelected ? '600' : '500',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '44px',
    minWidth: '60px',
    boxShadow: isSelected
        ? '0 2px 8px rgba(41, 39, 91, 0.3)'
        : 'none',
    transform: isSelected ? 'translateY(-1px)' : 'translateY(0px)',
    cursor: 'pointer'
  }
}

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
  top: isMobileDevice.value ? '70px' : '130px',
  left: '0',
  maxHeight: isMobileDevice.value ? 'calc(100vh - 70px)' : 'calc(100vh - 130px)',
  height: isMobileDevice.value ? 'calc(100vh - 70px)' : 'calc(100vh - 130px)',
  width: isMobileDevice.value ? '100vw' : '480px',
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
  fontSize: currentView.value === 'variants' ? '18px' : '16px',
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

const actionButtonsStyle = computed(() => ({
  display: 'flex',
  gap: '10px',
  marginTop: '10px',
  flexDirection: isMobileDevice.value ? 'column' : 'row'
}))

const confirmAddButtonStyle = computed(() => {
  const isTooLarge = isVariantTooLarge(selectedVariant.value)

  if (isTooLarge) {
    return {
      backgroundColor: '#9ca3af',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'not-allowed',
      transition: 'background-color 0.2s ease',
      flex: '1',
      fontFamily: 'Arial, sans-serif',
      opacity: '0.7'
    }
  }

  return {
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
  }
})

const modalOverlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  zIndex: '9999',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

// 6. Add these styles for search results
const searchContextStyle = computed(() => ({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  marginTop: '8px',
  flexWrap: 'wrap'
}))

const searchVariantStyle = computed(() => ({
  backgroundColor: '#f0f0f0',
  color: '#666',
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: '500'
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
  background-color: #29275B !important;
  color: #ffffff !important;
}

/* Prevent hover effects on disabled (too large) variants */
.variant-button[style*="not-allowed"]:hover {
  border-color: #e5e7eb !important;
  background-color: #f3f4f6 !important;
  color: #9ca3af !important;
  transform: none !important;
  box-shadow: none !important;
}

.color-swatch:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.hardware-change-button:hover {
  background-color: #29275B !important;
  color: white !important;
}

.confirm-add-button:hover:not(:disabled) {
  background-color: #1e1a4a !important;
}

.confirm-add-button:disabled {
  background-color: #9ca3af !important;
  cursor: not-allowed !important;
  opacity: 0.7 !important;
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