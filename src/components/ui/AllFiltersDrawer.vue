<template>
  <Teleport to="body">
    <div class="all-filters-wrapper" :class="{ 'is-open': isOpen }">
      <!-- Overlay -->
      <div class="filters-overlay" @click="closeDrawer"></div>

      <!-- Drawer -->
      <div class="filters-drawer" :class="{ 'is-open': isOpen }">
        <!-- Header -->
        <div class="filters-header">
          <h2 class="filters-title">All Filters</h2>
          <button class="filters-close" @click="closeDrawer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Filter Sections -->
        <div class="filters-content">
          <!-- Dynamic Primary Filter Sections (Length, Type, Finish, etc.) -->
          <div
              v-for="filterKey in primaryFilters"
              :key="'primary-' + filterKey"
              class="filter-section"
          >
            <!-- Range Slider for dimension filters (length, width, height, depth) -->
            <template v-if="isRangeFilter(filterKey) && hasRangeBounds(filterKey)">
              <button class="filter-section-header" @click="toggleSection(filterKey)">
                <span>{{ getFilterLabel(filterKey) }}</span>
                <svg
                    class="filter-section-arrow"
                    :class="{ 'is-open': openSections[filterKey] }"
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div v-if="openSections[filterKey]" class="filter-section-content">
                <div class="range-filter-container">
                  <!-- Input fields for min/max -->
                  <div class="range-inputs">
                    <div class="range-input-group">
                      <label class="range-input-label">Min</label>
                      <div class="range-input-wrapper">
                        <input
                            type="number"
                            :value="getMinInputValue(filterKey)"
                            @focus="handleMinInputFocus(filterKey)"
                            @input="updateRangeMinInput(filterKey, $event)"
                            @blur="validateRangeMinInput(filterKey, $event)"
                            :min="rangeBounds[filterKey]?.min"
                            :max="rangeBounds[filterKey]?.max"
                            class="range-number-input"
                        />
                        <span class="range-input-unit">{{ getFilterUnit(filterKey) }}</span>
                      </div>
                    </div>
                    <div class="range-input-separator">-</div>
                    <div class="range-input-group">
                      <label class="range-input-label">Max</label>
                      <div class="range-input-wrapper">
                        <input
                            type="number"
                            :value="getMaxInputValue(filterKey)"
                            @focus="handleMaxInputFocus(filterKey)"
                            @input="updateRangeMaxInput(filterKey, $event)"
                            @blur="validateRangeMaxInput(filterKey, $event)"
                            :min="rangeBounds[filterKey]?.min"
                            :max="rangeBounds[filterKey]?.max"
                            class="range-number-input"
                        />
                        <span class="range-input-unit">{{ getFilterUnit(filterKey) }}</span>
                      </div>
                    </div>
                  </div>
                  <!-- Dual range slider -->
                  <div class="dual-range-slider" @mousemove="handleRangeMouseMove(filterKey, $event)">
                    <div class="slider-track"></div>
                    <div
                        class="slider-range"
                        :style="getRangeSliderStyle(filterKey)"
                    ></div>
                    <input
                        type="range"
                        :min="rangeBounds[filterKey]?.min"
                        :max="rangeBounds[filterKey]?.max"
                        :value="getRangeDisplayMin(filterKey)"
                        @input="updateRangeMin(filterKey, $event)"
                        class="range-input range-min"
                        :class="{ 'on-top': isMinSliderOnTop(filterKey) }"
                    />
                    <input
                        type="range"
                        :min="rangeBounds[filterKey]?.min"
                        :max="rangeBounds[filterKey]?.max"
                        :value="getRangeDisplayMax(filterKey)"
                        @input="updateRangeMax(filterKey, $event)"
                        class="range-input range-max"
                        :class="{ 'on-top': !isMinSliderOnTop(filterKey) }"
                    />
                  </div>
                </div>
              </div>
            </template>
            <!-- Checkbox list for non-range filters -->
            <template v-else-if="getFilterOptions(filterKey).length > 0">
              <button class="filter-section-header" @click="toggleSection(filterKey)">
                <span>{{ getFilterLabel(filterKey) }}</span>
                <svg
                    class="filter-section-arrow"
                    :class="{ 'is-open': openSections[filterKey] }"
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div v-if="openSections[filterKey]" class="filter-section-content">
                <div class="filter-options-grid">
                  <label v-for="option in getFilterOptions(filterKey)" :key="option.value" class="filter-checkbox-label">
                    <input
                        type="checkbox"
                        :checked="isFilterSelected(filterKey, option.value)"
                        @change="toggleFilter(filterKey, option.value)"
                        class="filter-checkbox"
                    />
                    <span>{{ option.label }}</span>
                  </label>
                </div>
              </div>
            </template>
          </div>

          <!-- Dynamic Secondary Filter Sections -->
          <div
              v-for="filterKey in secondaryFilters"
              :key="'secondary-' + filterKey"
              class="filter-section"
          >
            <!-- Range Slider for dimension filters (length, width, height, depth) -->
            <template v-if="isRangeFilter(filterKey) && hasRangeBounds(filterKey)">
              <button class="filter-section-header" @click="toggleSection(filterKey)">
                <span>{{ getFilterLabel(filterKey) }}</span>
                <svg
                    class="filter-section-arrow"
                    :class="{ 'is-open': openSections[filterKey] }"
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div v-if="openSections[filterKey]" class="filter-section-content">
                <div class="range-filter-container">
                  <!-- Input fields for min/max -->
                  <div class="range-inputs">
                    <div class="range-input-group">
                      <label class="range-input-label">Min</label>
                      <div class="range-input-wrapper">
                        <input
                            type="number"
                            :value="getMinInputValue(filterKey)"
                            @focus="handleMinInputFocus(filterKey)"
                            @input="updateRangeMinInput(filterKey, $event)"
                            @blur="validateRangeMinInput(filterKey, $event)"
                            :min="rangeBounds[filterKey]?.min"
                            :max="rangeBounds[filterKey]?.max"
                            class="range-number-input"
                        />
                        <span class="range-input-unit">{{ getFilterUnit(filterKey) }}</span>
                      </div>
                    </div>
                    <div class="range-input-separator">-</div>
                    <div class="range-input-group">
                      <label class="range-input-label">Max</label>
                      <div class="range-input-wrapper">
                        <input
                            type="number"
                            :value="getMaxInputValue(filterKey)"
                            @focus="handleMaxInputFocus(filterKey)"
                            @input="updateRangeMaxInput(filterKey, $event)"
                            @blur="validateRangeMaxInput(filterKey, $event)"
                            :min="rangeBounds[filterKey]?.min"
                            :max="rangeBounds[filterKey]?.max"
                            class="range-number-input"
                        />
                        <span class="range-input-unit">{{ getFilterUnit(filterKey) }}</span>
                      </div>
                    </div>
                  </div>
                  <!-- Dual range slider -->
                  <div class="dual-range-slider" @mousemove="handleRangeMouseMove(filterKey, $event)">
                    <div class="slider-track"></div>
                    <div
                        class="slider-range"
                        :style="getRangeSliderStyle(filterKey)"
                    ></div>
                    <input
                        type="range"
                        :min="rangeBounds[filterKey]?.min"
                        :max="rangeBounds[filterKey]?.max"
                        :value="getRangeDisplayMin(filterKey)"
                        @input="updateRangeMin(filterKey, $event)"
                        class="range-input range-min"
                        :class="{ 'on-top': isMinSliderOnTop(filterKey) }"
                    />
                    <input
                        type="range"
                        :min="rangeBounds[filterKey]?.min"
                        :max="rangeBounds[filterKey]?.max"
                        :value="getRangeDisplayMax(filterKey)"
                        @input="updateRangeMax(filterKey, $event)"
                        class="range-input range-max"
                        :class="{ 'on-top': !isMinSliderOnTop(filterKey) }"
                    />
                  </div>
                </div>
              </div>
            </template>
            <!-- Checkbox list for non-range filters -->
            <template v-else-if="getFilterOptions(filterKey).length > 0">
              <button class="filter-section-header" @click="toggleSection(filterKey)">
                <span>{{ getFilterLabel(filterKey) }}</span>
                <svg
                    class="filter-section-arrow"
                    :class="{ 'is-open': openSections[filterKey] }"
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div v-if="openSections[filterKey]" class="filter-section-content">
                <div class="filter-options-grid">
                  <label v-for="option in getFilterOptions(filterKey)" :key="option.value" class="filter-checkbox-label">
                    <input
                        type="checkbox"
                        :checked="isFilterSelected(filterKey, option.value)"
                        @change="toggleFilter(filterKey, option.value)"
                        class="filter-checkbox"
                    />
                    <span>{{ option.label }}</span>
                  </label>
                </div>
              </div>
            </template>
          </div>

          <!-- Price Range Section (always shown if products have prices) -->
          <div v-if="hasProductsWithPrices" class="filter-section">
            <button class="filter-section-header" @click="toggleSection('price')">
              <span>Price Range</span>
              <svg
                  class="filter-section-arrow"
                  :class="{ 'is-open': openSections.price }"
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div v-if="openSections.price" class="filter-section-content">
              <div class="price-range-container">
                <div class="price-range-labels">
                  <span>£{{ displayPriceMin }}</span>
                  <span>£{{ displayPriceMax }}</span>
                </div>
                <div class="dual-range-slider" @mousemove="handlePriceMouseMove">
                  <div class="slider-track"></div>
                  <div
                      class="slider-range"
                      :style="sliderRangeStyle"
                  ></div>
                  <input
                      type="range"
                      :min="minPrice"
                      :max="maxPrice"
                      :value="displayPriceMin"
                      @input="updateMinPrice"
                      class="range-input range-min"
                      :class="{ 'on-top': activePriceSlider === 'min' }"
                  />
                  <input
                      type="range"
                      :min="minPrice"
                      :max="maxPrice"
                      :value="displayPriceMax"
                      @input="updateMaxPrice"
                      class="range-input range-max"
                      :class="{ 'on-top': activePriceSlider === 'max' }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Background Filters Section (preserved from search view) -->
          <div v-if="hasBackgroundFilters" class="filter-section background-filters-section">
            <div class="background-filters-header">
              <span class="background-filters-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                Filters from Search
              </span>
              <button class="background-filters-clear" @click="handleClearBackgroundFilters">
                Clear
              </button>
            </div>
            <div class="background-filters-content">
              <!-- Style filters -->
              <div v-if="backgroundFilters.style && backgroundFilters.style.length > 0" class="background-filter-item">
                <span class="background-filter-label">Style:</span>
                <span class="background-filter-values">{{ backgroundFilters.style.join(', ') }}</span>
              </div>
              <!-- Price filter -->
              <div v-if="backgroundFilters.priceMin !== null || backgroundFilters.priceMax !== null" class="background-filter-item">
                <span class="background-filter-label">Price:</span>
                <span class="background-filter-values">
                  <template v-if="backgroundFilters.priceMin !== null && backgroundFilters.priceMax !== null">
                    £{{ backgroundFilters.priceMin }} - £{{ backgroundFilters.priceMax }}
                  </template>
                  <template v-else-if="backgroundFilters.priceMin !== null">
                    From £{{ backgroundFilters.priceMin }}
                  </template>
                  <template v-else>
                    Up to £{{ backgroundFilters.priceMax }}
                  </template>
                </span>
              </div>
            </div>
          </div>

          <!-- Empty state when no filters available -->
          <EmptyState
            v-if="primaryFilters.length === 0 && secondaryFilters.length === 0 && !hasProductsWithPrices"
            message="No filters available for this category."
            size="compact"
            :show-icon="false"
          />
        </div>

        <!-- Footer -->
        <div class="filters-footer">
          <button class="filters-clear-btn" @click="clearAllFilters">
            Clear All
          </button>
          <button class="filters-apply-btn" @click="applyFilters">
            Show {{ filteredCount }} Results
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, reactive, defineOptions } from 'vue'
import { useGtm } from '@gtm-support/vue-gtm'
import { getPrimaryFilters, getSecondaryFilters, getFilterLabel as getLabel, EMPTY_FILTERS, createEmptyFilters, isRangeFilter, RANGE_FILTERS } from '../../constants/filters'
import { extractFilterOptions, filterProducts, filterProductVariants, extractRangeBounds } from '../../utils/filters'
import EmptyState from './EmptyState.vue'

