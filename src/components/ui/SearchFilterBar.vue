<template>
  <div class="search-filter-bar">
    <!-- Category Filter Chip -->
    <div class="filter-chip-wrapper" ref="categoryChipRef">
      <button
        class="filter-chip"
        :class="{ active: isCategoryDropdownOpen, 'has-selection': selectedCategory }"
        @click="toggleCategoryDropdown"
      >
        <span class="chip-label">{{ selectedCategory || 'Category' }}</span>
        <svg class="chevron" :class="{ rotated: isCategoryDropdownOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Price Filter Chip -->
    <div class="filter-chip-wrapper" ref="priceChipRef">
      <button
        class="filter-chip"
        :class="{ active: isPriceDropdownOpen, 'has-selection': hasPriceFilter }"
        @click="togglePriceDropdown"
      >
        <span class="chip-label">{{ priceChipLabel }}</span>
        <svg class="chevron" :class="{ rotated: isPriceDropdownOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Style Filter Chip -->
    <div class="filter-chip-wrapper" ref="styleChipRef">
      <button
        class="filter-chip"
        :class="{ active: isStyleDropdownOpen, 'has-selection': selectedStyles.length > 0 }"
        @click="toggleStyleDropdown"
      >
        <span class="chip-label">{{ styleChipLabel }}</span>
        <svg class="chevron" :class="{ rotated: isStyleDropdownOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>

    <!-- Teleported Dropdowns (rendered outside overflow container) -->
    <Teleport to="body">
      <!-- Category Dropdown -->
      <div
        v-if="isCategoryDropdownOpen"
        class="filter-dropdown-portal"
        :style="categoryDropdownStyle"
        @click.stop
      >
        <div class="dropdown-header">
          <span>Select Category</span>
          <button v-if="selectedCategory" class="clear-btn" @click="clearCategory">Clear</button>
        </div>
        <div class="dropdown-options">
          <label
            v-for="category in availableCategories"
            :key="category.value"
            class="dropdown-option"
          >
            <input
              type="radio"
              :value="category.value"
              v-model="localSelectedCategory"
              @change="applyCategory"
            />
            <span class="option-label">{{ category.label }}</span>
            <span class="option-count">({{ category.count }})</span>
          </label>
        </div>
      </div>

      <!-- Price Range Dropdown -->
      <div
        v-if="isPriceDropdownOpen"
        class="filter-dropdown-portal price-dropdown"
        :style="priceDropdownStyle"
        @click.stop
      >
        <div class="dropdown-header">
          <span>Price Range</span>
          <button v-if="hasPriceFilter" class="clear-btn" @click="clearPrice">Clear</button>
        </div>
        <div class="price-slider-container">
          <div class="price-inputs">
            <div class="price-input-group">
              <label>Min</label>
              <div class="price-input-wrapper">
                <span class="currency">£</span>
                <input
                  type="number"
                  :value="displayPriceMin"
                  :min="priceRange.min"
                  :max="priceRange.max"
                  @input="handleMinPriceInput"
                  @blur="clampAndApplyPrice"
                />
              </div>
            </div>
            <span class="price-separator">-</span>
            <div class="price-input-group">
              <label>Max</label>
              <div class="price-input-wrapper">
                <span class="currency">£</span>
                <input
                  type="number"
                  :value="displayPriceMax"
                  :min="priceRange.min"
                  :max="priceRange.max"
                  @input="handleMaxPriceInput"
                  @blur="clampAndApplyPrice"
                />
              </div>
            </div>
          </div>

          <!-- Dual Range Slider -->
          <div class="dual-slider-container">
            <div class="slider-track">
              <div class="slider-range" :style="sliderRangeStyle"></div>
            </div>
            <input
              type="range"
              class="slider slider-min"
              :class="{
                'slider-active': activeSlider === 'min',
                'slider-top': effectivePriceMin >= effectivePriceMax
              }"
              :min="priceRange.min"
              :max="priceRange.max"
              :step="1"
              :value="effectivePriceMin"
              @input="handleMinSliderInput"
              @mousedown="activeSlider = 'min'"
              @touchstart.passive="activeSlider = 'min'"
              @mouseup="activeSlider = null"
              @touchend="activeSlider = null"
            />
            <input
              type="range"
              class="slider slider-max"
              :class="{
                'slider-active': activeSlider === 'max',
                'slider-top': effectivePriceMin < effectivePriceMax
              }"
              :min="priceRange.min"
              :max="priceRange.max"
              :step="1"
              :value="effectivePriceMax"
              @input="handleMaxSliderInput"
              @mousedown="activeSlider = 'max'"
              @touchstart.passive="activeSlider = 'max'"
              @mouseup="activeSlider = null"
              @touchend="activeSlider = null"
            />
          </div>

          <div class="price-range-labels">
            <span>£{{ priceRange.min.toFixed(0) }}</span>
            <span>£{{ priceRange.max.toFixed(0) }}</span>
          </div>
        </div>
      </div>

      <!-- Style Dropdown -->
      <div
        v-if="isStyleDropdownOpen"
        class="filter-dropdown-portal"
        :style="styleDropdownStyle"
        @click.stop
      >
        <div class="dropdown-header">
          <span>Select Style</span>
          <button v-if="selectedStyles.length > 0" class="clear-btn" @click="clearStyle">Clear</button>
        </div>
        <div class="dropdown-options">
          <label
            v-for="style in availableStyles"
            :key="style.value"
            class="dropdown-option"
          >
            <input
              type="checkbox"
              :value="style.value"
              v-model="localSelectedStyles"
              @change="applyStyle"
            />
            <span class="option-label">{{ style.label }}</span>
            <span class="option-count">({{ style.count }})</span>
          </label>
        </div>
      </div>

      <!-- Click outside overlay to close dropdowns -->
      <div
        v-if="isCategoryDropdownOpen || isPriceDropdownOpen || isStyleDropdownOpen"
        class="dropdown-overlay-portal"
        @click="closeAllDropdowns"
      ></div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  searchResults: {
    type: Array,
    default: () => []
  },
  selectedFilters: {
    type: Object,
    default: () => ({
      category: null,
      priceMin: null,
      priceMax: null,
      styles: []
    })
  }
})

