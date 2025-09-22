<template>
  <div>
    <div v-if="isSidebarVisible || !isMobileDevice" :style="searchSectionStyle">
      <div :style="searchContainerStyle">
        <!-- Search Icon -->
        <div :style="searchIconStyle" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="M21 21l-4.35-4.35"></path>
          </svg>
        </div>

        <!-- Search Input -->
        <input
            ref="searchInput"
            v-model="searchQuery"
            :style="searchInputStyle"
            type="text"
            placeholder="Search by name or SKU..."
            aria-label="Search products by name or SKU"
            @input="handleSearchInput"
            @keydown.enter="handleSearchEnter"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            class="search-input"
            autocomplete="off"
        />

        <!-- Clear Button (show when there's text) -->
        <button
            v-if="searchQuery"
            @click="clearSearch"
            :style="clearButtonStyle"
            class="clear-search-button"
            type="button"
            aria-label="Clear search"
            title="Clear search"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <!-- Optional: Small loading indicator while typing -->
        <div v-if="isSearching" :style="searchLoadingStyle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32">
              <animate attributeName="stroke-dashoffset" dur="1s" values="32;0" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      </div>

      <!-- Optional: Quick search tips -->
      <div v-if="!searchQuery && searchFocused" :style="searchTipsStyle">
        <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">
          💡 Try product names or SKU codes
        </div>
      </div>
    </div>
    <!-- Mobile Floating + Button -->
    <button
        v-if="isMobileDevice && !isSidebarVisible"
        @click="showSidebar"
        :style="mobileFloatingButtonStyle"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
    >
      <span :style="plusIconStyle">+</span>
    </button>

    <!-- Mobile Sidebar Overlay -->
    <div
        v-if="isMobileDevice && isSidebarVisible"
        :style="mobileSidebarOverlayStyle"
        @click="hideSidebar"
    ></div>

    <!-- Main Sidebar Panel -->
    <div :style="panelStyle">
      <!-- Mobile Close Button -->
      <button
          v-if="isMobileDevice"
          @click="hideSidebar"
          :style="mobileCloseButtonStyle"
      >
        ✕
      </button>

      <!-- Search Input Section -->


      <!-- Bathroom Items Accordion -->
      <div :style="accordionSectionStyle">
        <div
            @click="toggleBathroomItemsSection"
            :style="mainAccordionHeaderStyle"
        >
          <h4 :style="accordionTitleStyle">Bathroom Items</h4>
          <span :style="getArrowStyle(isBathroomItemsExpanded)">▼</span>
        </div>
        <div
            :style="getAccordionContentStyle(isBathroomItemsExpanded)"
            ref="bathroomItemsContent"
        >
          <div :style="categoriesContainerStyle">
            <!-- Category Items -->
            <div
                v-for="category in bathroomCategories"
                :key="category.id"
                @click.stop="handleCategoryClick(category.component)"
                :style="getEnhancedCategoryItemStyle(category.component)"
                class="category-item"
            >
              <div :style="categoryIconStyle">
                <span v-html="category.icon"></span>
                <!-- Tiny loading spinner in corner (barely visible) -->
                <div
                    v-if="isCategoryLoading(category.component)"
                    :style="tinyLoadingSpinnerStyle"
                ></div>
              </div>
              <div :style="categoryTextContainerStyle">
                <span :style="categoryLabelStyle">{{ category.label }}</span>
                <!-- Tiny status text -->
                <span
                    v-if="isCategoryLoading(category.component)"
                    :style="tinyStatusStyle"
                >
                  Loading...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Room Settings Accordion -->
      <div :style="accordionSectionStyle">
        <div
            @click="toggleRoomSettingsSection"
            :style="mainAccordionHeaderStyle"
        >
          <h4 :style="accordionTitleStyle">Room Settings</h4>
          <span :style="getArrowStyle(isRoomSettingsExpanded)">▼</span>
        </div>
        <div
            :style="getAccordionContentStyle(isRoomSettingsExpanded)"
            ref="roomSettingsContent"
        >
          <div :style="roomSettingsContentStyle">
            <div :style="controlGroupStyle">
              <label :style="labelStyle">
                Width: {{ safeToFixed(localRoomWidth, 0) }}cm
                <div :style="inputSliderContainerStyle">
                  <input
                      type="number"
                      :min="ROOM_DEFAULTS.MIN_SIZE"
                      :max="ROOM_DEFAULTS.MAX_SIZE"
                      :step="ROOM_DEFAULTS.STEP"
                      :value="localRoomWidth"
                      @input="updateWidthFromInput"
                      @blur="validateAndUpdateWidth"
                      :style="numberInputStyle"
                      placeholder="Width"
                      class="modern-number-input"
                  />
                  <input
                      type="range"
                      :min="ROOM_DEFAULTS.MIN_SIZE"
                      :max="ROOM_DEFAULTS.MAX_SIZE"
                      :step="ROOM_DEFAULTS.STEP"
                      :value="localRoomWidth"
                      @input="updateWidthFromSlider"
                      :style="sliderStyle"
                      class="modern-slider"
                  />
                </div>
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="labelStyle">
                Length: {{ safeToFixed(localRoomHeight, 0) }}cm
                <div :style="inputSliderContainerStyle">
                  <input
                      type="number"
                      :min="ROOM_DEFAULTS.MIN_SIZE"
                      :max="ROOM_DEFAULTS.MAX_SIZE"
                      :step="ROOM_DEFAULTS.STEP"
                      :value="localRoomHeight"
                      @input="updateHeightFromInput"
                      @blur="validateAndUpdateHeight"
                      :style="numberInputStyle"
                      placeholder="Height"
                      class="modern-number-input"
                  />
                  <input
                      type="range"
                      :min="ROOM_DEFAULTS.MIN_SIZE"
                      :max="ROOM_DEFAULTS.MAX_SIZE"
                      :step="ROOM_DEFAULTS.STEP"
                      :value="localRoomHeight"
                      @input="updateHeightFromSlider"
                      :style="sliderStyle"
                      class="modern-slider"
                  />
                </div>
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="checkboxLabelStyle">
                <input
                    type="checkbox"
                    :checked="showGrid"
                    @change="$emit('toggle-grid', $event.target.checked)"
                    :style="checkboxStyle"
                />
                Show Grid
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="checkboxLabelStyle">
                <input
                    type="checkbox"
                    :checked="showWallGrid"
                    @change="$emit('toggle-wall-grid', $event.target.checked)"
                    :style="checkboxStyle"
                />
                Show Wall Grid
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="checkboxLabelStyle">
                <input
                    type="checkbox"
                    :checked="wallCullingEnabled"
                    @change="$emit('toggle-wall-culling', $event.target.checked)"
                    :style="checkboxStyle"
                />
                Smart Wall Hiding
              </label>
            </div>

            <div :style="controlGroupStyle">
              <button
                  @click="$emit('constrain-objects')"
                  :style="buttonStyle"
              >
                Snap Objects to Walls
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Textures Button -->
<!--      <div :style="accordionSectionStyle">-->
<!--        <button-->
<!--            @click="toggleTextureDrawer"-->
<!--            :style="textureButtonStyle"-->
<!--        >-->
<!--          <h4 :style="accordionTitleStyle">Textures</h4>-->
<!--          <span :style="textureArrowStyle">▶</span>-->
<!--        </button>-->
<!--      </div>-->
    </div>

    <!-- Texture Drawer Overlay -->
    <div
        v-if="isTextureDrawerOpen"
        :style="overlayStyle"
        @click="closeTextureDrawer"
    ></div>

    <!-- Texture Drawer -->
    <div :style="drawerStyle">
      <div :style="drawerHeaderStyle">
        <h3 :style="drawerTitleStyle">Textures</h3>
        <button
            @click="closeTextureDrawer"
            :style="drawerCloseButtonStyle"
            @mouseenter="e => e.target.style.backgroundColor = '#f3f4f6'"
            @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
        >
          ✕
        </button>
      </div>

      <div :style="drawerContentStyle">
        <!-- Floor Texture Section -->
        <div :style="drawerSectionStyle">
          <div
              @click="toggleFloorSection"
              :style="drawerSubHeaderStyle"
          >
            <h5 :style="drawerSubTitleStyle">Floor Texture</h5>
            <span :style="getSubArrowStyle(isFloorExpanded)">▼</span>
          </div>
          <div :style="getSubAccordionContentStyle(isFloorExpanded)">
            <div :style="textureGridStyle">
              <div
                  v-for="(texture, index) in FLOOR_TEXTURES"
                  :key="index"
                  @click="$emit('floor-change', texture)"
                  :style="getTextureButtonStyle(texture, index === currentFloor)"
              >
                <div :style="getTexturePreviewStyle(texture)"></div>
                <span :style="textureLabelStyle">{{ texture.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Wall Texture Section -->
        <div :style="drawerSectionStyle">
          <div
              @click="toggleWallSection"
              :style="drawerSubHeaderStyle"
          >
            <h5 :style="drawerSubTitleStyle">Wall Texture</h5>
            <span :style="getSubArrowStyle(isWallExpanded)">▼</span>
          </div>
          <div :style="getSubAccordionContentStyle(isWallExpanded)">
            <div :style="textureGridStyle">
              <div
                  v-for="(texture, index) in WALL_TEXTURES"
                  :key="index"
                  @click="$emit('wall-change', texture)"
                  :style="getTextureButtonStyle(texture, index === currentWall)"
              >
                <div :style="getTexturePreviewStyle(texture)"></div>
                <span :style="textureLabelStyle">{{ texture.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ProductDrawer
        v-bind="productDrawerProps"
        :search-triggered="searchTriggered"
        @close="handleProductDrawerClose"
        @add-to-room="handleAddToRoom"
        @retry-loading="retryLoadingCategory"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { FLOOR_TEXTURES, WALL_TEXTURES } from '../../constants/textures.js'
import { COMPONENTS } from '../../constants/components.js'
import { ROOM_DEFAULTS } from '../../constants/dimensions.js'
import { isMobile } from '../../utils/helpers.js'
import ProductDrawer from './ProductDrawer.vue'

// NEW: Import selective preloading functions
import productData from '../../mocks/productData.js'
import { CONFIG } from '../../constants/models'
import { ModelManager, preloadCategoryModels, isCategoryPreloaded } from '../../models/bathroomFixtures'



// Define props
const props = defineProps({
  currentFloor: {
    type: Number,
    required: true
  },
  currentWall: {
    type: Number,
    required: true
  },
  roomWidth: {
    type: Number,
    required: true
  },
  roomHeight: {
    type: Number,
    required: true
  },
  showGrid: {
    type: Boolean,
    required: true
  },
  showWallGrid: {
    type: Boolean,
    required: true
  },
  wallCullingEnabled: {
    type: Boolean,
    required: true
  },
  measurementEnabled: {
    type: Boolean,
    default: false
  }
})
// FIXED: Add missing reactive states
const isTextureDrawerOpen = ref(false)
const isFloorExpanded = ref(true)
const isWallExpanded = ref(false)
const isSidebarVisible = ref(false)
const isButtonPressed = ref(false)
const searchTriggered = ref(0)

let searchTimeout = null;

// Define emits
const emit = defineEmits([
  'floor-change',
  'wall-change',
  'close',
  'add',
  'room-size-change',
  'toggle-grid',
  'toggle-wall-grid',
  'constrain-objects',
  'toggle-wall-culling',
  'toggle-measurements',
  // NEW: Preloading events
  'loading-started',
  'loading-finished',
  'loading-error'
])

// Bathroom categories with icons (matching your design)
const bathroomCategories = [
  {
    id: 'baths',
    label: 'Baths',
    component: 'Bath',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <!-- Bath tub body -->
      <path d="M3 14h18v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3z"/>
      <!-- Bath tub rim -->
      <path d="M2 14h20"/>
      <!-- Faucet -->
      <path d="M4 14v-2a1 1 0 0 1 1-1h1"/>
      <circle cx="6" cy="10" r="0.5"/>
      <!-- Legs -->
      <path d="M5 19v2"/>
      <path d="M19 19v2"/>
      <!-- Drain -->
      <circle cx="12" cy="16" r="0.5"/>
    </svg>`
  },
  {
    id: 'showers',
    label: 'Showers',
    component: 'Shower',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <!-- Shower enclosure -->
      <path d="M6 4h12v16H6z"/>
      <!-- Door -->
      <path d="M12 4v16"/>
      <circle cx="11" cy="12" r="0.5"/>
      <!-- Shower head -->
      <path d="M8 4V2"/>
      <rect x="7" y="1" width="2" height="1" rx="0.5"/>
      <!-- Water drops -->
      <circle cx="8" cy="6" r="0.3"/>
      <circle cx="10" cy="7" r="0.3"/>
      <circle cx="9" cy="8" r="0.3"/>
      <circle cx="7" cy="9" r="0.3"/>
      <!-- Base tray -->
      <path d="M6 20h12"/>
    </svg>`
  },
  {
    id: 'toilets',
    label: 'Toilets',
    component: 'Toilet',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <!-- Toilet bowl -->
      <path d="M8 20v-6a4 4 0 0 1 4-4 4 4 0 0 1 4 4v6a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/>
      <!-- Toilet seat -->
      <path d="M8 14h8"/>
      <!-- Toilet tank -->
      <rect x="9" y="6" width="6" height="6" rx="1"/>
      <!-- Flush handle -->
      <path d="M15 9h1"/>
      <!-- Water line in bowl -->
      <path d="M10 17h4"/>
      <!-- Base -->
      <path d="M7 21h10"/>
    </svg>`
  },
  {
    id: 'mirrors',
    label: 'Mirrors',
    component: 'Mirror',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <!-- Outer mirror frame -->
      <ellipse cx="12" cy="10" rx="8" ry="7"/>
      <!-- Inner mirror surface -->
      <ellipse cx="12" cy="10" rx="6" ry="5"/>
      <!-- Reflection lines -->
      <path d="M8 8l2 2"/>
      <path d="M10 6l2 2"/>
      <path d="M14 12l2 2"/>
      <!-- Mirror stand -->
      <path d="M12 17v4"/>
      <!-- Base -->
      <path d="M9 21h6"/>
    </svg>`
  },
  {
    id: 'radiator',
    label: 'Radiator',
    component: 'Radiator',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <!-- Radiator panels -->
      <rect x="4" y="6" width="3" height="12" rx="0.5"/>
      <rect x="8.5" y="6" width="3" height="12" rx="0.5"/>
      <rect x="13" y="6" width="3" height="12" rx="0.5"/>
      <rect x="17.5" y="6" width="2.5" height="12" rx="0.5"/>
      <!-- Top connection pipe -->
      <path d="M4 6h16"/>
      <!-- Bottom connection pipe -->
      <path d="M4 18h16"/>
      <!-- Valve -->
      <circle cx="2" cy="12" r="1"/>
      <path d="M3 12h1"/>
      <!-- Heat lines -->
      <path d="M5.5 9v2m0 2v2" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
      <path d="M10 9v2m0 2v2" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
      <path d="M14.5 9v2m0 2v2" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
    </svg>`
  },
  {
    id: 'furniture',
    label: 'Furniture',
    component: 'Furniture',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <!-- Vanity cabinet body -->
      <rect x="3" y="10" width="18" height="8" rx="1"/>
      <!-- Cabinet doors -->
      <path d="M12 10v8"/>
      <circle cx="8" cy="14" r="0.5"/>
      <circle cx="16" cy="14" r="0.5"/>
      <!-- Basin/sink on top -->
      <path d="M5 10V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/>
      <!-- Faucet -->
      <path d="M12 8V6"/>
      <path d="M11 6h2"/>
      <!-- Legs/support -->
      <path d="M6 18v2"/>
      <path d="M18 18v2"/>
      <!-- Drawer handle -->
      <circle cx="12" cy="14" r="0.3"/>
    </svg>`
  },
  {
    id: 'plumbing',
    label: 'Soil Pipe',
    component: 'Plumbing',
    icon: `<svg id="soil-pipe-icon" width="24" height="24" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
                        <!-- Main pipe body -->
                        <rect x="25" y="15" width="30" height="65" fill="#f0f0f0" stroke="#d0d0d0" stroke-width="2" rx="3"></rect>

                        <!-- Inner hollow (darker) -->
                        <rect x="30" y="15" width="20" height="65" fill="#e8e8e8" stroke="#c0c0c0" stroke-width="1" rx="2"></rect>

                        <!-- Bottom connection -->
                        <ellipse cx="40" cy="80" rx="15" ry="4" fill="#d0d0d0" stroke="#b0b0b0" stroke-width="1"></ellipse>

                        <!-- Top cap -->
                        <rect x="20" y="10" width="40" height="8" fill="#e0e0e0" stroke="#c0c0c0" stroke-width="2" rx="4"></rect>

                        <!-- Screw holes in cap -->
                        <circle cx="30" cy="14" r="2" fill="#999" stroke="#777" stroke-width="1"></circle>
                        <circle cx="50" cy="14" r="2" fill="#999" stroke="#777" stroke-width="1"></circle>
                        <circle cx="35" cy="14" r="1" fill="#666"></circle>
                        <circle cx="45" cy="14" r="1" fill="#666"></circle>

                        <!-- Side detail lines -->
                        <line x1="25" y1="25" x2="55" y2="25" stroke="#c0c0c0" stroke-width="1" opacity="0.6"></line>
                        <line x1="25" y1="70" x2="55" y2="70" stroke="#c0c0c0" stroke-width="1" opacity="0.6"></line>

                        <!-- Label text -->
                        <text x="40" y="92" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">110mm</text>
                    </svg>`
  }
]

const loadingCategories = ref(new Set())
const isLoading = ref(false)
const errorMessage = ref('')
const loadedProducts = ref(new Set())
const loadedProductsCount = computed(() => loadedProducts.value.size)
const productLoadingStates = ref(new Map()) // Track loading state per product

// Reactive state
const isBathroomItemsExpanded = ref(true)
const isRoomSettingsExpanded = ref(false)

const addLoadedProduct = (productId) => {
  if (!loadedProducts.value.has(productId)) {
    const next = new Set(loadedProducts.value)
    next.add(productId)
    loadedProducts.value = next
  }
  console.log(`✅ UI REACTIVE UPDATE - Product ${productId} added, total: ${loadedProductsCount.value}`)
}

// FIXED: Add missing helper functions
const getProductsForCategory = (category) => {
  return productData[category] || []
}

// Product drawer state
const isProductDrawerOpen = ref(false)
const selectedCategory = ref('')

// NEW: Selective preloading state
let progressCheckIntervalId = null
let safetyTimeoutId = null

onBeforeUnmount(() => {
  if (progressCheckIntervalId) { clearInterval(progressCheckIntervalId); progressCheckIntervalId = null }
  if (safetyTimeoutId) { clearTimeout(safetyTimeoutId); safetyTimeoutId = null }
})

// Local state for inputs
const localRoomWidth = ref(Number(props.roomWidth) || ROOM_DEFAULTS.WIDTH)
const localRoomHeight = ref(Number(props.roomHeight) || ROOM_DEFAULTS.HEIGHT)
const isInternalUpdate = ref(false)

// FIXED: Get model paths for category
const getCategoryModelPaths = (category) => {
  const categoryModels = []

  if (productData[category]) {
    productData[category].forEach(product => {
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach(variant => {
          if (variant.path && variant.sku) {
            categoryModels.push({
              name: variant.sku || variant.name,
              path: variant.path,
              scale: variant.scale || 1.0
            })
          }
        })
      }
    })
  }

  return categoryModels
}

const failedProducts = ref(new Set())

// NEW: Enhanced category click handler with selective preloading
const handleCategoryClick = async (category) => {
  console.log(`🖱️ Category clicked: ${category}`)

  // Simply open the product drawer without any progressive loading
  openProductDrawer(category)

  // Clear any existing loading states
  loadedProducts.value = new Set()
  productLoadingStates.value = new Map()
  failedProducts.value = new Set()

  // Clear any running intervals
  if (progressCheckIntervalId) {
    clearInterval(progressCheckIntervalId)
    progressCheckIntervalId = null
  }

  // Set all products as loaded immediately (no progressive loading)
  const categoryProducts = getProductsForCategory(category)
  loadedProducts.value = new Set(categoryProducts.map(p => p.id))

  // No longer loading
  isLoading.value = false

  console.log(`✅ All ${categoryProducts.length} products in ${category} ready immediately`)
}

// Pass the loading states to ProductDrawer
const productDrawerProps = computed(() => ({
  isOpen: isProductDrawerOpen.value,
  selectedCategory: selectedCategory.value,
  isLoading: isLoading.value,
  loadingError: errorMessage.value,
  searchResults: searchResults,
  searchQuery: String(searchQuery)
}))

// 2. ADD these new helper functions (don't replace existing ones):
const retryLoadingCategory = () => {
  if (selectedCategory.value) {
    errorMessage.value = ''
    handleCategoryClick(selectedCategory.value)
  }
}

const isCategoryLoading = (category) => {
  return loadingCategories.value.has(category)
}

const isCategoryReady = (category) => {
  return isCategoryPreloaded(category) && !isCategoryLoading(category)
}

const clearError = () => {
  errorMessage.value = ''
}

// Update the watch functions - props are in centimeters, no conversion needed
watch(() => props.roomWidth, (newWidth) => {
  if (!isInternalUpdate.value) {
    // Values are already in centimeters
    localRoomWidth.value = Number(newWidth) || ROOM_DEFAULTS.WIDTH
  }
})

watch(() => props.roomHeight, (newHeight) => {
  if (!isInternalUpdate.value) {
    // Values are already in centimeters
    localRoomHeight.value = Number(newHeight) || ROOM_DEFAULTS.HEIGHT
  }
})

// FIXED: Product drawer methods
const openProductDrawer = (category) => {
  console.log('🔍 Opening product drawer for category:', category)
  selectedCategory.value = category
  isProductDrawerOpen.value = true

  // On mobile, keep sidebar visible when opening product drawer
  // Don't auto-hide it - let user control it
  console.log('🔍 Product drawer opened, sidebar remains visible')
}

const handleProductDrawerClose = () => {
  console.log('🔍 Product drawer close event received')
  isProductDrawerOpen.value = false
  selectedCategory.value = ''

  // IMPORTANT: Don't hide the main sidebar when closing product drawer
  // The sidebar should stay open for the user to access other features
  console.log('🔍 Product drawer closed, sidebar remains visible')
}

const handleAddToRoom = (product) => {
  console.log('🔍 Adding product to room:', product)

  // ENHANCED: Validate item structure before emitting
  if (!product) {
    console.error('❌ No product provided to handleAddToRoom')
    return
  }

  if (!product.type) {
    console.error('❌ Product missing required type property:', product)
    return
  }

  // ENHANCED: Ensure selectedVariant exists if productData is provided
  if (product.selectedVariant === null || product.selectedVariant === undefined) {
    console.warn('⚠️ Product missing selectedVariant, adding as basic item:', product)
    // For basic items without product data, just pass the type
    emit('add', product.type)
    handleProductDrawerClose()
    return
  }

  // Extract component type from product data
  const componentType = product.type || 'Unknown'

  // ENHANCED: Pass the complete item structure
  console.log('✅ Adding item with complete product data:', {
    type: product.type,
    hasSelectedVariant: !!product.selectedVariant,
    selectedVariantSku: product.selectedVariant?.sku,
    selectedVariantName: product.selectedVariant?.name
  })

  // Emit to parent component to add the item
  emit('add', componentType, product)

  // Close product drawer after adding
  handleProductDrawerClose()

  // On mobile, auto-hide sidebar after adding item (this is the only time we auto-hide)
  if (isMobileDevice.value) {
    setTimeout(() => {
      hideSidebar()
    }, 300)
  }
}

// Safe toFixed function
const safeToFixed = (value, decimals) => {
  const num = Number(value)
  return isNaN(num) ? '0.0' : num.toFixed(decimals)
}

// Watch for external prop changes
watch(() => props.roomWidth, (newWidth) => {
  if (!isInternalUpdate.value) {
    localRoomWidth.value = Number(newWidth) || ROOM_DEFAULTS.WIDTH
  }
})

watch(() => props.roomHeight, (newHeight) => {
  if (!isInternalUpdate.value) {
    localRoomHeight.value = Number(newHeight) || ROOM_DEFAULTS.HEIGHT
  }
})

// Computed
const isMobileDevice = computed(() => isMobile())

// Mobile sidebar methods
const showSidebar = () => {
  console.log('🔍 Showing sidebar')
  isSidebarVisible.value = true
}

const hideSidebar = () => {
  isSidebarVisible.value = false

  // Also close any open drawers when hiding sidebar
  if (isProductDrawerOpen.value) {
    console.log('🔍 Also closing product drawer when hiding sidebar')
    handleProductDrawerClose()
  }

  if (isTextureDrawerOpen.value) {
    console.log('🔍 Also closing texture drawer when hiding sidebar')
    closeTextureDrawer()
  }
}

const handleTouchStart = () => {
  isButtonPressed.value = true
}

const handleTouchEnd = () => {
  isButtonPressed.value = false
}

const toggleBathroomItemsSection = () => {
  isBathroomItemsExpanded.value = !isBathroomItemsExpanded.value
}

const toggleRoomSettingsSection = () => {
  isRoomSettingsExpanded.value = !isRoomSettingsExpanded.value
}

const toggleTextureDrawer = () => {
  isTextureDrawerOpen.value = !isTextureDrawerOpen.value
}

const closeTextureDrawer = () => {
  isTextureDrawerOpen.value = false
}

const toggleFloorSection = () => {
  isFloorExpanded.value = !isFloorExpanded.value
}

const toggleWallSection = () => {
  isWallExpanded.value = !isWallExpanded.value
}

// Room settings methods
const validateValue = (value, min, max) => {
  const num = Number(value)
  if (isNaN(num)) return min
  return Math.max(min, Math.min(max, num))
}

const updateWidthFromInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    localRoomWidth.value = newValue
    if (newValue >= ROOM_DEFAULTS.MIN_SIZE && newValue <= ROOM_DEFAULTS.MAX_SIZE) {
      isInternalUpdate.value = true
      emit('room-size-change', newValue, localRoomHeight.value)
      setTimeout(() => {
        isInternalUpdate.value = false
      }, 100)
    }
  }
}

const updateHeightFromInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    localRoomHeight.value = newValue
    if (newValue >= ROOM_DEFAULTS.MIN_SIZE && newValue <= ROOM_DEFAULTS.MAX_SIZE) {
      isInternalUpdate.value = true
      emit('room-size-change', localRoomWidth.value, newValue)
      setTimeout(() => {
        isInternalUpdate.value = false
      }, 100)
    }
  }
}