// Disable attribute inheritance since we use Teleport as root
defineOptions({
  inheritAttrs: false
})

const gtm = useGtm()

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    required: true
  },
  products: {
    type: Array,
    default: () => []
  },
  selectedFilters: {
    type: Object,
    default: () => createEmptyFilters()
  },
  // Background filters preserved from search view transition
  backgroundFilters: {
    type: Object,
    default: () => ({
      style: [],
      priceMin: null,
      priceMax: null
    })
  }
})

const emit = defineEmits(['close', 'update:filters', 'clear-background-filters'])

// Compute min price from products
const minPrice = computed(() => {
  let min = Infinity
  for (const product of props.products) {
    // Check product-level price
    const productPrice = parsePrice(product.price)
    if (productPrice !== null && productPrice < min) {
      min = productPrice
    }
    // Check variant prices
    if (product.variants) {
      for (const variant of product.variants) {
        const variantPrice = parsePrice(variant.price)
        if (variantPrice !== null && variantPrice < min) {
          min = variantPrice
        }
      }
    }
  }
  // Round down to nearest 10 for nicer slider range, default to 0 if no products
  return min === Infinity ? 0 : Math.floor(min / 10) * 10
})

// Compute max price from products
const maxPrice = computed(() => {
  let max = 0
  for (const product of props.products) {
    // Check product-level price
    const productPrice = parsePrice(product.price)
    if (productPrice !== null && productPrice > max) {
      max = productPrice
    }
    // Check variant prices
    if (product.variants) {
      for (const variant of product.variants) {
        const variantPrice = parsePrice(variant.price)
        if (variantPrice !== null && variantPrice > max) {
          max = variantPrice
        }
      }
    }
  }
  // Round up to nearest 10 for nicer slider range
  return Math.ceil(max / 10) * 10 || 1000
})

