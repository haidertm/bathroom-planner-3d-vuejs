// Filter utility functions for product filtering

import type { FilterOption, SelectedFilters } from '../constants/filters'
import { EMPTY_FILTERS } from '../constants/filters'

// All possible filter attribute keys
type FilterAttributeKey =
  | 'length' | 'type' | 'finish' | 'width' | 'style' | 'colour'
  | 'handed' | 'mounting' | 'basinType' | 'depth'
  | 'projection' | 'shape' | 'rimless' | 'cisternEntry' | 'softCloseSeat'
  | 'height' | 'orientation' | 'btuOutput' | 'pipeCentres'
  | 'doorType' | 'glassThickness' | 'frameType' | 'frameFinish' | 'range'

interface FilterAttributes {
  length?: string
  type?: string
  finish?: string
  width?: string
  style?: string
  colour?: string
  handed?: string
  mounting?: string
  basinType?: string
  depth?: string
  projection?: string
  shape?: string
  rimless?: boolean | string
  cisternEntry?: string
  softCloseSeat?: boolean | string
  height?: string
  orientation?: string
  btuOutput?: string
  pipeCentres?: string
  doorType?: string
  glassThickness?: string
  frameType?: string
  frameFinish?: string
  range?: string
  [key: string]: unknown
}

interface ProductVariant {
  id?: string
  name?: string
  sku?: string
  price?: number | string
  dimensions?: {
    width: number
    height: number
    depth: number
  }
  filterAttributes?: FilterAttributes
  [key: string]: unknown
}

interface Product {
  id: string
  name: string
  price?: number | string
  variants?: ProductVariant[]
  filterAttributes?: FilterAttributes
  [key: string]: unknown
}

/**
 * Extract unique filter values from a list of products
 * Looks at both product-level and variant-level filterAttributes
 */
export function extractFilterOptions(
  products: Product[],
  filterKey: string
): FilterOption[] {
  const valuesSet = new Set<string>()

  for (const product of products) {
    // Check product-level filterAttributes
    const productValue = product.filterAttributes?.[filterKey]
    if (productValue !== undefined && productValue !== null) {
      valuesSet.add(formatFilterValue(productValue))
    }

    // Check variant-level filterAttributes
    if (product.variants) {
      for (const variant of product.variants) {
        const variantValue = variant.filterAttributes?.[filterKey]
        if (variantValue !== undefined && variantValue !== null) {
          valuesSet.add(formatFilterValue(variantValue))
        }
      }
    }
  }

  // Convert to FilterOption array and sort
  return Array.from(valuesSet)
    .sort((a, b) => {
      // Sort numeric values numerically (e.g., "1370mm" < "1500mm")
      const numA = parseInt(a)
      const numB = parseInt(b)
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB
      }
      // Sort strings alphabetically
      return a.localeCompare(b)
    })
    .map(value => ({
      value,
      label: formatDisplayLabel(value, filterKey)
    }))
}

/**
 * Format a filter value to a string
 */
function formatFilterValue(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return String(value)
}

/**
 * Format display label for filter values
 */
function formatDisplayLabel(value: string, _filterKey: string): string {
  // For boolean-type filters, the value is already 'Yes' or 'No'
  if (value === 'Yes' || value === 'No') {
    return value
  }
  return value
}

/**
 * Filter products based on selected filters
 * A product matches if ANY of its variants match ALL selected filter criteria
 */
export function filterProducts(
  products: Product[],
  filters: SelectedFilters
): Product[] {
  // Get all filter keys that have active selections
  const activeFilterKeys = getActiveFilterKeys(filters)

  // Check if price filter is active
  // We consider it active if priceMin > 0 OR if priceMax is explicitly set (not undefined)
  const hasPriceFilter =
    (filters.priceMin !== undefined && filters.priceMin > 0) ||
    (filters.priceMax !== undefined)

  // If no filters selected, return all products
  if (activeFilterKeys.length === 0 && !hasPriceFilter) {
    return products
  }

  return products.filter(product => {
    // First check price filter at product level
    if (hasPriceFilter) {
      const productPrice = getProductMinPrice(product)
      if (productPrice !== null) {
        const minPrice = filters.priceMin ?? 0
        const maxPrice = filters.priceMax ?? Infinity
        if (productPrice < minPrice || productPrice > maxPrice) {
          return false
        }
      }
    }

    // If no attribute filters, product passes (price already checked)
    if (activeFilterKeys.length === 0) {
      return true
    }

    // Check if product-level attributes match
    const productMatches = matchesFilters(product.filterAttributes, filters, activeFilterKeys)
    if (productMatches) return true

    // Check if any variant matches
    if (product.variants) {
      return product.variants.some(variant =>
        matchesFilters(variant.filterAttributes, filters, activeFilterKeys)
      )
    }

    return false
  })
}

/**
 * Get all filter keys that have active selections
 */
function getActiveFilterKeys(filters: SelectedFilters): FilterAttributeKey[] {
  const allFilterKeys: FilterAttributeKey[] = [
    'length', 'type', 'finish', 'width', 'style', 'colour',
    'handed', 'mounting', 'basinType', 'depth',
    'projection', 'shape', 'rimless', 'cisternEntry', 'softCloseSeat',
    'height', 'orientation', 'btuOutput', 'pipeCentres',
    'doorType', 'glassThickness', 'frameType', 'frameFinish', 'range'
  ]

  return allFilterKeys.filter(key => {
    const filterValue = filters[key as keyof SelectedFilters]
    return Array.isArray(filterValue) && filterValue.length > 0
  })
}