const updateWidthFromSlider = (event) => {
  const newValue = Number(event.target.value)
  localRoomWidth.value = newValue
  isInternalUpdate.value = true
  emit('room-size-change', newValue, localRoomHeight.value)
  setTimeout(() => {
    isInternalUpdate.value = false
  }, 100)
}

const updateHeightFromSlider = (event) => {
  const newValue = Number(event.target.value)
  localRoomHeight.value = newValue
  isInternalUpdate.value = true
  emit('room-size-change', localRoomWidth.value, newValue)
  setTimeout(() => {
    isInternalUpdate.value = false
  }, 100)
}

const validateAndUpdateWidth = (event) => {
  const newValue = validateValue(event.target.value, ROOM_DEFAULTS.MIN_SIZE, ROOM_DEFAULTS.MAX_SIZE)
  localRoomWidth.value = newValue
  isInternalUpdate.value = true
  // Emit values in centimeters (no conversion needed)
  emit('room-size-change', newValue, localRoomHeight.value)
  setTimeout(() => {
    isInternalUpdate.value = false
  }, 100)
}

const validateAndUpdateHeight = (event) => {
  const newValue = validateValue(event.target.value, ROOM_DEFAULTS.MIN_SIZE, ROOM_DEFAULTS.MAX_SIZE)
  localRoomHeight.value = newValue
  isInternalUpdate.value = true
  // Emit values in centimeters (no conversion needed)
  emit('room-size-change', localRoomWidth.value, newValue)
  setTimeout(() => {
    isInternalUpdate.value = false
  }, 100)
}