// Helper to parse price (handles both string and number, including currency-formatted strings)
function parsePrice(price) {
  if (typeof price === 'number') return price
  if (typeof price === 'string') {
    // Normalize: trim whitespace, remove currency symbols and thousands separators
    // Keep only digits, optional leading minus, and decimal point
    const normalized = price.trim().replace(/[^0-9.\-]/g, '')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

// Compute range bounds for dimension filters (length, width, height, depth)
const rangeBounds = computed(() => {
  const bounds = {}
  for (const rangeKey of RANGE_FILTERS) {
    const result = extractRangeBounds(props.products, rangeKey)
    if (result) {
      bounds[rangeKey] = {
        min: Math.floor(result.min),
        max: Math.ceil(result.max)
      }
    }
  }
  return bounds
})

// Check if a range filter has valid bounds (products have values for this filter)
const hasRangeBounds = (filterKey) => {
  return !!rangeBounds.value[filterKey]
}

// Get display values for range filters
const getRangeDisplayMin = (filterKey) => {
  const bounds = rangeBounds.value[filterKey]
  if (!bounds) return 0
  const minKey = `${filterKey}Min`
  const value = localFilters.value[minKey]
  return (value === undefined || value < bounds.min) ? bounds.min : value
}

const getRangeDisplayMax = (filterKey) => {
  const bounds = rangeBounds.value[filterKey]
  if (!bounds) return 0
  const maxKey = `${filterKey}Max`
  const value = localFilters.value[maxKey]
  return (value === undefined || value > bounds.max) ? bounds.max : value
}

// Get slider range style for dimension filters
const getRangeSliderStyle = (filterKey) => {
  const bounds = rangeBounds.value[filterKey]
  if (!bounds) return { left: '0%', width: '100%' }

  const min = bounds.min
  const max = bounds.max
  const currentMin = Math.max(localFilters.value[`${filterKey}Min`] ?? min, min)
  const currentMax = Math.min(localFilters.value[`${filterKey}Max`] ?? max, max)

  const range = max - min
  if (range <= 0) return { left: '0%', width: '100%' }

  const minPercent = Math.max(0, Math.min(100, ((currentMin - min) / range) * 100))
  const maxPercent = Math.max(0, Math.min(100, ((currentMax - min) / range) * 100))

  return {
    left: `${minPercent}%`,
    width: `${Math.max(0, maxPercent - minPercent)}%`
  }
}

// Track which range slider thumb should be on top (for handling overlapping thumbs)
const activeRangeSlider = reactive({})

// Update range filter min value from slider
const updateRangeMin = (filterKey, event) => {
  const value = parseInt(event.target.value)
  const maxKey = `${filterKey}Max`
  const currentMax = localFilters.value[maxKey] ?? rangeBounds.value[filterKey]?.max ?? Infinity

  // Allow movement up to and including max position
  localFilters.value[`${filterKey}Min`] = Math.min(value, currentMax)

  // When min reaches max, set active to 'min' so user can drag it back left
  if (value >= currentMax) {
    activeRangeSlider[filterKey] = 'min'
  }
}

// Update range filter max value from slider
const updateRangeMax = (filterKey, event) => {
  const value = parseInt(event.target.value)
  const minKey = `${filterKey}Min`
  const currentMin = localFilters.value[minKey] ?? rangeBounds.value[filterKey]?.min ?? 0

  // Allow movement down to and including min position
  localFilters.value[`${filterKey}Max`] = Math.max(value, currentMin)

  // When max reaches min, set active to 'max' so user can drag it back right
  if (value <= currentMin) {
    activeRangeSlider[filterKey] = 'max'
  }
}

// Handle mouse enter on range slider to determine which thumb should be on top
const handleRangeMouseMove = (filterKey, event) => {
  const bounds = rangeBounds.value[filterKey]
  if (!bounds) return

  const rect = event.currentTarget.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  const valueAtMouse = bounds.min + percent * (bounds.max - bounds.min)

  const currentMin = localFilters.value[`${filterKey}Min`] ?? bounds.min
  const currentMax = localFilters.value[`${filterKey}Max`] ?? bounds.max
  const midpoint = (currentMin + currentMax) / 2

  // If mouse is closer to the left, make min slider active (on top)
  // If mouse is closer to the right, make max slider active (on top)
  activeRangeSlider[filterKey] = valueAtMouse < midpoint ? 'min' : 'max'
}

// Check if min slider should be on top for a given filter
const isMinSliderOnTop = (filterKey) => {
  return activeRangeSlider[filterKey] === 'min'
}

// Track which input is currently being edited (to prevent value override)
const editingInput = reactive({})

// Get the display value for min input (returns empty string if editing)
const getMinInputValue = (filterKey) => {
  if (editingInput[`${filterKey}Min`] !== undefined) {
    return editingInput[`${filterKey}Min`]
  }
  return getRangeDisplayMin(filterKey)
}

// Get the display value for max input (returns empty string if editing)
const getMaxInputValue = (filterKey) => {
  if (editingInput[`${filterKey}Max`] !== undefined) {
    return editingInput[`${filterKey}Max`]
  }
  return getRangeDisplayMax(filterKey)
}

// Handle focus on min input
const handleMinInputFocus = (filterKey) => {
  editingInput[`${filterKey}Min`] = getRangeDisplayMin(filterKey)
}

// Handle focus on max input
const handleMaxInputFocus = (filterKey) => {
  editingInput[`${filterKey}Max`] = getRangeDisplayMax(filterKey)
}

// Update range filter min value from input field (real-time as user types)
const updateRangeMinInput = (filterKey, event) => {
  const inputValue = event.target.value
  editingInput[`${filterKey}Min`] = inputValue

  const value = parseInt(inputValue)
  if (!isNaN(value)) {
    // Update slider position in real-time
    localFilters.value[`${filterKey}Min`] = value
  }
}

// Update range filter max value from input field (real-time as user types)
const updateRangeMaxInput = (filterKey, event) => {
  const inputValue = event.target.value
  editingInput[`${filterKey}Max`] = inputValue

  const value = parseInt(inputValue)
  if (!isNaN(value)) {
    // Update slider position in real-time
    localFilters.value[`${filterKey}Max`] = value
  }
}

// Validate and clamp range min value on blur
const validateRangeMinInput = (filterKey, event) => {
  const value = parseInt(event.target.value)
  const bounds = rangeBounds.value[filterKey]

  // Clear editing state
  delete editingInput[`${filterKey}Min`]

  if (!bounds) return

  const maxKey = `${filterKey}Max`
  const currentMax = localFilters.value[maxKey] ?? bounds.max

  // If empty or invalid, reset to bounds.min
  if (isNaN(value) || event.target.value === '') {
    localFilters.value[`${filterKey}Min`] = bounds.min
    return
  }

  // Clamp between bounds.min and currentMax (can't exceed the max handle)
  const clampedValue = Math.max(bounds.min, Math.min(value, currentMax))
  localFilters.value[`${filterKey}Min`] = clampedValue
}

// Validate and clamp range max value on blur
const validateRangeMaxInput = (filterKey, event) => {
  const value = parseInt(event.target.value)
  const bounds = rangeBounds.value[filterKey]

  // Clear editing state
  delete editingInput[`${filterKey}Max`]

  if (!bounds) return

  const minKey = `${filterKey}Min`
  const currentMin = localFilters.value[minKey] ?? bounds.min

  // If empty or invalid, reset to bounds.max
  if (isNaN(value) || event.target.value === '') {
    localFilters.value[`${filterKey}Max`] = bounds.max
    return
  }

  // Clamp between currentMin and bounds.max (can't go below the min handle)
  const clampedValue = Math.max(currentMin, Math.min(value, bounds.max))
  localFilters.value[`${filterKey}Max`] = clampedValue
}

// Get unit suffix for a filter (mm for dimensions)
const getFilterUnit = (filterKey) => {
  if (['length', 'width', 'height', 'depth'].includes(filterKey)) {
    return 'mm'
  }
  return ''
}

// Local copy of filters for editing (initialized in watch below after maxPrice is available)
const localFilters = ref(createEmptyFilters())

// Open/closed state for sections (reactive object to handle dynamic keys)
const openSections = reactive({
  price: true // Price section open by default
})

// Get primary filters for this category (shown in chips)
const primaryFilters = computed(() => {
  return getPrimaryFilters(props.category)
})

// Get secondary filters for this category
const secondaryFilters = computed(() => {
  return getSecondaryFilters(props.category)
})

// Initialize open sections for primary filters
watch(primaryFilters, (filters) => {
  for (const filterKey of filters) {
    if (openSections[filterKey] === undefined) {
      openSections[filterKey] = true // Default to open
    }
  }
}, { immediate: true })

// Initialize open sections for secondary filters
watch(secondaryFilters, (filters) => {
  for (const filterKey of filters) {
    if (openSections[filterKey] === undefined) {
      openSections[filterKey] = true // Default to open
    }
  }
}, { immediate: true })

// Get filter label for display (with category prefix)
const getFilterLabel = (filterKey) => {
  const baseLabel = getLabel(filterKey)
  // Add category prefix for clarity (e.g., "Bath Length" instead of just "Length")
  if (props.category) {
    return `${props.category} ${baseLabel}`
  }
  return baseLabel
}

// Get filter options for a specific filter key
const getFilterOptions = (filterKey) => {
  return extractFilterOptions(props.products, filterKey)
}

// Check if a filter value is selected
const isFilterSelected = (filterKey, value) => {
  const values = localFilters.value[filterKey]
  return Array.isArray(values) && values.includes(value)
}

// Computed display values for price labels (ensures they stay within valid range)
const displayPriceMin = computed(() => {
  const min = minPrice.value
  const value = localFilters.value.priceMin
  // If value is less than dynamic min, show the dynamic min
  return (value === undefined || value < min) ? min : value
})

const displayPriceMax = computed(() => {
  const max = maxPrice.value
  const value = localFilters.value.priceMax
  // If value is undefined or greater than dynamic max, show the dynamic max
  return (value === undefined || value > max) ? max : value
})

// Computed style for the range slider highlight
const sliderRangeStyle = computed(() => {
  const min = minPrice.value
  const max = maxPrice.value

  // Use dynamic min/max as defaults if localFilters values are out of range
  const currentMin = Math.max(localFilters.value.priceMin ?? min, min)
  const currentMax = Math.min(localFilters.value.priceMax ?? max, max)

  // Calculate percentages, clamping to 0-100 range
  const range = max - min
  if (range <= 0) {
    return { left: '0%', width: '100%' }
  }

  const minPercent = Math.max(0, Math.min(100, ((currentMin - min) / range) * 100))
  const maxPercent = Math.max(0, Math.min(100, ((currentMax - min) / range) * 100))

  return {
    left: `${minPercent}%`,
    width: `${Math.max(0, maxPercent - minPercent)}%`
  }
})

// Track which price slider thumb should be on top
const activePriceSlider = ref('max')

// Update min price from slider
const updateMinPrice = (event) => {
  const value = parseInt(event.target.value)
  const currentMax = localFilters.value.priceMax ?? maxPrice.value

  // Allow movement up to and including max position
  localFilters.value.priceMin = Math.min(value, currentMax)

  // When min reaches max, set active to 'min' so user can drag it back left
  if (value >= currentMax) {
    activePriceSlider.value = 'min'
  }
}

// Update max price from slider
const updateMaxPrice = (event) => {
  const value = parseInt(event.target.value)
  const currentMin = localFilters.value.priceMin ?? minPrice.value

  // Allow movement down to and including min position
  localFilters.value.priceMax = Math.max(value, currentMin)

  // When max reaches min, set active to 'max' so user can drag it back right
  if (value <= currentMin) {
    activePriceSlider.value = 'max'
  }
}

// Handle mouse move on price slider to determine which thumb should be on top
const handlePriceMouseMove = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const percent = (event.clientX - rect.left) / rect.width
  const valueAtMouse = minPrice.value + percent * (maxPrice.value - minPrice.value)

  const currentMin = localFilters.value.priceMin ?? minPrice.value
  const currentMax = localFilters.value.priceMax ?? maxPrice.value
  const midpoint = (currentMin + currentMax) / 2

  // If mouse is closer to the left, make min slider active (on top)
  activePriceSlider.value = valueAtMouse < midpoint ? 'min' : 'max'
}

// Helper to check if a price is a valid, parseable numeric value
const isValidPrice = (price) => {
  if (price === null || price === undefined || price === '') return false
  if (typeof price === 'number') return isFinite(price)
  if (typeof price === 'string') {
    // Strip currency symbols and thousands separators, then parse
    const normalized = price.trim().replace(/[^0-9.\-]/g, '')
    if (normalized === '') return false
    const parsed = parseFloat(normalized)
    return isFinite(parsed)
  }
  return false
}

// Check if any products have valid numeric prices
const hasProductsWithPrices = computed(() => {
  return props.products.some(product => {
    // Check product-level price
    if (isValidPrice(product.price)) {
      return true
    }
    // Check variant prices
    if (product.variants) {
      return product.variants.some(v => isValidPrice(v.price))
    }
    return false
  })
})

// Background filters - check if any are active
const hasBackgroundFilters = computed(() => {
  const bg = props.backgroundFilters
  if (!bg) return false

  const hasStyle = bg.style && bg.style.length > 0
  const hasPrice = bg.priceMin !== null || bg.priceMax !== null

  return hasStyle || hasPrice
})

// Get background filter count for display
const backgroundFilterCount = computed(() => {
  const bg = props.backgroundFilters
  if (!bg) return 0

  let count = 0
  if (bg.style && bg.style.length > 0) {
    count += bg.style.length
  }
  if (bg.priceMin !== null || bg.priceMax !== null) {
    count += 1
  }
  return count
})

// Clear background filters handler
const handleClearBackgroundFilters = () => {
  // Track clear background filters in GTM
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'clear_background_filters',
      category: 'Filters',
      action: 'Clear Background Filters',
      label: 'Background Filters from Search',
      value: backgroundFilterCount.value
    })
  }

  emit('clear-background-filters')
}

