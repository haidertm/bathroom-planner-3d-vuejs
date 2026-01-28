// Filter types and configuration for product filtering

export interface FilterOption {
  value: string
  label: string
  count?: number
}

// Filters that should use range sliders instead of checkboxes in AllFiltersDrawer
export const RANGE_FILTERS = ['length', 'width', 'height', 'depth'] as const
export type RangeFilterKey = typeof RANGE_FILTERS[number]

// All possible filter attributes across all categories
export interface SelectedFilters {
  // Common filters (checkbox-based)
  length: string[]
  type: string[]
  finish: string[]
  width: string[]
  style: string[]
  colour: string[]

  // Bath specific
  handed: string[]

  // Furniture specific
  mounting: string[]
  basinType: string[]
  depth: string[]

  // Toilet specific
  projection: string[]
  shape: string[]
  rimless: string[]
  cisternEntry: string[]
  softCloseSeat: string[]

  // Radiator specific
  height: string[]
  orientation: string[]
  btuOutput: string[]
  pipeCentres: string[]

  // Shower specific
  doorType: string[]
  glassThickness: string[]
  frameType: string[]
  frameFinish: string[]
  range: string[]

  // Price range
  priceMin?: number
  priceMax?: number

  // Dimension range filters (used in AllFiltersDrawer only)
  lengthMin?: number
  lengthMax?: number
  widthMin?: number
  widthMax?: number
  heightMin?: number
  heightMax?: number
  depthMin?: number
  depthMax?: number
}

export interface CategoryFilters {
  length?: FilterOption[]
  type?: FilterOption[]
  finish?: FilterOption[]
  width?: FilterOption[]
  style?: FilterOption[]
  colour?: FilterOption[]
  handed?: FilterOption[]
  mounting?: FilterOption[]
  basinType?: FilterOption[]
  depth?: FilterOption[]
  projection?: FilterOption[]
  shape?: FilterOption[]
  rimless?: FilterOption[]
  cisternEntry?: FilterOption[]
  softCloseSeat?: FilterOption[]
  height?: FilterOption[]
  orientation?: FilterOption[]
  btuOutput?: FilterOption[]
  pipeCentres?: FilterOption[]
  doorType?: FilterOption[]
  glassThickness?: FilterOption[]
  frameType?: FilterOption[]
  frameFinish?: FilterOption[]
  range?: FilterOption[]
}

// Filter configuration with primary (sticky chips) and secondary (all filters panel) separation
export interface CategoryFilterConfig {
  primary: string[]    // Shown in sticky chips
  secondary: string[]  // Shown in All Filters panel only
}

// Define primary and secondary filters for each category
export const CATEGORY_FILTER_CONFIG: Record<string, CategoryFilterConfig> = {
  Bath: {
    primary: ['length', 'type', 'finish'],
    secondary: ['width', 'handed', 'style']
  },
  Shower: {
    primary: ['shape', 'width', 'doorType'],
    secondary: ['glassThickness', 'frameType', 'frameFinish', 'range']
  },
  Furniture: {
    primary: ['width', 'colour', 'mounting'],
    secondary: ['type', 'basinType', 'depth', 'style']
  },
  Toilet: {
    primary: ['type', 'projection', 'shape'],
    secondary: ['rimless', 'cisternEntry', 'style', 'softCloseSeat']
  },
  Radiator: {
    primary: ['type', 'colour', 'orientation'],
    secondary: ['height', 'width', 'btuOutput', 'pipeCentres']
  },
  TowelRails: {
    primary: ['length', 'finish'],
    secondary: []
  },
  Mirror: {
    primary: ['length', 'type'],
    secondary: ['style']
  },
  WindowAndDoor: {
    primary: ['type'],
    secondary: []
  },
  Plumbing: {
    primary: ['type'],
    secondary: []
  }
}