// NEW: Enhanced category item style with subtle loading states
const getEnhancedCategoryItemStyle = (category) => {
  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    gap: '16px',
    fontFamily: 'Arial, sans-serif'
  }

  // Subtle visual enhancements for loading/ready states
  if (isCategoryLoading(category)) {
    return {
      ...baseStyle,
      opacity: '0.8',
      cursor: 'not-allowed'
    }
  }

  if (isCategoryReady(category)) {
    return {
      ...baseStyle,
      borderColor: '#e5e7eb'
    }
  }

  return baseStyle
}

const searchingTextStyle = computed(() => ({
  color: '#29275B',
  fontStyle: 'italic'
}));

const searchLoadingStyle = computed(() => ({
  padding: '8px 12px',
  color: '#29275B',
  display: 'flex',
  alignItems: 'center'
}));

const searchTipsStyle = computed(() => ({
  marginTop: '8px',
  padding: '8px 12px',
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  border: '1px solid #e5e7eb'
}));

// NEW: Tiny loading spinner style (barely visible)
const tinyLoadingSpinnerStyle = {
  position: 'absolute',
  top: '-2px',
  right: '-2px',
  width: '6px',
  height: '6px',
  border: '1px solid #f3f4f6',
  borderTop: '1px solid #f59e0b',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
}