// Count of filtered results - count matching VARIANTS, not just products
const filteredCount = computed(() => {
  const filteredProducts = filterProducts(props.products, localFilters.value)

  // Count total matching variants across all filtered products
  let variantCount = 0
  for (const product of filteredProducts) {
    const matchingVariants = filterProductVariants(product, localFilters.value)
    variantCount += matchingVariants.length
  }

  return variantCount
})

// Create local filters object from selected filters
function createLocalFilters(selectedFilters, dynamicMinPrice, dynamicMaxPrice, dynamicRangeBounds) {
  const filters = createEmptyFilters()

  // Copy over all array filters
  for (const key of Object.keys(filters)) {
    if (key === 'priceMin') {
      // Use the dynamic min price as default instead of hardcoded 0
      filters[key] = selectedFilters[key] ?? dynamicMinPrice
    } else if (key === 'priceMax') {
      // Use the dynamic max price as default instead of hardcoded value
      filters[key] = selectedFilters[key] ?? dynamicMaxPrice
    } else if (Array.isArray(selectedFilters[key])) {
      filters[key] = [...selectedFilters[key]]
    }
  }

  // Initialize dimension range filter values from selectedFilters ONLY if explicitly set
  // Don't default to bounds - that would make the filter "active" when user hasn't changed it
  for (const rangeKey of RANGE_FILTERS) {
    const minKey = `${rangeKey}Min`
    const maxKey = `${rangeKey}Max`

    // Only copy if selectedFilters explicitly has a value (not undefined)
    if (selectedFilters[minKey] !== undefined) {
      filters[minKey] = selectedFilters[minKey]
    }
    if (selectedFilters[maxKey] !== undefined) {
      filters[maxKey] = selectedFilters[maxKey]
    }
  }

  return filters
}