// Filter labels for display - maps attribute keys to human-readable labels
export const FILTER_LABELS: Record<string, string> = {
  // Common
  length: 'Length',
  type: 'Type',
  finish: 'Finish',
  width: 'Width',
  style: 'Style',
  colour: 'Colour',

  // Bath
  handed: 'Handed',

  // Furniture
  mounting: 'Mounting',
  basinType: 'Basin Type',
  depth: 'Depth',

  // Toilet
  projection: 'Projection',
  shape: 'Shape',
  rimless: 'Rimless',
  cisternEntry: 'Cistern Entry',
  softCloseSeat: 'Soft Close Seat',

  // Radiator
  height: 'Height',
  orientation: 'Orientation',
  btuOutput: 'BTU Output',
  pipeCentres: 'Pipe Centres',

  // Shower
  doorType: 'Door Type',
  glassThickness: 'Glass Thickness',
  frameType: 'Frame Type',
  frameFinish: 'Frame Finish',
  range: 'Range'
}

// Empty filter state with all possible attributes
export const EMPTY_FILTERS: SelectedFilters = {
  // Common
  length: [],
  type: [],
  finish: [],
  width: [],
  style: [],
  colour: [],

  // Bath
  handed: [],

  // Furniture
  mounting: [],
  basinType: [],
  depth: [],

  // Toilet
  projection: [],
  shape: [],
  rimless: [],
  cisternEntry: [],
  softCloseSeat: [],

  // Radiator
  height: [],
  orientation: [],
  btuOutput: [],
  pipeCentres: [],

  // Shower
  doorType: [],
  glassThickness: [],
  frameType: [],
  frameFinish: [],
  range: [],

  // Price
  priceMin: 0,
  priceMax: undefined, // Will be set dynamically based on product prices

  // Dimension ranges (used in AllFiltersDrawer only)
  lengthMin: undefined,
  lengthMax: undefined,
  widthMin: undefined,
  widthMax: undefined,
  heightMin: undefined,
  heightMax: undefined,
  depthMin: undefined,
  depthMax: undefined
}

// Get primary filters for a category (shown in sticky chips)
export function getPrimaryFilters(category: string): string[] {
  return CATEGORY_FILTER_CONFIG[category]?.primary || []
}

// Get secondary filters for a category (shown in All Filters panel)
export function getSecondaryFilters(category: string): string[] {
  return CATEGORY_FILTER_CONFIG[category]?.secondary || []
}

// Get all available filters for a category (primary + secondary)
export function getAvailableFilters(category: string): string[] {
  const config = CATEGORY_FILTER_CONFIG[category]
  if (!config) return []
  return [...config.primary, ...config.secondary]
}

// Get filter label for display
export function getFilterLabel(filterKey: string): string {
  return FILTER_LABELS[filterKey] || filterKey
}

// Create empty filters object with fresh arrays to prevent state bleed
export function createEmptyFilters(): SelectedFilters {
  return {
    // Common
    length: [],
    type: [],
    finish: [],
    width: [],
    style: [],
    colour: [],

    // Bath
    handed: [],

    // Furniture
    mounting: [],
    basinType: [],
    depth: [],

    // Toilet
    projection: [],
    shape: [],
    rimless: [],
    cisternEntry: [],
    softCloseSeat: [],

    // Radiator
    height: [],
    orientation: [],
    btuOutput: [],
    pipeCentres: [],

    // Shower
    doorType: [],
    glassThickness: [],
    frameType: [],
    frameFinish: [],
    range: [],

    // Price
    priceMin: 0,
    priceMax: undefined,

    // Dimension ranges (used in AllFiltersDrawer only)
    lengthMin: undefined,
    lengthMax: undefined,
    widthMin: undefined,
    widthMax: undefined,
    heightMin: undefined,
    heightMax: undefined,
    depthMin: undefined,
    depthMax: undefined
  }
}

// Check if a filter key should use a range slider in AllFiltersDrawer
export function isRangeFilter(filterKey: string): boolean {
  return (RANGE_FILTERS as readonly string[]).includes(filterKey)
}