// Filter utility functions for product filtering

import type { FilterOption, SelectedFilters } from '../constants/filters'

interface ProductVariant {
  id?: string
  name?: string
  sku?: string
  dimensions?: {
    width: number
    height: number
    depth: number
  }
  filterAttributes?: {
    length?: string
    type?: string
    finish?: string
  }
  [key: string]: unknown
}

interface Product {
  id: string
  name: string
  variants?: ProductVariant[]
  filterAttributes?: {
    length?: string
    type?: string
    finish?: string
  }
  [key: string]: unknown
}

/**
 * Extract unique filter values from a list of products
 * Looks at both product-level and variant-level filterAttributes
 */
export function extractFilterOptions(
  products: Product[],
  filterKey: 'length' | 'type' | 'finish'
): FilterOption[] {
  const valuesSet = new Set<string>()

  for (const product of products) {
    // Check product-level filterAttributes
    if (product.filterAttributes?.[filterKey]) {
      valuesSet.add(product.filterAttributes[filterKey])
    }

    // Check variant-level filterAttributes
    if (product.variants) {
      for (const variant of product.variants) {
        if (variant.filterAttributes?.[filterKey]) {
          valuesSet.add(variant.filterAttributes[filterKey])
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
      label: value
    }))
}

/**
 * Filter products based on selected filters
 * A product matches if ANY of its variants match ALL selected filter criteria
 */
export function filterProducts(
  products: Product[],
  filters: SelectedFilters
): Product[] {
  // If no filters selected, return all products
  const hasActiveFilters =
    filters.length.length > 0 ||
    filters.type.length > 0 ||
    filters.finish.length > 0

  if (!hasActiveFilters) {
    return products
  }

  return products.filter(product => {
    // Check if product-level attributes match
    const productMatches = matchesFilters(product.filterAttributes, filters)
    if (productMatches) return true

    // Check if any variant matches
    if (product.variants) {
      return product.variants.some(variant =>
        matchesFilters(variant.filterAttributes, filters)
      )
    }

    return false
  })
}

/**
 * Check if filterAttributes match the selected filters
 * Uses AND logic between filter types, but OR within same filter type
 */
function matchesFilters(
  attributes: { length?: string; type?: string; finish?: string } | undefined,
  filters: SelectedFilters
): boolean {
  if (!attributes) return false

  // Check length filter (OR logic within, must match at least one if any selected)
  if (filters.length.length > 0) {
    if (!attributes.length || !filters.length.includes(attributes.length)) {
      return false
    }
  }

  // Check type filter
  if (filters.type.length > 0) {
    if (!attributes.type || !filters.type.includes(attributes.type)) {
      return false
    }
  }

  // Check finish filter
  if (filters.finish.length > 0) {
    if (!attributes.finish || !filters.finish.includes(attributes.finish)) {
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
  filterKey: 'length' | 'type' | 'finish',
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

  const hasActiveFilters =
    filters.length.length > 0 ||
    filters.type.length > 0 ||
    filters.finish.length > 0

  if (!hasActiveFilters) {
    return product.variants
  }

  return product.variants.filter(variant =>
    matchesFilters(variant.filterAttributes, filters)
  )
}

/**
 * Check if any filters are currently active
 */
export function hasActiveFilters(filters: SelectedFilters): boolean {
  return (
    filters.length.length > 0 ||
    filters.type.length > 0 ||
    filters.finish.length > 0
  )
}

/**
 * Get the total count of active filters
 */
export function getActiveFilterCount(filters: SelectedFilters): number {
  return filters.length.length + filters.type.length + filters.finish.length
}

/**
 * Clear all filters
 */
export function clearAllFilters(): SelectedFilters {
  return {
    length: [],
    type: [],
    finish: []
  }
}