// Sync local filters when props change
watch(() => props.selectedFilters, (newFilters) => {
  localFilters.value = createLocalFilters(newFilters, minPrice.value, maxPrice.value, rangeBounds.value)
}, { deep: true })

// Reset local filters when drawer opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    localFilters.value = createLocalFilters(props.selectedFilters, minPrice.value, maxPrice.value, rangeBounds.value)
  }
})

// Initialize local filters when minPrice becomes available
watch(minPrice, (newMinPrice) => {
  // Only initialize if priceMin is still at default (undefined or 0)
  if (localFilters.value.priceMin === undefined || localFilters.value.priceMin === 0) {
    localFilters.value.priceMin = newMinPrice
  }
}, { immediate: true })

// Initialize local filters when maxPrice becomes available
watch(maxPrice, (newMaxPrice) => {
  // Only initialize if priceMax is still at default (undefined or matches EMPTY_FILTERS default)
  if (localFilters.value.priceMax === undefined || localFilters.value.priceMax === EMPTY_FILTERS.priceMax) {
    localFilters.value.priceMax = newMaxPrice
  }
}, { immediate: true })

// Initialize local filters when rangeBounds become available
// Only set values if user has explicitly set them in selectedFilters
// Leave undefined otherwise so range filters aren't treated as "active"
watch(rangeBounds, (newBounds) => {
  for (const rangeKey of RANGE_FILTERS) {
    const bounds = newBounds[rangeKey]
    if (bounds) {
      const minKey = `${rangeKey}Min`
      const maxKey = `${rangeKey}Max`

      // Check if the parent (selectedFilters) has user-defined values for this filter
      const parentMin = props.selectedFilters[minKey]
      const parentMax = props.selectedFilters[maxKey]

      // Only set if user has explicitly defined a value, and clamp to bounds
      if (parentMin !== undefined) {
        localFilters.value[minKey] = Math.max(bounds.min, Math.min(parentMin, bounds.max))
      }
      // Leave undefined if no user value - slider display handles this via getRangeDisplayMin/Max

      if (parentMax !== undefined) {
        localFilters.value[maxKey] = Math.max(bounds.min, Math.min(parentMax, bounds.max))
      }
    }
  }
}, { immediate: true, deep: true })