const emit = defineEmits(['update:filters'])

// Chip refs for positioning
const categoryChipRef = ref(null)
const priceChipRef = ref(null)
const styleChipRef = ref(null)

// Dropdown positions
const categoryDropdownPos = ref({ top: 0, left: 0 })
const priceDropdownPos = ref({ top: 0, left: 0 })
const styleDropdownPos = ref({ top: 0, left: 0 })

// Dropdown state
const isCategoryDropdownOpen = ref(false)
const isPriceDropdownOpen = ref(false)
const isStyleDropdownOpen = ref(false)

// Active slider tracking (for z-index management in dual slider)
const activeSlider = ref(null)

// Local filter values
const localSelectedCategory = ref(props.selectedFilters.category || null)
const localPriceMin = ref(null)
const localPriceMax = ref(null)
const localSelectedStyles = ref([...(props.selectedFilters.styles || [])])
const lastSearchResultsLength = ref(0)
const userHasSetPriceFilter = ref(false) // Track if user manually changed price

// Category display labels
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

// Calculate dropdown position based on chip element
const getDropdownPosition = (chipRef) => {
  if (!chipRef) return { top: 0, left: 0 }
  const rect = chipRef.getBoundingClientRect()
  return {
    top: rect.bottom + 8,
    left: rect.left
  }
}

// Computed dropdown styles
const categoryDropdownStyle = computed(() => ({
  position: 'fixed',
  top: `${categoryDropdownPos.value.top}px`,
  left: `${categoryDropdownPos.value.left}px`
}))

const priceDropdownStyle = computed(() => ({
  position: 'fixed',
  top: `${priceDropdownPos.value.top}px`,
  left: `${priceDropdownPos.value.left}px`
}))