// NEW: Category text container to stack label and status
const categoryTextContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1
}

// NEW: Tiny status styles
const tinyStatusStyle = {
  fontSize: '8px',
  color: '#f59e0b',
  marginTop: '2px'
}

// Style helper methods (keeping your exact original styles)
const getArrowStyle = (isExpanded) => ({
  fontSize: '14px',
  color: '#ffffff',
  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
  transition: 'transform 0.2s ease',
  display: 'inline-block',
  fontFamily: 'Arial, sans-serif'
})

const getSubArrowStyle = (isExpanded) => ({
  fontSize: '12px',
  color: '#6b7280',
  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
  transition: 'transform 0.2s ease',
  display: 'inline-block',
  fontFamily: 'Arial, sans-serif'
})

const getAccordionContentStyle = (isExpanded) => ({
  maxHeight: isExpanded ? '800px' : '0px',
  overflow: 'hidden',
  transition: 'max-height 0.3s ease-in-out',
  backgroundColor: '#f9fafb',
  padding: isExpanded ? '0px' : '0px'
})

const getSubAccordionContentStyle = (isExpanded) => ({
  maxHeight: isExpanded ? 'none' : '0px',
  overflow: isExpanded ? 'visible' : 'hidden',
  transition: 'max-height 0.3s ease-in-out',
  backgroundColor: '#ffffff'
})

