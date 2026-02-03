<template>
  <div v-if="primaryFilters.length > 0" class="filter-chips-container">
    <!-- Dynamic Primary Filters -->
    <FilterDropdown
      v-for="filterKey in primaryFilters"
      :key="filterKey"
      :label="getFilterLabel(filterKey)"
      :options="getFilterOptions(filterKey)"
      :selected="getSelectedValues(filterKey)"
      @update="updateFilter(filterKey, $event)"
    />

    <!-- All Filters Button with background filter count badge -->
    <button
      class="all-filters-btn"
      :class="{
        'has-filters': totalActiveFilters > 0 || hasBackgroundFilters,
        'has-background-filters': hasBackgroundFilters
      }"
      @click="openAllFiltersModal"
      :title="hasBackgroundFilters ? `${props.backgroundFilterCount} filter(s) from search still applied` : ''"
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
      <span v-if="secondaryActiveCount > 0" class="secondary-filter-badge">{{ secondaryActiveCount }}</span>
    </button>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useGtm } from '@gtm-support/vue-gtm'
import FilterDropdown from './FilterDropdown.vue'
import { getPrimaryFilters, getSecondaryFilters, getFilterLabel as getLabel, createEmptyFilters, RANGE_FILTERS } from '../../constants/filters'
import { extractFilterOptions, extractRangeBounds } from '../../utils/filters'

const gtm = useGtm()

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
    default: () => ({})
  },
  // Background filters preserved from search view transition
  backgroundFilterCount: {
    type: Number,
    default: 0
  },
  backgroundFilters: {
    type: Object,
    default: () => ({
      style: [],
      priceMin: null,
      priceMax: null
    })
  }
})

const emit = defineEmits(['update:filters', 'open-all-filters', 'clear-background-filters'])

// Get primary filters for this category
const primaryFilters = computed(() => {
  return getPrimaryFilters(props.category)
})

// Get secondary filters for this category (for badge count)
const secondaryFilters = computed(() => {
  return getSecondaryFilters(props.category)
})

// Get filter label for display
const getFilterLabel = (filterKey) => {
  return getLabel(filterKey)
}

// Get filter options for a specific filter key
const getFilterOptions = (filterKey) => {
  return extractFilterOptions(props.products, filterKey)
}

// Get selected values for a specific filter key
const getSelectedValues = (filterKey) => {
  return props.selectedFilters[filterKey] || []
}

// Total active filters count (for primary filters)
const totalActiveFilters = computed(() => {
  let count = 0
  for (const filterKey of primaryFilters.value) {
    const values = props.selectedFilters[filterKey]
    if (Array.isArray(values)) {
      count += values.length
    }
  }
  return count
})

// Count of active secondary filters (for badge display)
const secondaryActiveCount = computed(() => {
  let count = 0
  for (const filterKey of secondaryFilters.value) {
    const values = props.selectedFilters[filterKey]
    if (Array.isArray(values)) {
      count += values.length
    }
  }
  // Also count price filter if active
  // Price filter is considered "active" for badge display only if priceMin > 0
  // (since priceMax being set to dynamic max doesn't count as user filtering)
  const hasPriceFilter = props.selectedFilters.priceMin !== undefined && props.selectedFilters.priceMin > 0
  if (hasPriceFilter) {
    count += 1
  }

  // Count active range filters (length, width, height, depth)
  for (const rangeKey of RANGE_FILTERS) {
    const minKey = `${rangeKey}Min`
    const maxKey = `${rangeKey}Max`
    const filterMin = props.selectedFilters[minKey]
    const filterMax = props.selectedFilters[maxKey]

    // Get dynamic bounds for comparison
    const bounds = extractRangeBounds(props.products, rangeKey)
    if (bounds) {
      // Count as active if min is greater than dynamic min OR max is less than dynamic max
      const isActive = (filterMin !== undefined && filterMin > bounds.min) ||
                       (filterMax !== undefined && filterMax < bounds.max)
      if (isActive) {
        count += 1
      }
    }
  }

  // Add background filters count (preserved from search view transition)
  count += props.backgroundFilterCount

  return count
})

// Check if there are any active background filters
const hasBackgroundFilters = computed(() => {
  return props.backgroundFilterCount > 0
})

// Update a specific filter
const updateFilter = (filterKey, values) => {
  const newFilters = {
    ...props.selectedFilters,
    [filterKey]: values
  }
  emit('update:filters', newFilters)

  // Track filter update in GTM
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'filter_chip_update',
      category: 'Filters',
      action: 'Update Filter',
      label: `${filterKey}: ${values.length} selected`
    })
  }
}

// Open all filters modal
const openAllFiltersModal = () => {
  emit('open-all-filters')

  // Track modal open in GTM
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'filter_modal_open',
      category: 'Filters',
      action: 'Open All Filters',
      label: 'All Filters Modal'
    })
  }
}

// Reset filters when category changes
watch(() => props.category, () => {
  emit('update:filters', createEmptyFilters())
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

.secondary-filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background-color: #ef4444;
  color: #ffffff;
  font-size: 11px;
  font-weight: 600;
  border-radius: 9px;
  margin-left: 4px;
}

.all-filters-btn.has-filters .secondary-filter-badge {
  background-color: #ffffff;
  color: #29275B;
}

/* Background filters indicator - subtle visual cue when filters from search are preserved */
.all-filters-btn.has-background-filters {
  box-shadow: 0 0 0 2px rgba(41, 39, 91, 0.2);
}

.all-filters-btn.has-background-filters .secondary-filter-badge {
  background-color: #EC048C;
  color: #ffffff;
}

.all-filters-btn.has-filters.has-background-filters .secondary-filter-badge {
  background-color: #EC048C;
  color: #ffffff;
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