const styleDropdownStyle = computed(() => ({
  position: 'fixed',
  top: `${styleDropdownPos.value.top}px`,
  left: `${styleDropdownPos.value.left}px`
}))

// Helper: Get product price for filtering
const getProductPrice = (result) => {
  const price = parseFloat(result.price) || 0
  if (price > 0) return price

  // Check variant price
  const variant = result.searchContext?.matchingVariant
  if (variant?.price) {
    const variantPrice = parseFloat(variant.price) || 0
    if (variantPrice > 0) return variantPrice
  }
  return 0
}

// Helper: Filter results by all active filters - used for Zero Results Prevention
// When calculating available options, we apply ALL other filters (including price)
// to ensure no option would result in 0 products
const getResultsFilteredByAllFilters = (excludeFilter = null) => {
  let filtered = [...props.searchResults]

  // Apply category filter (if not excluded)
  if (excludeFilter !== 'category' && localSelectedCategory.value) {
    filtered = filtered.filter(result => {
      const category = result.category || result.searchContext?.category
      return category === localSelectedCategory.value
    })
  }

  // Apply style filter (if not excluded)
  if (excludeFilter !== 'style' && localSelectedStyles.value.length > 0) {
    filtered = filtered.filter(result => {
      const itemStyle = result.filterAttributes?.style ||
                        result.searchContext?.matchingVariant?.filterAttributes?.style
      return itemStyle && localSelectedStyles.value.includes(itemStyle)
    })
  }

  // Apply price filter (if not excluded and user has modified the price)
  if (excludeFilter !== 'price' && hasPriceFilter.value) {
    filtered = filtered.filter(result => {
      const price = getProductPrice(result)
      // Include items with no valid price (price = 0) - don't filter them out
      if (price === 0) return true
      // Use Math.floor for min comparison and Math.ceil for max comparison
      // to handle floating point prices like 419.99 when slider shows 420
      return Math.ceil(price) >= effectivePriceMin.value && Math.floor(price) <= effectivePriceMax.value
    })
  }

  return filtered
}

// Helper: Filter results by discrete filters only (Category, Style) - used for price range calculation
// Price should NOT affect what price range is available (would cause circular dependency)
const getResultsFilteredByDiscreteFilters = () => {
  let filtered = [...props.searchResults]

  // Apply category filter
  if (localSelectedCategory.value) {
    filtered = filtered.filter(result => {
      const category = result.category || result.searchContext?.category
      return category === localSelectedCategory.value
    })
  }

  // Apply style filter
  if (localSelectedStyles.value.length > 0) {
    filtered = filtered.filter(result => {
      const itemStyle = result.filterAttributes?.style ||
                        result.searchContext?.matchingVariant?.filterAttributes?.style
      return itemStyle && localSelectedStyles.value.includes(itemStyle)
    })
  }

  return filtered
}

// Computed: Available categories from search results
// Uses all filters (Style + Price) except Category for Zero Results Prevention
const availableCategories = computed(() => {
  // Get results filtered by Style AND Price (excluding Category)
  // This ensures no category option would result in 0 products when selected
  const filteredResults = getResultsFilteredByAllFilters('category')
  const categoryCounts = {}

  filteredResults.forEach(result => {
    const category = result.category || result.searchContext?.category
    if (category) {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    }
  })

  // Only return categories with count > 0
  return Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({
      value,
      label: categoryDisplayLabels[value] || value,
      count
    }))
    .sort((a, b) => b.count - a.count)
})

// Computed: Selected category display
const selectedCategory = computed(() => {
  if (!localSelectedCategory.value) return null
  return categoryDisplayLabels[localSelectedCategory.value] || localSelectedCategory.value
})

// Computed: Full price range from all search results (for slider bounds)
const fullPriceRange = computed(() => {
  let min = Infinity
  let max = 0

  props.searchResults.forEach(result => {
    const price = parseFloat(result.price) || 0
    if (price > 0) {
      min = Math.min(min, price)
      max = Math.max(max, price)
    }

    // Also check variants for price range
    const variant = result.searchContext?.matchingVariant
    if (variant?.price) {
      const variantPrice = parseFloat(variant.price) || 0
      if (variantPrice > 0) {
        min = Math.min(min, variantPrice)
        max = Math.max(max, variantPrice)
      }
    }
  })

  // Default range if no valid prices found
  if (min === Infinity) min = 0
  if (max === 0) max = 1000

  return { min: Math.floor(min), max: Math.ceil(max) }
})