const getTextureButtonStyle = (texture, isActive) => ({
  padding: '10px',
  border: isActive ? '3px solid #29275B' : '2px solid #e5e7eb',
  borderRadius: '8px',
  cursor: 'pointer',
  backgroundColor: isActive ? '#f0fdf4' : '#fff',
  transition: 'all 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  minHeight: isMobileDevice.value ? '70px' : '80px',
  boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
})

const getTexturePreviewStyle = (texture) => ({
  width: '100%',
  height: isMobileDevice.value ? '35px' : '45px',
  backgroundColor: `#${ texture.color.toString(16).padStart(6, '0') }`,
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
  backgroundImage: texture.file ? `url(${ texture.file })` : 'none',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
})

// All your existing style computed properties go here...
// (I'll keep them the same as in your original code)
const mobileFloatingButtonStyle = computed(() => ({
  position: 'fixed',
  bottom: '30px',
  left: '20px',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: isButtonPressed.value ? '#29275B' : '#29275B',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  transform: isButtonPressed.value ? 'scale(0.95)' : 'scale(1)',
  fontSize: '24px',
  fontWeight: 'bold',
  backdropFilter: 'blur(10px)'
}))

const plusIconStyle = computed(() => ({
  fontSize: '28px',
  fontWeight: 'bold',
  lineHeight: '1'
}))

const mobileSidebarOverlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1500,
  opacity: '1',
  visibility: 'visible'
}))

const mobileCloseButtonStyle = computed(() => ({
  position: 'absolute',
  top: '10px',
  right: '10px',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#29275B',
  color: 'white',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
}))

// Main panel styles
const panelStyle = computed(() => ({
  position: isMobileDevice.value ? 'fixed' : 'absolute',
  top: isMobileDevice.value ? '70px' : '130px',
  left: '0',
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  padding: isMobileDevice.value ? '50px 20px 20px 20px' : '20px',
  boxShadow: isMobileDevice.value ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.15)',
  width: isMobileDevice.value ? '100vw' : '480px',
  maxWidth: isMobileDevice.value ? '100vw' : '500px',
  zIndex: isMobileDevice.value ? 1600 : 1000,
  backdropFilter: 'blur(12px)',
  maxHeight: isMobileDevice.value ? 'calc(100vh - 60px)' : 'calc(100vh - 130px)',
  height: isMobileDevice.value ? 'calc(100vh - 60px)' : 'calc(100vh - 130px)',
  overflowY: 'auto',
  fontFamily: 'Arial, sans-serif',
  border: isMobileDevice.value ? 'none' : '1px solid rgba(16, 185, 129, 0.2)',
  transform: isMobileDevice.value ? (isSidebarVisible.value ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
  transition: 'transform 0.3s ease',
  display: isMobileDevice.value ? 'block' : 'block'
}))

const accordionSectionStyle = computed(() => ({
  border: '1px solid #fff',
  borderRadius: '10px',
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  marginBottom: '12px'
}))

const mainAccordionHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px',
  cursor: 'pointer',
  backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  background: '#29275B',
  transition: 'all 0.2s ease',
  color: '#ffffff',
  fontFamily: 'Arial, sans-serif'
}))

const accordionTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  color: '#ffffff',
  fontFamily: 'Arial, sans-serif'
}))

// Room Settings styles
const roomSettingsContentStyle = computed(() => ({
  padding: '20px',
  backgroundColor: '#fafbfc'
}))

const controlGroupStyle = computed(() => ({
  marginBottom: '20px',
  padding: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  transition: 'all 0.2s ease'
}))

const labelStyle = computed(() => ({
  display: 'block',
  fontSize: isMobileDevice.value ? '14px' : '15px',
  color: '#1f2937',
  marginBottom: '8px',
  fontFamily: 'Arial, sans-serif',
  fontWeight: '600'
}))

const inputSliderContainerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  marginTop: '12px'
}))

const numberInputStyle = computed(() => ({
  width: isMobileDevice.value ? '80px' : '90px',
  padding: '12px 16px',
  border: '2px solid #e5e7eb',
  borderRadius: '10px',
  fontSize: isMobileDevice.value ? '14px' : '15px',
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#ffffff',
  color: '#1f2937',
  outline: 'none',
  transition: 'all 0.3s ease',
  textAlign: 'center',
  fontWeight: '600',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
  position: 'relative'
}))

const sliderStyle = computed(() => ({
  flex: 1,
  marginTop: '0',
  accentColor: '#29275B',
  height: isMobileDevice.value ? '8px' : '6px',
  borderRadius: '4px',
  cursor: 'pointer'
}))

const checkboxLabelStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  color: '#666',
  cursor: 'pointer',
  fontFamily: 'Arial, sans-serif'
}))

const checkboxStyle = computed(() => ({
  accentColor: '#29275B',
  width: isMobileDevice.value ? '18px' : '16px',
  height: isMobileDevice.value ? '18px' : '16px'
}))

const buttonStyle = computed(() => ({
  width: '100%',
  padding: isMobileDevice.value ? '12px' : '10px',
  backgroundColor: '#29275B',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  fontWeight: '500',
  transition: 'background-color 0.2s ease',
  fontFamily: 'Arial, sans-serif'
}))

// Texture button styles
const textureButtonStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px',
  cursor: 'pointer',
  backgroundColor: '#29275B',
  background: '#29275B',
  transition: 'all 0.2s ease',
  color: '#ffffff',
  fontFamily: 'Arial, sans-serif',
  border: 'none',
  width: '100%',
  borderRadius: '0'
}))

const textureArrowStyle = computed(() => ({
  fontSize: '14px',
  color: '#ffffff',
  transition: 'transform 0.2s ease',
  fontFamily: 'Arial, sans-serif'
}))

// Drawer styles
const overlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1500,
  opacity: isTextureDrawerOpen.value ? '1' : '0',
  visibility: isTextureDrawerOpen.value ? 'visible' : 'hidden',
  transition: 'opacity 0.3s ease, visibility 0.3s ease'
}))

