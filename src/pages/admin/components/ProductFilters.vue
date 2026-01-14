<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ProductFilters, UpdatedAtPreset } from '../../../types/admin';
import type { ComponentType } from '../../../constants/components';

const props = defineProps<{
  filters: ProductFilters;
  categories: ComponentType[];
  resultCount: number;
}>();

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void;
  (e: 'toggle-category', category: ComponentType): void;
  (e: 'update:priceRange', value: { min: number | null; max: number | null }): void;
  (e: 'update:enabledFilter', value: ProductFilters['enabledFilter']): void;
  (e: 'update:updatedAtFilter', value: ProductFilters['updatedAtFilter']): void;
  (e: 'clear-filters'): void;
  (e: 'export-csv'): void;
  (e: 'add-product'): void;
}>();

const showFilters = ref(true);

const hasActiveFilters = computed(() => {
  return props.filters.categories.length > 0 ||
    props.filters.searchQuery ||
    props.filters.priceRange.min !== null ||
    props.filters.priceRange.max !== null ||
    props.filters.enabledFilter !== 'all' ||
    props.filters.updatedAtFilter.preset !== 'all' ||
    props.filters.sortBy !== 'name' ||
    props.filters.sortOrder !== 'asc';
});

// Updated At filter presets
const updatedAtPresets: { value: UpdatedAtPreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    Toilet: '#3b82f6',
    Sink: '#10b981',
    Bath: '#8b5cf6',
    Shower: '#06b6d4',
    Radiator: '#f59e0b',
    TowelRails: '#ec4899',
    Mirror: '#6366f1',
    Door: '#84cc16',
    Furniture: '#f97316',
    WindowAndDoor: '#14b8a6',
  };
  return colors[category] || '#6b7280';
};

const handleSearchInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:searchQuery', target.value);
};

const handlePriceMinInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:priceRange', {
    ...props.filters.priceRange,
    min: target.value ? Number(target.value) : null
  });
};

const handlePriceMaxInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:priceRange', {
    ...props.filters.priceRange,
    max: target.value ? Number(target.value) : null
  });
};

const handleEnabledFilterChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('update:enabledFilter', target.value as ProductFilters['enabledFilter']);
};

const handleUpdatedAtPresetChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const preset = target.value as UpdatedAtPreset;
  emit('update:updatedAtFilter', {
    preset,
    customRange: preset === 'custom' ? props.filters.updatedAtFilter.customRange : { from: null, to: null },
  });
};

const handleUpdatedAtFromChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:updatedAtFilter', {
    ...props.filters.updatedAtFilter,
    customRange: {
      ...props.filters.updatedAtFilter.customRange,
      from: target.value || null,
    },
  });
};

const handleUpdatedAtToChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:updatedAtFilter', {
    ...props.filters.updatedAtFilter,
    customRange: {
      ...props.filters.updatedAtFilter.customRange,
      to: target.value || null,
    },
  });
};

/**
 * GTM tracking helper for ProductFilters events
 * Pushes events to Google Tag Manager dataLayer for analytics
 */
const trackGTMEvent = (
  eventName: string,
  eventData: Record<string, string | number | boolean>
): void => {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...eventData,
    });
  }
};

/**
 * Handle Add Product button click with GTM tracking
 */
const handleAddProduct = () => {
  trackGTMEvent('admin_add_product', {
    source: 'product_filters',
    current_result_count: props.resultCount,
  });
  emit('add-product');
};

/**
 * Handle Export CSV button click with GTM tracking
 */
const handleExportCSV = () => {
  trackGTMEvent('admin_export_csv', {
    source: 'product_filters',
    result_count: props.resultCount,
    has_active_filters: hasActiveFilters.value,
    active_categories: props.filters.categories.join(',') || 'none',
    search_query: props.filters.searchQuery || 'none',
  });
  emit('export-csv');
};

/**
 * Handle Clear Filters button click with GTM tracking
 */
