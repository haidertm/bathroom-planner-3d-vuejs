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
          <!-- Dynamic Secondary Filter Sections -->
          <div
              v-for="filterKey in secondaryFilters"
              :key="filterKey"
              class="filter-section"
          >
            <template v-if="getFilterOptions(filterKey).length > 0">
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
                <div class="dual-range-slider">
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
                  />
                  <input
                      type="range"
                      :min="minPrice"
                      :max="maxPrice"
                      :value="displayPriceMax"
                      @input="updateMaxPrice"
                      class="range-input range-max"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state when no secondary filters -->
          <div v-if="secondaryFilters.length === 0 && !hasProductsWithPrices" class="no-filters-message">
            <p>No additional filters available for this category.</p>
          </div>
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
import { ref, computed, watch, reactive } from 'vue'
import { getSecondaryFilters, getFilterLabel as getLabel, EMPTY_FILTERS, createEmptyFilters } from '../../constants/filters'
import { extractFilterOptions, filterProducts, filterProductVariants } from '../../utils/filters'

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
  }
})

const emit = defineEmits(['close', 'update:filters'])

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

// Local copy of filters for editing (initialized in watch below after maxPrice is available)
const localFilters = ref(createEmptyFilters())

// Open/closed state for sections (reactive object to handle dynamic keys)
const openSections = reactive({
  price: false
})

// Get secondary filters for this category
const secondaryFilters = computed(() => {
  return getSecondaryFilters(props.category)
})

// Initialize open sections for secondary filters
watch(secondaryFilters, (filters) => {
  for (const filterKey of filters) {
    if (openSections[filterKey] === undefined) {
      openSections[filterKey] = true // Default to open
    }
  }
}, { immediate: true })

// Get filter label for display
const getFilterLabel = (filterKey) => {
  return getLabel(filterKey)
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

// Update min price from slider
const updateMinPrice = (event) => {
  const value = parseInt(event.target.value)
  if (value <= localFilters.value.priceMax) {
    localFilters.value.priceMin = value
  }
}

// Update max price from slider
const updateMaxPrice = (event) => {
  const value = parseInt(event.target.value)
  if (value >= localFilters.value.priceMin) {
    localFilters.value.priceMax = value
  }
}

// Check if any products have prices
const hasProductsWithPrices = computed(() => {
  return props.products.some(product => {
    // Check product-level price
    if (product.price !== undefined && product.price !== null) {
      return true
    }
    // Check variant prices
    if (product.variants) {
      return product.variants.some(v => v.price !== undefined && v.price !== null)
    }
    return false
  })
})

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
function createLocalFilters(selectedFilters, dynamicMinPrice, dynamicMaxPrice) {
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

  return filters
}

// Sync local filters when props change
watch(() => props.selectedFilters, (newFilters) => {
  localFilters.value = createLocalFilters(newFilters, minPrice.value, maxPrice.value)
}, { deep: true })

// Reset local filters when drawer opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    localFilters.value = createLocalFilters(props.selectedFilters, minPrice.value, maxPrice.value)
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
  // Reset local filters with dynamic price values for slider display
  const freshFilters = createEmptyFilters()
  freshFilters.priceMin = minPrice.value
  freshFilters.priceMax = maxPrice.value
  localFilters.value = freshFilters
  // Emit empty filters to parent (priceMin: 0) so badge count resets properly
  emit('update:filters', createEmptyFilters())
}

const applyFilters = () => {
  // Create a copy of localFilters for emission
  const filtersToEmit = { ...localFilters.value }

  // If price values match the dynamic bounds (user didn't change them),
  // normalize to EMPTY_FILTERS values so they're not treated as active filters
  if (localFilters.value.priceMin === minPrice.value && localFilters.value.priceMax === maxPrice.value) {
    filtersToEmit.priceMin = EMPTY_FILTERS.priceMin
    filtersToEmit.priceMax = EMPTY_FILTERS.priceMax
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
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000000; /* Higher than Sidebar search bar (9999999) */
  pointer-events: none; /* Allow clicks to pass through to sidebar */
  visibility: hidden;
  transition: visibility 0s 0.3s; /* Delay hiding until transition completes */
}

.all-filters-wrapper.is-open {
  visibility: visible;
  transition: visibility 0s 0s; /* Show immediately when opening */
}

.filters-overlay {
  position: absolute;
  top: 0;
  left: 0; /* Full overlay */
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  pointer-events: auto; /* Re-enable clicks on overlay */
  opacity: 0;
  transition: opacity 0.3s ease-out;
}

.all-filters-wrapper.is-open .filters-overlay {
  opacity: 1;
}

.filters-drawer {
  position: absolute;
  top: 60px; /* Match sidebar top position (below header) */
  left: 0; /* Position over the sidebar */
  width: 480px; /* Match ProductDrawer width */
  height: calc(100vh - 60px); /* Full height minus top offset */
  background-color: #ffffff;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #e5e7eb;
  pointer-events: auto; /* Enable clicks on the drawer */
  transform: translateX(-100%);
  transition: transform 0.3s ease-out;
}

.filters-drawer.is-open {
  transform: translateX(0);
}

.filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.filters-title {
  font-size: 18px;
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
  padding: 16px 20px;
  background: none;
  border: none;
  font-size: 15px;
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
  padding: 0 20px 16px 20px;
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

.no-filters-message {
  padding: 40px 20px;
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  font-family: Arial, sans-serif;
}

.filters-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background-color: #ffffff;
  flex-shrink: 0;
}

.filters-clear-btn {
  padding: 12px 24px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  font-family: Arial, sans-serif;
  transition: all 0.15s ease;
}

.filters-clear-btn:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

.filters-apply-btn {
  flex: 1;
  padding: 12px 24px;
  background-color: #29275B;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  font-family: Arial, sans-serif;
  transition: background-color 0.15s ease;
}

.filters-apply-btn:hover {
  background-color: #1e1b47;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .filters-overlay {
    left: 0; /* Full overlay on mobile */
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