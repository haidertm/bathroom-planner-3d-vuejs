// Filter types and configuration for product filtering

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface SelectedFilters {
  length: string[]
  type: string[]
  finish: string[]
}

export interface CategoryFilters {
  length?: FilterOption[]
  type?: FilterOption[]
  finish?: FilterOption[]
}

// Define which filters are available for each category
export const CATEGORY_FILTER_CONFIG: Record<string, string[]> = {
  Bath: ['length', 'type', 'finish'],
  Shower: ['length', 'type', 'finish'],
  Toilet: ['type', 'finish'],
  Furniture: ['length', 'type', 'finish'],
  Radiator: ['length', 'type', 'finish'],
  TowelRails: ['length', 'finish'],
  Mirror: ['length', 'type'],
  WindowAndDoor: ['type'],
  Plumbing: ['type']
}

// Default filter labels for display
export const FILTER_LABELS: Record<string, string> = {
  length: 'Length',
  type: 'Type',
  finish: 'Finish'
}

// Empty filter state
export const EMPTY_FILTERS: SelectedFilters = {
  length: [],
  type: [],
  finish: []
}

// Get available filters for a category
export function getAvailableFilters(category: string): string[] {
  return CATEGORY_FILTER_CONFIG[category] || []
}