const handleClearFilters = () => {
  trackGTMEvent('admin_clear_filters', {
    source: 'product_filters',
    cleared_categories: props.filters.categories.join(',') || 'none',
    cleared_search_query: props.filters.searchQuery || 'none',
    cleared_price_min: props.filters.priceRange.min ?? 'none',
    cleared_price_max: props.filters.priceRange.max ?? 'none',
    cleared_enabled_filter: props.filters.enabledFilter,
    cleared_updated_at_preset: props.filters.updatedAtFilter.preset,
  });
  emit('clear-filters');
};
</script>

<template>
  <div class="filters-container">
    <div class="filter-header">
      <button @click="showFilters = !showFilters" class="filter-toggle">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>
        Filters
        <svg
          :class="{ 'rotated': showFilters }"
          class="chevron-icon"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <button v-if="hasActiveFilters" @click="handleClearFilters" class="clear-filters-btn">
        Clear all
      </button>

      <button @click="handleAddProduct" class="add-product-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add Product
      </button>

      <button @click="handleExportCSV" class="export-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export CSV
      </button>
    </div>

    <div v-if="showFilters" class="filters-grid">
      <!-- Search -->
      <div class="filter-group">
        <label class="filter-label">Search</label>
        <div class="search-input-wrapper">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            :value="filters.searchQuery"
            @input="handleSearchInput"
            type="text"
            placeholder="Search products..."
            class="search-input"
          />
        </div>
      </div>

      <!-- Category Multi-select -->
      <div class="filter-group">
        <label class="filter-label">Categories (Multi-select)</label>
        <div class="category-chips">
          <button
            v-for="category in categories"
            :key="category"
            @click="emit('toggle-category', category)"
            class="category-chip"
            :class="{ 'active': filters.categories.includes(category) }"
            :style="filters.categories.includes(category) ? {
              backgroundColor: getCategoryColor(category),
              borderColor: getCategoryColor(category)
            } : {}"
          >
            {{ category }}
            <span v-if="filters.categories.includes(category)" class="chip-check">✓</span>
          </button>
        </div>
      </div>

      <!-- Price Range Filter -->
      <div class="filter-group">
        <label class="filter-label">Price Range</label>
        <div class="price-range-container">
          <div class="price-input-wrapper">
            <span class="price-prefix">£</span>
            <input
              type="number"
              :value="filters.priceRange.min"
              @input="handlePriceMinInput"
              placeholder="Min"
              class="price-input"
              min="0"
            />
          </div>
          <span class="price-separator">to</span>
          <div class="price-input-wrapper">
            <span class="price-prefix">£</span>
            <input
              type="number"
              :value="filters.priceRange.max"
              @input="handlePriceMaxInput"
              placeholder="Max"
              class="price-input"
              min="0"
            />
          </div>
        </div>
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <label class="filter-label">Status</label>
        <div class="status-select-wrapper">
          <div class="status-indicator" :class="filters.enabledFilter"></div>
          <select
            :value="filters.enabledFilter"
            @change="handleEnabledFilterChange"
            class="status-select"
          >
            <option value="all">All Products</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
          <svg class="select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      <!-- Updated At Filter -->
      <div class="filter-group">
        <label class="filter-label">Last Updated</label>
        <div class="updated-at-filter">
          <div class="updated-at-select-wrapper">
            <svg class="updated-at-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <select
              :value="filters.updatedAtFilter.preset"
              @change="handleUpdatedAtPresetChange"
              class="updated-at-select"
            >
              <option v-for="preset in updatedAtPresets" :key="preset.value" :value="preset.value">
                {{ preset.label }}
              </option>
            </select>
            <svg class="select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          <!-- Custom Date Range -->
          <Transition name="slide-fade">
            <div v-if="filters.updatedAtFilter.preset === 'custom'" class="custom-date-range">
              <div class="date-input-wrapper">
                <label class="date-label">From</label>
                <input
                  type="date"
                  :value="filters.updatedAtFilter.customRange.from"
                  @change="handleUpdatedAtFromChange"
                  class="date-input"
                />
              </div>
              <div class="date-input-wrapper">
                <label class="date-label">To</label>
                <input
                  type="date"
                  :value="filters.updatedAtFilter.customRange.to"
                  @change="handleUpdatedAtToChange"
                  class="date-input"
                />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>

  <!-- Results Count -->
  <div class="actions-bar">
    <span class="result-count">
      {{ resultCount }} product{{ resultCount !== 1 ? 's' : '' }} found
    </span>
  </div>