const drawerStyle = computed(() => ({
  position: isMobileDevice.value ? 'fixed' : 'absolute',
  top: isMobileDevice.value ? '0' : '130px',
  left: isMobileDevice.value ? '0' : '0',
  height: isMobileDevice.value ? '100vh' : '100vh',
  width: isMobileDevice.value ? '100vw' : '480px',
  maxWidth: isMobileDevice.value ? '100vw' : '500px',
  backgroundColor: '#ffffff',
  boxShadow: isMobileDevice.value ? 'none' : '2px 0 20px rgba(0, 0, 0, 0.15)',
  zIndex: 1700,
  transform: isTextureDrawerOpen.value ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease',
  overflowY: 'hidden',
  fontFamily: 'Arial, sans-serif',
  display: 'flex',
  flexDirection: 'column'
}))

const drawerHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  position: 'sticky',
  top: '0',
  zIndex: 10,
  flexShrink: 0
}))

const drawerTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '18px' : '20px',
  fontWeight: 'bold',
  color: '#1f2937',
  fontFamily: 'Arial, sans-serif'
}))

const drawerCloseButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  color: '#6b7280',
  padding: '8px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const drawerContentStyle = computed(() => ({
  padding: '20px',
  flexGrow: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  height: '0',
  minHeight: '0'
}))

const drawerSectionStyle = computed(() => ({
  marginBottom: '20px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden'
}))

const drawerSubHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px',
  color: 'white',
  cursor: 'pointer',
  backgroundColor: '#29275B',
  transition: 'background-color 0.2s ease',
  borderBottom: '1px solid #e5e7eb'
}))

const drawerSubTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '15px' : '16px',
  fontWeight: '600',
  color: '#fff',
  fontFamily: 'Arial, sans-serif'
}))

const textureGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: isMobileDevice.value ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
  gap: '12px',
  padding: '15px'
}))

const textureLabelStyle = computed(() => ({
  fontSize: isMobileDevice.value ? '11px' : '12px',
  color: '#6b7280',
  textAlign: 'center',
  fontWeight: '500',
  lineHeight: '1.3',
  fontFamily: 'Arial, sans-serif'
}))

// Styles for new category design
const categoriesContainerStyle = computed(() => ({
  padding: '10px',
  backgroundColor: '#ffffff'
}))

const categoryIconStyle = computed(() => ({
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#29275B',
  flexShrink: 0,
  position: 'relative'
}))

//For measurement
const helpTextStyle = computed(() => ({
  fontSize: '12px',
  color: '#6c757d',
  lineHeight: '1.4',
  margin: '0',
  fontStyle: 'italic'
}))

const categoryLabelStyle = computed(() => ({
  fontSize: '15px',
  fontWeight: '500',
  color: '#374151',
  fontFamily: 'Arial, sans-serif'
}))
// Add these to your existing reactive data
const searchQuery = ref('')
const searchFocused = ref(false)
const searchResults = ref([])
const isSearching = ref(false);
const hasSearched = ref(false);

// Search functionality methods
const handleSearchInput = () => {
  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  // Show loading state for better UX
  isSearching.value = true;

  // Debounce the search
  searchTimeout = setTimeout(async () => {
    const query = searchQuery.value.trim();

    if (query) {
      hasSearched.value = true;
      performSearch(query);

      await Promise.resolve(); // or nextTick()
      if (searchResults.value.length > 0) {
        searchTriggered.value++;
        openProductDrawerWithFilteredResults();
      }
    } else {
      searchResults.value = [];
      hasSearched.value = false;
      if (selectedCategory.value === 'search') {
        isProductDrawerOpen.value = false;
        selectedCategory.value = '';
      }
    }

    isSearching.value = false;
  }, 300); // 300ms debounce
};

const handleSearchEnter = () => {
  // Clear any pending timeout since user pressed enter
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (searchQuery.value.trim()) {
    performSearch(searchQuery.value.trim());
    if (searchResults.value.length > 0) {
      searchTriggered.value++;
      openProductDrawerWithFilteredResults();
    }
  }
};

const handleSearchFocus = () => {
  searchFocused.value = true
}

const handleSearchBlur = () => {
  searchFocused.value = false
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  hasSearched.value = false

  // If the drawer is open with search results, close it
  if (selectedCategory.value === 'search') {
    isProductDrawerOpen.value = false
    selectedCategory.value = ''
  }
}

// Search logic - searches through productData by name and SKU
const performSearch = (query) => {
  const results = [];
  const lowerQuery = query.toLowerCase();

  console.log('🔍 Starting live search for:', query);

  // Your existing search logic (exact SKU match first)
  let exactSkuMatch = null;

  Object.entries(productData).forEach(([category, products]) => {
    products.forEach((product) => {
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach((variant) => {
          if (variant.sku && variant.sku.toLowerCase() === lowerQuery) {
            console.log('✅ EXACT SKU MATCH FOUND:', variant.sku);
            exactSkuMatch = {
              category,
              product: { ...product },
              matchingVariant: { ...variant },
              matchType: 'exact_sku',
              isExactMatch: true
            };
          }
        });
      }
    });
  });

  if (exactSkuMatch) {
    console.log('🎯 Returning single exact SKU match:', exactSkuMatch);
    searchResults.value = [exactSkuMatch];
    return;
  }

  // Regular search logic for partial matches
  Object.entries(productData).forEach(([category, products]) => {
    products.forEach((product) => {
      // Search in product name
      const name = (product.name || '').toLowerCase()
      const matchesName = name.includes(lowerQuery);

      // Search in variants/SKUs
      let matchingVariant = null;
      if (product.variants && Array.isArray(product.variants)) {
        matchingVariant = product.variants.find(variant =>
            variant.sku && variant.sku.toLowerCase().includes(lowerQuery)
        );
      }

      if (matchesName || matchingVariant) {
        const result = {
          category,
          product: { ...product },
          matchingVariant: matchingVariant ? { ...matchingVariant } : null,
          matchType: matchesName ? 'name' : 'variant',
          isExactMatch: false
        };
        results.push(result);
      }
    });
  });

  console.log(`🔍 Live search completed. Found ${results.length} results:`, results);
  searchResults.value = results;
};