const toggleSection = (section) => {
  openSections[section] = !openSections[section]
}

const toggleFilter = (filterKey, value) => {
  if (!Array.isArray(localFilters.value[filterKey])) {
    localFilters.value[filterKey] = []
  }

  const index = localFilters.value[filterKey].indexOf(value)
  if (index === -1) {
    localFilters.value[filterKey].push(value)
  } else {
    localFilters.value[filterKey].splice(index, 1)
  }
}

const clearAllFilters = () => {
  // Track clear filters in GTM
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'filters_clear',
      category: 'Filters',
      action: 'Clear All',
      label: 'Clear All'
    })
  }

  // Reset local filters with dynamic price and range values for slider display
  const freshFilters = createEmptyFilters()
  freshFilters.priceMin = minPrice.value
  freshFilters.priceMax = maxPrice.value

  // Reset dimension range filters to their dynamic bounds
  for (const rangeKey of RANGE_FILTERS) {
    const bounds = rangeBounds.value[rangeKey]
    if (bounds) {
      freshFilters[`${rangeKey}Min`] = bounds.min
      freshFilters[`${rangeKey}Max`] = bounds.max
    }
  }

  localFilters.value = freshFilters
  // Emit empty filters to parent so badge count resets properly
  emit('update:filters', createEmptyFilters())
}