</template>

<style scoped>
.filters-container {
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  overflow: hidden;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color, #2d3748);
  cursor: pointer;
}

.chevron-icon {
  transition: transform 0.2s ease;
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.clear-filters-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background-color: #fee2e2;
  color: #dc2626;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.clear-filters-btn:hover {
  background-color: #fecaca;
}

.add-product-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background-color: var(--primary-color, #29275B);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-left: auto;
}

.add-product-btn:hover {
  background-color: #1e1b4b;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background-color: #dcfce7;
  color: #166534;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.export-btn:hover {
  background-color: #bbf7d0;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px;
  border-top: 1px solid var(--border-color, #e2e8f0);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color, #2d3748);
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted-color, #6b7280);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 40px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--primary-color, #29275B);
  box-shadow: 0 0 0 3px rgba(41, 39, 91, 0.1);
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.category-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 20px;
  background-color: #ffffff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-chip:hover {
  background-color: #f8fafc;
}

.category-chip.active {
  color: #ffffff;
}

.chip-check {
  font-size: 10px;
  margin-left: 2px;
}

.price-range-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.price-prefix {
  position: absolute;
  left: 10px;
  color: var(--muted-color, #6b7280);
  font-size: 14px;
  pointer-events: none;
}

.price-input {
  width: 90px;
  padding: 8px 10px 8px 24px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
}

.price-input:focus {
  border-color: var(--primary-color, #29275B);
  box-shadow: 0 0 0 3px rgba(41, 39, 91, 0.1);
}

.price-separator {
  color: var(--muted-color, #6b7280);
  font-size: 13px;
}

/* Status Select Styles */
.status-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.status-indicator {
  position: absolute;
  left: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6b7280;
  z-index: 1;
  pointer-events: none;
  transition: background-color 0.2s ease;
}

.status-indicator.all {
  background-color: #6b7280;
}

.status-indicator.enabled {
  background-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

.status-indicator.disabled {
  background-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.status-select {
  width: 100%;
  padding: 10px 36px 10px 32px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background-color: #ffffff;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.status-select:focus {
  box-shadow: none;
  outline: none;
}

.status-select:hover {
  border-color: #cbd5e1;
}

.select-arrow {
  position: absolute;
  right: 12px;
  color: var(--muted-color, #6b7280);
  pointer-events: none;
}

.actions-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.result-count {
  font-size: 14px;
  color: var(--muted-color, #6b7280);
}

/* Updated At Filter Styles */
.updated-at-filter {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.updated-at-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.updated-at-icon {
  position: absolute;
  left: 12px;
  color: var(--muted-color, #6b7280);
  z-index: 1;
  pointer-events: none;
}

.updated-at-select {
  width: 100%;
  padding: 10px 36px 10px 38px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  background-color: #ffffff;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.updated-at-select:focus {
  box-shadow: none;
  outline: none;
}

.updated-at-select:hover {
  border-color: #cbd5e1;
}

.custom-date-range {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
}

.date-input-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted-color, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-input {
  padding: 8px 10px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  background-color: #ffffff;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.date-input:focus {
  border-color: var(--primary-color, #29275B);
  box-shadow: 0 0 0 3px rgba(41, 39, 91, 0.1);
}

.date-input:hover {
  border-color: #cbd5e1;
}

/* Slide fade transition for custom date range */
.slide-fade-enter-active {
  transition: all 0.2s ease;
}

.slide-fade-leave-active {
  transition: all 0.15s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Mobile styles */
@media (max-width: 767px) {
  .filter-header {
    padding: 12px 16px;
    gap: 10px;
  }

  .filters-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }

  .custom-date-range {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