// Computed: Dynamic price range based on discrete filters (Category, Style)
const priceRange = computed(() => {
  // Get results filtered by category and style (price is never applied here)
  const filteredResults = getResultsFilteredByDiscreteFilters()

  let min = Infinity
  let max = 0

  filteredResults.forEach(result => {
    const price = parseFloat(result.price) || 0
    if (price > 0) {
      min = Math.min(min, price)
      max = Math.max(max, price)
    }
  })

  // Default to full range if no valid prices found
  if (min === Infinity) min = fullPriceRange.value.min
  if (max === 0) max = fullPriceRange.value.max

  let floorMin = Math.floor(min)
  let ceilMax = Math.ceil(max)

  // Ensure there's at least a £1 range for the slider to be usable
  // This handles single-product or same-price scenarios
  if (ceilMax <= floorMin) {
    floorMin = Math.max(0, floorMin - 1)
    ceilMax = floorMin + 1
  }

  return { min: floorMin, max: ceilMax }
})

// Price step calculation
const priceStep = computed(() => {
  const range = priceRange.value.max - priceRange.value.min
  if (range <= 100) return 1
  if (range <= 500) return 5
  if (range <= 1000) return 10
  return 25
})

// Effective price values (always return a number within valid range, never null)
const effectivePriceMin = computed(() => {
  if (localPriceMin.value === null || localPriceMin.value === undefined) {
    return priceRange.value.min
  }
  // Clamp to valid range
  return Math.max(priceRange.value.min, Math.min(localPriceMin.value, priceRange.value.max))
})

const effectivePriceMax = computed(() => {
  if (localPriceMax.value === null || localPriceMax.value === undefined) {
    return priceRange.value.max
  }
  // Clamp to valid range
  return Math.max(priceRange.value.min, Math.min(localPriceMax.value, priceRange.value.max))
})

// Display price values for input fields (show raw values while typing, clamped values otherwise)
const displayPriceMin = computed(() => {
  if (localPriceMin.value === null || localPriceMin.value === undefined) {
    return priceRange.value.min
  }
  return localPriceMin.value
})

const displayPriceMax = computed(() => {
  if (localPriceMax.value === null || localPriceMax.value === undefined) {
    return priceRange.value.max
  }
  return localPriceMax.value
})

// Has price filter active
const hasPriceFilter = computed(() => {
  return effectivePriceMin.value > priceRange.value.min ||
         effectivePriceMax.value < priceRange.value.max
})

// Price chip label
const priceChipLabel = computed(() => {
  if (!hasPriceFilter.value) return 'Price'
  return `£${effectivePriceMin.value} - £${effectivePriceMax.value}`
})

// Slider range style for dual slider
const sliderRangeStyle = computed(() => {
  const range = priceRange.value.max - priceRange.value.min
  if (range === 0) return { left: '0%', width: '100%' }

  const leftPercent = ((effectivePriceMin.value - priceRange.value.min) / range) * 100
  const rightPercent = ((effectivePriceMax.value - priceRange.value.min) / range) * 100

  return {
    left: `${Math.max(0, Math.min(100, leftPercent))}%`,
    width: `${Math.max(0, Math.min(100, rightPercent - leftPercent))}%`
  }
})