const applyFilters = () => {
  // Create a copy of localFilters for emission
  const filtersToEmit = { ...localFilters.value }

  // Check if we have background filters for price
  const hasBackgroundPrice = props.backgroundFilters &&
    (props.backgroundFilters.priceMin !== null || props.backgroundFilters.priceMax !== null)

  // If price values match the dynamic bounds (user didn't change them),
  // normalize to EMPTY_FILTERS values so they're not treated as active filters
  // EXCEPTION: Don't clear if the price came from background filters (preserve them)
  if (!hasBackgroundPrice &&
      localFilters.value.priceMin === minPrice.value &&
      localFilters.value.priceMax === maxPrice.value) {
    filtersToEmit.priceMin = EMPTY_FILTERS.priceMin
    filtersToEmit.priceMax = EMPTY_FILTERS.priceMax
  }

  // If dimension range values match the dynamic bounds, normalize to undefined
  // FIXED: Also clear if values are undefined (user never set them)
  for (const rangeKey of RANGE_FILTERS) {
    const bounds = rangeBounds.value[rangeKey]
    if (bounds) {
      const minKey = `${rangeKey}Min`
      const maxKey = `${rangeKey}Max`
      const minValue = localFilters.value[minKey]
      const maxValue = localFilters.value[maxKey]

      // Clear range filter if:
      // 1. Values are undefined (never set), OR
      // 2. Values match the bounds exactly
      const minMatchesBounds = minValue === undefined || minValue === bounds.min
      const maxMatchesBounds = maxValue === undefined || maxValue === bounds.max

      if (minMatchesBounds && maxMatchesBounds) {
        filtersToEmit[minKey] = undefined
        filtersToEmit[maxKey] = undefined
      }
    }
  }

  // Track apply filters in GTM
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'filters_apply',
      category: 'Filters',
      action: 'Apply',
      label: 'Apply',
      value: filteredCount.value
    })
  }

  emit('update:filters', filtersToEmit)
  closeDrawer()
}

const closeDrawer = () => {
  emit('close')
}
</script>

<style scoped>
.all-filters-wrapper {
  position: fixed;
  top: 0;
  left: 480px; /* Start at sidebar edge */
  right: 0;
  bottom: 0;
  z-index: 2000; /* Above ProductDrawer overlay (1800) and drawer (1900) */
  pointer-events: none;
  visibility: hidden;
  overflow: hidden; /* Clip the drawer as it slides out */
}

.all-filters-wrapper.is-open {
  visibility: visible;
}

.filters-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  opacity: 0;
}

.all-filters-wrapper.is-open .filters-overlay {
  opacity: 1;
  transition: opacity 0.3s ease-out;
}

