<template>
  <Teleport to="body">
    <div v-if="isOpen" class="all-filters-wrapper">
      <!-- Overlay -->
      <div class="filters-overlay" @click="closeDrawer"></div>

      <!-- Drawer -->
      <div class="filters-drawer">
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
        <!-- Length Section -->
        <div v-if="availableFilters.includes('length')" class="filter-section">
          <button class="filter-section-header" @click="toggleSection('length')">
            <span>{{ categoryLabel }} Length</span>
            <svg
              class="filter-section-arrow"
              :class="{ 'is-open': openSections.length }"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div v-if="openSections.length" class="filter-section-content">
            <div class="filter-options-grid">
              <label v-for="option in lengthOptions" :key="option.value" class="filter-checkbox-label">
                <input
                  type="checkbox"
                  :checked="localFilters.length.includes(option.value)"
                  @change="toggleFilter('length', option.value)"
                  class="filter-checkbox"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Type Section -->
        <div v-if="availableFilters.includes('type')" class="filter-section">
          <button class="filter-section-header" @click="toggleSection('type')">
            <span>{{ categoryLabel }} Type</span>
            <svg
              class="filter-section-arrow"
              :class="{ 'is-open': openSections.type }"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div v-if="openSections.type" class="filter-section-content">
            <div class="filter-options-grid">
              <label v-for="option in typeOptions" :key="option.value" class="filter-checkbox-label">
                <input
                  type="checkbox"
                  :checked="localFilters.type.includes(option.value)"
                  @change="toggleFilter('type', option.value)"
                  class="filter-checkbox"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Finish Section -->
        <div v-if="availableFilters.includes('finish')" class="filter-section">
          <button class="filter-section-header" @click="toggleSection('finish')">
            <span>{{ categoryLabel }} Finish</span>
            <svg
              class="filter-section-arrow"
              :class="{ 'is-open': openSections.finish }"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div v-if="openSections.finish" class="filter-section-content">
            <div class="filter-options-grid">
              <label v-for="option in finishOptions" :key="option.value" class="filter-checkbox-label">
                <input
                  type="checkbox"
                  :checked="localFilters.finish.includes(option.value)"
                  @change="toggleFilter('finish', option.value)"
                  class="filter-checkbox"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Price Range Section -->
        <div class="filter-section">
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
                <span>£{{ priceRange[0] }}</span>
                <span>£{{ priceRange[1] }}</span>
              </div>
              <input
                type="range"
                :min="0"
                :max="maxPrice"
                v-model.number="priceRange[1]"
                class="price-range-slider"
              />
            </div>
          </div>
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
import { ref, computed, watch } from 'vue'
import { getAvailableFilters } from '../../constants/filters'
import { extractFilterOptions, filterProducts } from '../../utils/filters'

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
    default: () => ({ length: [], type: [], finish: [] })
  }
})

const emit = defineEmits(['close', 'update:filters'])

// Local copy of filters for editing
const localFilters = ref({
  length: [...props.selectedFilters.length],
  type: [...props.selectedFilters.type],
  finish: [...props.selectedFilters.finish]
})

// Price range
const priceRange = ref([0, 2000])
const maxPrice = 2000

// Open/closed state for sections
const openSections = ref({
  length: true,
  type: true,
  finish: true,
  price: false
})

// Category label for filter section titles
const categoryLabel = computed(() => {
  const labels = {
    'Bath': 'Bath',
    'Shower': 'Shower',
    'Toilet': 'Toilet',
    'Furniture': 'Vanity',
    'Radiator': 'Radiator',
    'TowelRails': 'Towel Rail',
    'Mirror': 'Mirror',
    'WindowAndDoor': 'Window/Door'
  }
  return labels[props.category] || props.category
})

// Get available filters for this category
const availableFilters = computed(() => {
  return getAvailableFilters(props.category)
})

// Extract filter options from products
const lengthOptions = computed(() => {
  if (!availableFilters.value.includes('length')) return []
  return extractFilterOptions(props.products, 'length')
})

const typeOptions = computed(() => {
  if (!availableFilters.value.includes('type')) return []
  return extractFilterOptions(props.products, 'type')
})

const finishOptions = computed(() => {
  if (!availableFilters.value.includes('finish')) return []
  return extractFilterOptions(props.products, 'finish')
})

// Count of filtered results
const filteredCount = computed(() => {
  const filtered = filterProducts(props.products, localFilters.value)
  return filtered.length
})

// Sync local filters when props change
watch(() => props.selectedFilters, (newFilters) => {
  localFilters.value = {
    length: [...newFilters.length],
    type: [...newFilters.type],
    finish: [...newFilters.finish]
  }
}, { deep: true })

// Reset local filters when drawer opens
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    localFilters.value = {
      length: [...props.selectedFilters.length],
      type: [...props.selectedFilters.type],
      finish: [...props.selectedFilters.finish]
    }
  }
})

const toggleSection = (section) => {
  openSections.value[section] = !openSections.value[section]
}

const toggleFilter = (filterKey, value) => {
  const index = localFilters.value[filterKey].indexOf(value)
  if (index === -1) {
    localFilters.value[filterKey].push(value)
  } else {
    localFilters.value[filterKey].splice(index, 1)
  }
}

const clearAllFilters = () => {
  localFilters.value = {
    length: [],
    type: [],
    finish: []
  }
  priceRange.value = [0, maxPrice]
  // Emit the cleared filters to parent immediately
  emit('update:filters', { ...localFilters.value })
}

const applyFilters = () => {
  emit('update:filters', { ...localFilters.value })
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
  z-index: 2000; /* Higher than ProductDrawer (1900) */
  pointer-events: none; /* Allow clicks to pass through to sidebar */
}

.filters-overlay {
  position: absolute;
  top: 0;
  left: 480px; /* Start overlay after the sidebar */
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  pointer-events: auto; /* Re-enable clicks on overlay */
}

.filters-drawer {
  position: absolute;
  top: 60px; /* Match sidebar top position (below header) */
  left: 480px; /* Position to the right of ProductDrawer (480px wide) */
  width: 320px;
  height: calc(100vh - 60px); /* Full height minus top offset */
  background-color: #ffffff;
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid #e5e7eb;
  pointer-events: auto; /* Enable clicks on the drawer */
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
  margin-bottom: 12px;
  font-size: 14px;
  color: #374151;
  font-family: Arial, sans-serif;
}

.price-range-slider {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
}

.price-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #29275B;
  border-radius: 50%;
  cursor: pointer;
}

.price-range-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #29275B;
  border-radius: 50%;
  cursor: pointer;
  border: none;
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
  }

  .filter-options-grid {
    grid-template-columns: 1fr;
  }
}
</style>