// Computed: Available styles from search results
// Uses all filters (Category + Price) except Style for Zero Results Prevention
const availableStyles = computed(() => {
  // Get results filtered by Category AND Price (excluding Style)
  // This ensures no style option would result in 0 products when selected
  const filteredResults = getResultsFilteredByAllFilters('style')
  const styleCounts = {}

  filteredResults.forEach(result => {
    // Check product-level style
    const productStyle = result.filterAttributes?.style
    if (productStyle) {
      styleCounts[productStyle] = (styleCounts[productStyle] || 0) + 1
    }

    // Check variant-level style
    const variant = result.searchContext?.matchingVariant
    if (variant?.filterAttributes?.style) {
      const variantStyle = variant.filterAttributes.style
      // Avoid double counting if same style
      if (variantStyle !== productStyle) {
        styleCounts[variantStyle] = (styleCounts[variantStyle] || 0) + 1
      }
    }
  })

  // Only return styles with count > 0
  return Object.entries(styleCounts)
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({
      value,
      label: value,
      count
    }))
    .sort((a, b) => b.count - a.count)
})

// Style chip label
const styleChipLabel = computed(() => {
  if (localSelectedStyles.value.length === 0) return 'Style'
  if (localSelectedStyles.value.length === 1) return localSelectedStyles.value[0]
  return `${localSelectedStyles.value.length} Styles`
})

// Selected styles for parent
const selectedStyles = computed(() => localSelectedStyles.value)

// Initialize/reset price values when search results change
watch(() => props.searchResults, (newResults, oldResults) => {
  const newLength = newResults?.length || 0
  const oldLength = oldResults?.length || 0

  // Reset all filters when search results change significantly (new search)
  // This handles the case when user clears search and searches again
  if (newLength !== oldLength || lastSearchResultsLength.value === 0) {
    // Reset filters for new search
    localSelectedCategory.value = null
    localSelectedStyles.value = []
    userHasSetPriceFilter.value = false // Reset the manual price flag

    // Initialize price values from the new price range
    localPriceMin.value = priceRange.value.min
    localPriceMax.value = priceRange.value.max

    lastSearchResultsLength.value = newLength
  }
}, { immediate: true })

// Note: We intentionally do NOT auto-clear category/style when they become "invalid"
// due to price filter changes. This prevents the frustrating behavior where adjusting
// the price slider causes your category selection to disappear.
// Users can see "0 results" and adjust their filters manually if needed.

// Reset price slider when category changes
watch(localSelectedCategory, (newCategory, oldCategory) => {
  // When category is cleared, always reset price to full range
  if (newCategory === null) {
    nextTick(() => {
      localPriceMin.value = priceRange.value.min
      localPriceMax.value = priceRange.value.max
      userHasSetPriceFilter.value = false
      emitFilterUpdate() // Notify parent of the reset
    })
    return
  }

  // When selecting a category, only reset price if user hasn't manually set a filter
  if (!userHasSetPriceFilter.value) {
    nextTick(() => {
      localPriceMin.value = priceRange.value.min
      localPriceMax.value = priceRange.value.max
      emitFilterUpdate() // Notify parent of the reset
    })
  }
})

// Watch for external filter changes
watch(() => props.selectedFilters, (newFilters) => {
  if (newFilters.category !== localSelectedCategory.value) {
    localSelectedCategory.value = newFilters.category
  }
  if (newFilters.priceMin !== undefined && newFilters.priceMin !== localPriceMin.value) {
    localPriceMin.value = newFilters.priceMin
  }
  if (newFilters.priceMax !== undefined && newFilters.priceMax !== localPriceMax.value) {
    localPriceMax.value = newFilters.priceMax
  }
  if (JSON.stringify(newFilters.styles) !== JSON.stringify(localSelectedStyles.value)) {
    localSelectedStyles.value = [...(newFilters.styles || [])]
  }
}, { deep: true })

// Toggle dropdowns
const toggleCategoryDropdown = async () => {
  isPriceDropdownOpen.value = false
  isStyleDropdownOpen.value = false
  isCategoryDropdownOpen.value = !isCategoryDropdownOpen.value

  if (isCategoryDropdownOpen.value) {
    await nextTick()
    categoryDropdownPos.value = getDropdownPosition(categoryChipRef.value)
  }
}

const togglePriceDropdown = async () => {
  isCategoryDropdownOpen.value = false
  isStyleDropdownOpen.value = false
  isPriceDropdownOpen.value = !isPriceDropdownOpen.value

  if (isPriceDropdownOpen.value) {
    await nextTick()
    priceDropdownPos.value = getDropdownPosition(priceChipRef.value)
  }
}