.filters-drawer {
  position: absolute;
  top: 60px;
  left: 0; /* Relative to wrapper which starts at 480px */
  width: 400px;
  height: calc(100vh - 60px);
  background-color: #ffffff;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #e5e7eb;
  pointer-events: auto;
  transform: translateX(-100%); /* Hidden behind sidebar edge */
}

.filters-drawer.is-open {
  transform: translateX(0); /* Slide out to visible position */
  transition: transform 0.3s ease-out;
}

.filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.filters-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  font-family: Arial, sans-serif;
}

.filters-close {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #6b7280;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.filters-close:hover {
  background-color: #f3f4f6;
  color: #1a1a1a;
}

.filters-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.filter-section {
  border-bottom: 1px solid #e5e7eb;
}

.filter-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  cursor: pointer;
  font-family: Arial, sans-serif;
  text-align: left;
}

.filter-section-header:hover {
  background-color: #f9fafb;
}

.filter-section-arrow {
  transition: transform 0.2s ease;
  color: #6b7280;
}

.filter-section-arrow.is-open {
  transform: rotate(180deg);
}

.filter-section-content {
  padding: 0 16px 12px 16px;
}

.filter-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.filter-checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  font-family: Arial, sans-serif;
}

.filter-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #29275B;
  cursor: pointer;
  flex-shrink: 0;
}

/* Range Filter Container (for length, width, height, depth) */
.range-filter-container {
  padding: 8px 0;
}

.range-inputs {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.range-input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.range-input-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  font-family: Arial, sans-serif;
}

.range-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
  transition: border-color 0.15s ease;
}

.range-input-wrapper:focus-within {
  border-color: #29275B;
  background: #ffffff;
}

.range-number-input {
  width: 100%;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
  font-family: Arial, sans-serif;
  outline: none;
  -moz-appearance: textfield;
}

.range-number-input::-webkit-outer-spin-button,
.range-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.range-input-unit {
  font-size: 12px;
  color: #9ca3af;
  font-family: Arial, sans-serif;
  flex-shrink: 0;
}

.range-input-separator {
  font-size: 16px;
  color: #9ca3af;
  font-weight: 500;
  padding-bottom: 8px;
}

.price-range-container {
  padding: 8px 0;
}

.price-range-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  font-family: Arial, sans-serif;
}

/* Dual Range Slider */
.dual-range-slider {
  position: relative;
  height: 24px;
  margin-bottom: 20px;
}

.slider-track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
}

.slider-range {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 6px;
  background: #29275B;
  border-radius: 3px;
}

.range-input {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
  outline: none;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  background: #ffffff;
  border: 2px solid #29275B;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.range-input::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

.range-input::-webkit-slider-thumb:active {
  transform: scale(1.15);
  background: #f0f0ff;
}

.range-input::-moz-range-thumb {
  width: 22px;
  height: 22px;
  background: #ffffff;
  border: 2px solid #29275B;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.range-input::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
}

/* Dynamic z-index for overlapping slider handles */
.range-input.on-top {
  z-index: 2;
}

/* Background Filters Section - preserved from search view */
.background-filters-section {
  background-color: #fef3f8;
  border: 1px solid #f9d5e7;
  border-radius: 8px;
  margin: 0 16px 16px 16px;
  padding: 0;
}

.background-filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f9d5e7;
}

.background-filters-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #EC048C;
  font-family: Arial, sans-serif;
}

.background-filters-title svg {
  flex-shrink: 0;
}

.background-filters-clear {
  padding: 4px 10px;
  background-color: #ffffff;
  border: 1px solid #EC048C;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #EC048C;
  cursor: pointer;
  font-family: Arial, sans-serif;
  transition: all 0.15s ease;
}

.background-filters-clear:hover {
  background-color: #EC048C;
  color: #ffffff;
}

.background-filters-content {
  padding: 12px 16px;
}

.background-filter-item {
  display: flex;
  gap: 8px;
  font-size: 13px;
  font-family: Arial, sans-serif;
  margin-bottom: 8px;
}

.background-filter-item:last-child {
  margin-bottom: 0;
}

.background-filter-label {
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
}

.background-filter-values {
  color: #374151;
}

.filters-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background-color: #ffffff;
  flex-shrink: 0;
}

.filters-clear-btn {
  padding: 10px 16px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  font-family: Arial, sans-serif;
  transition: all 0.15s ease;
  width: 70%;
}

.filters-clear-btn:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.filters-apply-btn {
  padding: 10px 16px;
  background-color: #29275B;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  font-family: Arial, sans-serif;
  transition: background-color 0.15s ease;
  width: 100%;
}

.filters-apply-btn:hover {
  background-color: #1e1b47;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .all-filters-wrapper {
    left: 0; /* Full width on mobile */
    z-index: 10000000;
  }

  .filters-overlay {
    left: 0;
  }

  .filters-drawer {
    left: 0;
    top: 70px;
    width: 100vw;
    max-width: 100vw;
    height: calc(100vh - 70px);
    transform: translateX(-100%);
  }

  .filters-drawer.is-open {
    transform: translateX(0);
  }

  .filter-options-grid {
    grid-template-columns: 1fr;
  }
}
</style>