/**
 * Get the minimum price from a product (from variants or product level)
 * Handles both number and string prices
 */
function getProductMinPrice(product: Product): number | null {
  // Helper to parse price (handles both string and number)
  const parsePrice = (price: unknown): number | null => {
    if (typeof price === 'number') {
      return price
    }
    if (typeof price === 'string') {
      const parsed = parseFloat(price)
      return isNaN(parsed) ? null : parsed
    }
    return null
  }

  // Check product-level price first
  const productPrice = parsePrice(product.price)
  if (productPrice !== null) {
    return productPrice
  }

  // Check variant prices and get minimum
  if (product.variants && product.variants.length > 0) {
    const prices = product.variants
      .map(v => parsePrice(v.price))
      .filter((p): p is number => p !== null)

    if (prices.length > 0) {
      return Math.min(...prices)
    }
  }

  return null
}

/**
 * Check if filterAttributes match the selected filters
 * Uses AND logic between filter types, but OR within same filter type
 */
function matchesFilters(
  attributes: FilterAttributes | undefined,
  filters: SelectedFilters,
  activeFilterKeys: FilterAttributeKey[]
): boolean {
  if (!attributes) return false

  // Check each active filter key
  for (const filterKey of activeFilterKeys) {
    const filterValues = filters[filterKey as keyof SelectedFilters] as string[]
    if (!filterValues || filterValues.length === 0) continue

    const attributeValue = attributes[filterKey]
    if (attributeValue === undefined || attributeValue === null) {
      return false
    }

    // Convert attribute value to string for comparison
    const attributeString = formatFilterValue(attributeValue)

    // Check if the attribute value matches any of the selected filter values
    if (!filterValues.includes(attributeString)) {
      return false
    }
  }

  return true
}

/**
 * Get filter options with counts based on current filter state
 * Shows how many products would match if each option was selected
 */
export function getFilterOptionsWithCounts(
  products: Product[],
  filterKey: string,
  currentFilters: SelectedFilters
): FilterOption[] {
  const options = extractFilterOptions(products, filterKey)

  return options.map(option => {
    // Create a test filter with this option selected
    const testFilters: SelectedFilters = {
      ...currentFilters,
      [filterKey]: [option.value]
    }

    // Count how many products match with this filter
    const matchingProducts = filterProducts(products, testFilters)

    return {
      ...option,
      count: matchingProducts.length
    }
  })
}

/**
 * Filter product variants based on selected filters
 * Returns only the variants that match the filters
 */
export function filterProductVariants(
  product: Product,
  filters: SelectedFilters
): ProductVariant[] {
  if (!product.variants) return []

  const activeFilterKeys = getActiveFilterKeys(filters)

  if (activeFilterKeys.length === 0) {
    return product.variants
  }

  return product.variants.filter(variant =>
    matchesFilters(variant.filterAttributes, filters, activeFilterKeys)
  )
}

/**
 * Check if any filters are currently active
 * @param filters - The selected filters
 * @param maxPrice - Optional max price to check against (dynamic based on products)
 */
export function hasActiveFilters(filters: SelectedFilters, maxPrice?: number): boolean {
  const activeFilterKeys = getActiveFilterKeys(filters)

  // Check if price filter is active
  // priceMin > 0 means user moved min slider
  // priceMax < maxPrice means user moved max slider (if maxPrice provided)
  const hasPriceFilter =
    (filters.priceMin !== undefined && filters.priceMin > 0) ||
    (maxPrice !== undefined && filters.priceMax !== undefined && filters.priceMax < maxPrice)

  return activeFilterKeys.length > 0 || hasPriceFilter
}

/**
 * Get the total count of active filters
 * @param filters - The selected filters
 * @param maxPrice - Optional max price to check against (dynamic based on products)
 */
export function getActiveFilterCount(filters: SelectedFilters, maxPrice?: number): number {
  const activeFilterKeys = getActiveFilterKeys(filters)
  let count = 0

  for (const key of activeFilterKeys) {
    const filterValue = filters[key as keyof SelectedFilters]
    if (Array.isArray(filterValue)) {
      count += filterValue.length
    }
  }

  // Count price filter as 1 if active
  const hasPriceFilter =
    (filters.priceMin !== undefined && filters.priceMin > 0) ||
    (maxPrice !== undefined && filters.priceMax !== undefined && filters.priceMax < maxPrice)

  if (hasPriceFilter) {
    count += 1
  }

  return count
}

/**
 * Clear all filters - returns empty filter state
 */
export function clearAllFilters(): SelectedFilters {
  return { ...EMPTY_FILTERS }
}

/**
 * Get active filter count for specific filter keys (used for badge display)
 */
export function getActiveFilterCountForKeys(filters: SelectedFilters, filterKeys: string[]): number {
  let count = 0
  for (const key of filterKeys) {
    const filterValue = filters[key as keyof SelectedFilters]
    if (Array.isArray(filterValue)) {
      count += filterValue.length
    }
  }
  return count
}