const toggleStyleDropdown = async () => {
  isCategoryDropdownOpen.value = false
  isPriceDropdownOpen.value = false
  isStyleDropdownOpen.value = !isStyleDropdownOpen.value

  if (isStyleDropdownOpen.value) {
    await nextTick()
    styleDropdownPos.value = getDropdownPosition(styleChipRef.value)
  }
}

const closeAllDropdowns = () => {
  isCategoryDropdownOpen.value = false
  isPriceDropdownOpen.value = false
  isStyleDropdownOpen.value = false
}

// Apply filters - only emit price values when there's an active price filter
const emitFilterUpdate = () => {
  emit('update:filters', {
    category: localSelectedCategory.value,
    // Only emit price values if user has actively filtered by price
    // Otherwise emit null so ProductDrawer doesn't apply a price filter
    priceMin: hasPriceFilter.value ? effectivePriceMin.value : null,
    priceMax: hasPriceFilter.value ? effectivePriceMax.value : null,
    styles: [...localSelectedStyles.value]
  })
}

const applyCategory = () => {
  emitFilterUpdate()
  isCategoryDropdownOpen.value = false
}

const applyPrice = () => {
  // Ensure min doesn't exceed max
  if (localPriceMin.value > localPriceMax.value) {
    localPriceMin.value = localPriceMax.value
  }
  emitFilterUpdate()
}

// Clamp values to valid range and apply (called on input blur)
const clampAndApplyPrice = () => {
  // Clamp min value
  if (localPriceMin.value !== null && localPriceMin.value !== undefined) {
    localPriceMin.value = Math.max(priceRange.value.min, Math.min(localPriceMin.value, priceRange.value.max))
  }
  // Clamp max value
  if (localPriceMax.value !== null && localPriceMax.value !== undefined) {
    localPriceMax.value = Math.max(priceRange.value.min, Math.min(localPriceMax.value, priceRange.value.max))
  }
  // Ensure min doesn't exceed max
  if (localPriceMin.value > localPriceMax.value) {
    localPriceMin.value = localPriceMax.value
  }
  userHasSetPriceFilter.value = true // User manually changed price
  emitFilterUpdate()
}

const applyStyle = () => {
  emitFilterUpdate()
}

// Price input handlers (for number inputs)
// Store raw value on input - clamping happens in applyPrice on change/blur
const handleMinPriceInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    localPriceMin.value = newValue
  }
}

const handleMaxPriceInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    localPriceMax.value = newValue
  }
}

// Slider input handlers (for range inputs)
const handleMinSliderInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    // Ensure min doesn't exceed max
    const maxVal = effectivePriceMax.value
    localPriceMin.value = Math.min(newValue, maxVal)
    userHasSetPriceFilter.value = true // User manually changed price
    emitFilterUpdate()
  }
}

const handleMaxSliderInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    // Ensure max doesn't go below min
    const minVal = effectivePriceMin.value
    localPriceMax.value = Math.max(newValue, minVal)
    userHasSetPriceFilter.value = true // User manually changed price
    emitFilterUpdate()
  }
}

// Clear filters
const clearCategory = () => {
  localSelectedCategory.value = null
  emitFilterUpdate()
}

const clearPrice = () => {
  localPriceMin.value = priceRange.value.min
  localPriceMax.value = priceRange.value.max
  userHasSetPriceFilter.value = false // Reset the manual price flag
  emitFilterUpdate()
}

const clearStyle = () => {
  localSelectedStyles.value = []
  emitFilterUpdate()
}