// Open product drawer with filtered search results
const openProductDrawerWithFilteredResults = () => {
  if (searchResults.value.length === 0) {
    // If no results, close the drawer
    if (selectedCategory.value === 'search') {
      isProductDrawerOpen.value = false;
      selectedCategory.value = '';
    }
    return;
  }

  console.log(`🔍 Opening live search results:`, searchResults.value);

  // FIXED: Force drawer to close and reopen to reset internal state
  if (isProductDrawerOpen.value && selectedCategory.value !== 'search') {
    isProductDrawerOpen.value = false;

    // Use setTimeout to ensure drawer closes before reopening
    setTimeout(() => {
      selectedCategory.value = 'search';
      isProductDrawerOpen.value = true;
      isLoading.value = false;
    }, 10); // Very short delay
  } else {
    // Normal flow - just open with search results
    selectedCategory.value = 'search';
    isProductDrawerOpen.value = true;
    isLoading.value = false;
  }
};

// Computed styles - matching your existing design patterns
const searchSectionStyle = computed(() => ({
  padding: '15px 20px',
  borderBottom: '1px solid #e0e0e0',
  backgroundColor: '#ffffff',
  // Removed sticky positioning to prevent z-index conflicts
  marginBottom: '5px',
  zIndex: '9999999',
  position: 'absolute',
  top: isMobileDevice.value ? '0' : '60px',
  width: isMobileDevice.value ? '100vw' : '480px',
  maxWidth: isMobileDevice.value ? '100vw' : '500px',
}))

const searchContainerStyle = computed(() => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#f8fafc',
  border: `2px solid ${searchFocused.value ? '#29275B' : '#e5e7eb'}`,
  borderRadius: '10px',
  padding: '0',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: searchFocused.value
      ? '0 0 0 4px rgba(41, 39, 91, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15)'
      : '0 2px 6px rgba(0, 0, 0, 0.08)',
  transform: searchFocused.value ? 'translateY(-1px)' : 'translateY(0)'
}))

const searchIconStyle = computed(() => ({
  padding: '12px 16px',
  color: searchFocused.value ? '#29275B' : '#9ca3af',
  transition: 'color 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0
}))

const searchInputStyle = computed(() => ({
  flex: 1,
  border: 'none',
  outline: 'none',
  backgroundColor: 'transparent',
  padding: '12px 8px',
  fontSize: '14px',
  fontWeight: '500',
  color: '#333',
  fontFamily: 'Arial, sans-serif',
  '::placeholder': {
    color: '#9ca3af'
  }
}))

const clearButtonStyle = computed(() => ({
  padding: '8px 12px',
  backgroundColor: 'transparent',
  border: 'none',
  color: '#9ca3af',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  borderRadius: '4px',
  transition: 'all 0.2s ease',
  flexShrink: 0,
  ':hover': {
    backgroundColor: '#f3f4f6',
    color: '#6b7280'
  }
}))

const searchResultsCountStyle = computed(() => ({
  marginTop: '8px',
  fontSize: '12px',
  color: '#29275B',
  fontWeight: '500',
  fontFamily: 'Arial, sans-serif'
}))

const noResultsStyle = computed(() => ({
  marginTop: '8px',
  fontSize: '12px',
  color: '#9ca3af',
  fontStyle: 'italic',
  fontFamily: 'Arial, sans-serif'
}))
</script>

<style scoped>
/* NEW: Keyframe animation for tiny loading spinner */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Category item hover effects (keeping your exact original styles) */
.category-item:hover {
  background-color: #f9fafb !important;
  border-color: #29275B !important;
  transform: translateY(-1px);
}

.category-item:hover .category-icon {
  color: #29275B !important;
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

/* Enhanced modern input styles */
.modern-number-input {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 2px solid #e5e7eb !important;
  border-radius: 10px !important;
  padding: 12px 16px !important;
  font-weight: 600 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
}

.modern-number-input:hover {
  border-color: #9ca3af !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
  transform: translateY(-1px) !important;
}

.modern-number-input:focus {
  border-color: #29275B !important;
  box-shadow: 0 0 0 4px rgba(41, 39, 91, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-1px) !important;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%) !important;
}

.modern-number-input::-webkit-outer-spin-button,
.modern-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

.modern-number-input {
  -moz-appearance: textfield !important;
}

/* Enhanced slider styles */
.modern-slider {
  appearance: none !important;
  height: 8px !important;
  border-radius: 4px !important;
  background: linear-gradient(to right, #e5e7eb 0%, #e5e7eb 100%) !important;
  outline: none !important;
  transition: all 0.2s ease !important;
}

.modern-slider:hover {
  background: linear-gradient(to right, #d1d5db 0%, #d1d5db 100%) !important;
}

.modern-slider::-webkit-slider-thumb {
  appearance: none !important;
  width: 24px !important;
  height: 24px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #29275B 0%, #1e1b47 100%) !important;
  cursor: pointer !important;
  box-shadow: 0 3px 10px rgba(41, 39, 91, 0.3) !important;
  transition: all 0.2s ease !important;
  border: 3px solid #ffffff !important;
}

.modern-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 5px 15px rgba(41, 39, 91, 0.4) !important;
}

.modern-slider::-moz-range-thumb {
  width: 24px !important;
  height: 24px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #29275B 0%, #1e1b47 100%) !important;
  cursor: pointer !important;
  border: 3px solid #ffffff !important;
  box-shadow: 0 3px 10px rgba(41, 39, 91, 0.3) !important;
  transition: all 0.2s ease !important;
}

.modern-slider::-moz-range-thumb:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 5px 15px rgba(41, 39, 91, 0.4) !important;
}

@media (max-width: 768px) {
  .modern-slider::-webkit-slider-thumb {
    width: 26px !important;
    height: 26px !important;
  }

  .modern-slider::-moz-range-thumb {
    width: 26px !important;
    height: 26px !important;
  }

  .modern-number-input {
    font-size: 14px !important;
    padding: 10px 14px !important;
  }
}
/* Search input specific styles */
.search-input::placeholder {
  color: #9ca3af;
  opacity: 1;
}

.search-input:focus::placeholder {
  color: #d1d5db;
}

.clear-search-button:hover {
  background-color: #f3f4f6 !important;
  color: #6b7280 !important;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .search-input {
    font-size: 16px !important; /* Prevents zoom on iOS */
  }
}
</style>
