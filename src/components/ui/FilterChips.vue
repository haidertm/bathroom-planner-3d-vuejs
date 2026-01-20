<template>
  <div v-if="availableFilters.length > 0" class="filter-chips-container">
    <!-- Length Filter -->
    <FilterDropdown
      v-if="availableFilters.includes('length')"
      label="Length"
      :options="lengthOptions"
      :selected="selectedFilters.length"
      @update="updateFilter('length', $event)"
    />

    <!-- Type Filter -->
    <FilterDropdown
      v-if="availableFilters.includes('type')"
      label="Type"
      :options="typeOptions"
      :selected="selectedFilters.type"
      @update="updateFilter('type', $event)"
    />

    <!-- Finish Filter -->
    <FilterDropdown
      v-if="availableFilters.includes('finish')"
      label="Finish"
      :options="finishOptions"
      :selected="selectedFilters.finish"
      @update="updateFilter('finish', $event)"
    />

    <!-- All Filters Button -->
    <button
      class="all-filters-btn"
      :class="{ 'has-filters': totalActiveFilters > 0 }"
      @click="openAllFiltersModal"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="4" y1="21" x2="4" y2="14"></line>
        <line x1="4" y1="10" x2="4" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12" y2="3"></line>
        <line x1="20" y1="21" x2="20" y2="16"></line>
        <line x1="20" y1="12" x2="20" y2="3"></line>
        <line x1="1" y1="14" x2="7" y2="14"></line>
        <line x1="9" y1="8" x2="15" y2="8"></line>
        <line x1="17" y1="16" x2="23" y2="16"></line>
      </svg>
      All Filters
    </button>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import FilterDropdown from './FilterDropdown.vue'
import { getAvailableFilters } from '../../constants/filters'
import { extractFilterOptions } from '../../utils/filters'

const props = defineProps({
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

const emit = defineEmits(['update:filters', 'open-all-filters'])

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

// Total active filters count
const totalActiveFilters = computed(() => {
  return (
    (props.selectedFilters.length?.length || 0) +
    (props.selectedFilters.type?.length || 0) +
    (props.selectedFilters.finish?.length || 0)
  )
})

// Update a specific filter
const updateFilter = (filterKey, values) => {
  const newFilters = {
    ...props.selectedFilters,
    [filterKey]: values
  }
  emit('update:filters', newFilters)
}

// Open all filters modal
const openAllFiltersModal = () => {
  emit('open-all-filters')
}

// Reset filters when category changes
watch(() => props.category, () => {
  emit('update:filters', { length: [], type: [], finish: [] })
})
</script>

<style scoped>
.filter-chips-container {
  display: inline-flex;
  flex-wrap: nowrap; /* Keep in one row for horizontal scroll */
  gap: 8px;
  padding: 0 20px; /* Horizontal padding for spacing */
  align-items: center;
  min-width: max-content; /* Force container to be at least as wide as content */
}

.all-filters-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 20px; /* Pill shape */
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: Arial, sans-serif;
  flex-shrink: 0;
  white-space: nowrap;
}

.all-filters-btn:hover {
  border-color: #9ca3af;
}

.all-filters-btn.has-filters {
  background-color: #29275B;
  border-color: #29275B;
  color: #ffffff;
}

.all-filters-btn svg {
  flex-shrink: 0;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .filter-chips-container {
    gap: 6px;
  }

  .all-filters-btn {
    font-size: 13px;
    padding: 6px 12px;
  }
}
</style>