// Close dropdowns on escape key
const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    closeAllDropdowns()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  // Initialize price values if not already set
  if (localPriceMin.value === null) {
    localPriceMin.value = priceRange.value.min
  }
  if (localPriceMax.value === null) {
    localPriceMax.value = priceRange.value.max
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.search-filter-bar {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 0 20px;
  align-items: center;
  min-width: max-content;
  position: relative;
}

.filter-chip-wrapper {
  position: relative;
  flex-shrink: 0;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: Arial, sans-serif;
  white-space: nowrap;
}

.filter-chip:hover {
  border-color: #9ca3af;
}

.filter-chip.active {
  border-color: #29275B;
  box-shadow: 0 0 0 2px rgba(41, 39, 91, 0.1);
}

.filter-chip.has-selection {
  background-color: #29275B;
  border-color: #29275B;
  color: #ffffff;
}

.chip-label {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chevron {
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.filter-chip.has-selection .chevron {
  stroke: #ffffff;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .search-filter-bar {
    gap: 6px;
  }

  .filter-chip {
    font-size: 13px;
    padding: 6px 12px;
  }
}
</style>

<style>
/* Global styles for teleported dropdowns */
.filter-dropdown-portal {
  min-width: 220px;
  max-width: 320px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  overflow: hidden;
}

.filter-dropdown-portal.price-dropdown {
  min-width: 280px;
}

.filter-dropdown-portal .dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.filter-dropdown-portal .dropdown-header span {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.filter-dropdown-portal .clear-btn {
  font-size: 12px;
  color: #ef4444;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.filter-dropdown-portal .clear-btn:hover {
  text-decoration: underline;
}

.filter-dropdown-portal .dropdown-options {
  max-height: 250px;
  overflow-y: auto;
  padding: 8px 0;
}

.filter-dropdown-portal .dropdown-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.filter-dropdown-portal .dropdown-option:hover {
  background-color: #f3f4f6;
}

.filter-dropdown-portal .dropdown-option input[type="radio"],
.filter-dropdown-portal .dropdown-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #29275B;
  cursor: pointer;
}

.filter-dropdown-portal .option-label {
  flex: 1;
  font-size: 14px;
  color: #374151;
}

.filter-dropdown-portal .option-count {
  font-size: 12px;
  color: #9ca3af;
}

/* Price slider styles */
.filter-dropdown-portal .price-slider-container {
  padding: 16px;
}

.filter-dropdown-portal .price-inputs {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-dropdown-portal .price-input-group {
  flex: 1;
}

.filter-dropdown-portal .price-input-group label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.filter-dropdown-portal .price-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
}

.filter-dropdown-portal .price-input-wrapper .currency {
  padding: 8px 10px;
  background-color: #f3f4f6;
  font-size: 14px;
  color: #6b7280;
  border-right: 1px solid #d1d5db;
}

.filter-dropdown-portal .price-input-wrapper input {
  flex: 1;
  padding: 8px 10px;
  border: none;
  outline: none;
  font-size: 14px;
  width: 60px;
}

.filter-dropdown-portal .price-separator {
  color: #9ca3af;
  font-weight: 500;
}

/* Dual range slider */
.filter-dropdown-portal .dual-slider-container {
  position: relative;
  height: 24px;
  margin-bottom: 8px;
}

.filter-dropdown-portal .slider-track {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 6px;
  background-color: #e5e7eb;
  border-radius: 3px;
}

.filter-dropdown-portal .slider-range {
  position: absolute;
  height: 100%;
  background-color: #29275B;
  border-radius: 3px;
}

.filter-dropdown-portal .slider {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  pointer-events: none;
  z-index: 1;
}

/* Slider layering for dual range slider */
/* Default: both sliders at z-index 1 */
/* slider-top: the slider that should be on top when not actively dragging */
.filter-dropdown-portal .slider-top {
  z-index: 2;
}

/* Active slider (currently being dragged) always on top */
.filter-dropdown-portal .slider-active {
  z-index: 3 !important;
}

.filter-dropdown-portal .slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #29275B;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  pointer-events: auto;
  position: relative;
  z-index: inherit;
}

.filter-dropdown-portal .slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #29275B;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  pointer-events: auto;
}

.filter-dropdown-portal .price-range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9ca3af;
}

/* Overlay for closing dropdowns */
.dropdown-overlay-portal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
}
</style>
