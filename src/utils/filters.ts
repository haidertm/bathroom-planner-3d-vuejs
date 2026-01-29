// Filter utility functions for product filtering

import type { FilterOption, SelectedFilters } from '../constants/filters'
import { createEmptyFilters, RANGE_FILTERS } from '../constants/filters'

// All possible filter attribute keys
type FilterAttributeKey =
    | 'length' | 'type' | 'finish' | 'width' | 'style' | 'colour'
    | 'handed' | 'mounting' | 'basinType' | 'depth'
    | 'projection' | 'shape' | 'rimless' | 'cisternEntry' | 'softCloseSeat'
    | 'height' | 'orientation' | 'btuOutput' | 'pipeCentres'
    | 'doorType' | 'glassThickness' | 'frameType' | 'frameFinish' | 'range'
    | 'feetColour' | 'diameter' | 'size' | 'material'

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
  feetColour?: string
  diameter?: string
  size?: string
  material?: string
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
 * Get effective filter attributes for a variant, falling back to product-level attributes
 * Returns variant.filterAttributes if present, otherwise product.filterAttributes
 * This ensures variants without their own attributes inherit from the product
 */
function getEffectiveAttributes(
    variant: ProductVariant,
    product: Product
): FilterAttributes | undefined {
  // If variant has its own filterAttributes, use them
  if (variant.filterAttributes && Object.keys(variant.filterAttributes).length > 0) {
    return variant.filterAttributes
  }
  // Fall back to product-level filterAttributes
  return product.filterAttributes
}

/**
 * Extract numeric value from a dimension string and convert to centimeters
 * Detects unit suffixes (mm, cm, m) and applies appropriate conversion:
 *   - mm → multiply by 0.1 (to get cm)
 *   - cm → multiply by 1 (no change)
 *   - m  → multiply by 100 (to get cm)
 * If no unit is present, assumes the value is already in centimeters
 * Examples: "1500mm" -> 150, "150cm" -> 150, "1.5m" -> 150, "150" -> 150
 * Returns null if no valid number found
 */
export function extractNumericValue(value: unknown): number | null {
  // If already a number, assume it's in centimeters
  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null

    // Regex to extract numeric part (with optional sign and decimals) and unit suffix
    // Matches: optional minus, digits, optional decimal part, optional unit (mm, cm, m)
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*(mm|cm|m)?$/i)

    if (match) {
      const numericPart = parseFloat(match[1])
      if (isNaN(numericPart)) return null

      const unit = match[2]?.toLowerCase()

      // Apply conversion factor based on unit
      switch (unit) {
        case 'mm':
          return numericPart * 0.1  // mm to cm
        case 'm':
          return numericPart * 100  // m to cm
        case 'cm':
        default:
          return numericPart        // cm or no unit (assume cm)
      }
    }

    // Fallback: try to extract any numeric value if regex didn't match
    // This handles edge cases like "~150cm" or "150 cm approx"
    const fallbackMatch = trimmed.match(/(-?\d+(?:\.\d+)?)\s*(mm|cm|m)?/i)
    if (fallbackMatch) {
      const numericPart = parseFloat(fallbackMatch[1])
      if (isNaN(numericPart)) return null

      const unit = fallbackMatch[2]?.toLowerCase()

      switch (unit) {
        case 'mm':
          return numericPart * 0.1
        case 'm':
          return numericPart * 100
        case 'cm':
        default:
          return numericPart
      }
    }

    return null
  }

  return null
}

/**
 * Parse price value (handles both string and number, including currency-formatted strings)
 * Trims whitespace, removes currency symbols and thousands separators
 * Returns null if no valid number found
 */
export function parsePrice(price: unknown): number | null {
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

/**
 * Extract min and max numeric values from filter options for a given filter key
 * Used to determine the range bounds for range sliders
 */
export function extractRangeBounds(
    products: Product[],
    filterKey: string
): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity

  for (const product of products) {
    // Check product-level filterAttributes
    const productValue = product.filterAttributes?.[filterKey]
    const productNumeric = extractNumericValue(productValue)
    if (productNumeric !== null) {
      if (productNumeric < min) min = productNumeric
      if (productNumeric > max) max = productNumeric
    }

    // Check variant-level filterAttributes
    if (product.variants) {
      for (const variant of product.variants) {
        const variantValue = variant.filterAttributes?.[filterKey]
        const variantNumeric = extractNumericValue(variantValue)
        if (variantNumeric !== null) {
          if (variantNumeric < min) min = variantNumeric
          if (variantNumeric > max) max = variantNumeric
        }
      }
    }
  }

  // Return null if no valid values found
  if (min === Infinity || max === -Infinity) {
    return null
  }

  return { min, max }
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
        // Sort numeric values numerically (e.g., "1370mm" < "1500.5mm")
        const numA = parseFloat(a)
        const numB = parseFloat(b)
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
 * Format a filter value to a string
 */
function formatFilterValue(value: unknown): string {
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  return String(value)
}

/**
 * Get active range filters (dimension filters with min/max values set)
 * Skips range filters when checkbox filters exist for the same dimension
 * (checkbox filters take precedence over range filters)
 */
function getActiveRangeFilters(filters: SelectedFilters): Array<{
  key: string
  min: number
  max: number
}> {
  const activeRanges: Array<{ key: string; min: number; max: number }> = []

  for (const rangeKey of RANGE_FILTERS) {
    // Skip range filter if checkbox filter exists for this dimension
    // Checkbox filters take precedence (e.g., width: ['400mm', '600mm'] overrides widthMin/widthMax)
    const checkboxValues = filters[rangeKey as keyof SelectedFilters]
    if (Array.isArray(checkboxValues) && checkboxValues.length > 0) {
      continue // Use checkbox filter instead of range filter
    }

    const minKey = `${rangeKey}Min` as keyof SelectedFilters
    const maxKey = `${rangeKey}Max` as keyof SelectedFilters
    const minVal = filters[minKey] as number | undefined
    const maxVal = filters[maxKey] as number | undefined

    // Consider range active if either min or max is set
    if (minVal !== undefined || maxVal !== undefined) {
      activeRanges.push({
        key: rangeKey,
        min: minVal ?? 0,
        max: maxVal ?? Infinity
      })
    }
  }

  return activeRanges
}

/**
 * Check if a value falls within a range
 */
function isValueInRange(value: unknown, min: number, max: number): boolean {
  const numericValue = extractNumericValue(value)
  if (numericValue === null) return false
  return numericValue >= min && numericValue <= max
}

/**
 * Filter products based on selected filters
 * A product matches if ANY of its variants match ALL selected filter criteria
 */
export function filterProducts(
    products: Product[],
    filters: SelectedFilters
): Product[] {
  // Get all filter keys that have active selections (checkbox filters)
  const activeFilterKeys = getActiveFilterKeys(filters)

  // Get active range filters (dimension sliders)
  const activeRangeFilters = getActiveRangeFilters(filters)

  // Check if price filter is active
  // We consider it active if priceMin > 0 OR if priceMax is explicitly set (not undefined)
  const hasPriceFilter =
      (filters.priceMin !== undefined && filters.priceMin > 0) ||
      (filters.priceMax !== undefined)

  // If no filters selected, return all products
  if (activeFilterKeys.length === 0 && !hasPriceFilter && activeRangeFilters.length === 0) {
    return products
  }

  // Helper to check if a price is within filter range
  const isPriceInRange = (price: number | null, minPrice: number, maxPrice: number): boolean => {
    if (price === null) return false // No valid price = treat as non-match when price filter is active
    return price >= minPrice && price <= maxPrice
  }

  // Helper to check if attributes match all range filters
  const matchesRangeFilters = (filterAttributes: Record<string, unknown> | undefined): boolean => {
    if (!filterAttributes) return activeRangeFilters.length === 0

    for (const rangeFilter of activeRangeFilters) {
      const attributeValue = filterAttributes[rangeFilter.key]
      if (!isValueInRange(attributeValue, rangeFilter.min, rangeFilter.max)) {
        return false
      }
    }
    return true
  }

  // Helper to check if a single item (variant or product) matches price, range, and attribute filters
  const itemMatchesAllFilters = (
      price: unknown,
      filterAttributes: Record<string, unknown> | undefined,
      minPrice: number,
      maxPrice: number
  ): boolean => {
    // Check price filter if active
    if (hasPriceFilter) {
      const parsedPrice = parsePrice(price)
      if (!isPriceInRange(parsedPrice, minPrice, maxPrice)) {
        return false
      }
    }

    // Check range filters (dimension sliders)
    if (activeRangeFilters.length > 0) {
      if (!matchesRangeFilters(filterAttributes)) {
        return false
      }
    }

    // Check attribute filters if active (checkbox filters)
    if (activeFilterKeys.length > 0) {
      if (!matchesFilters(filterAttributes, filters, activeFilterKeys)) {
        return false
      }
    }

    return true
  }

  return products.filter(product => {
    const minPrice = filters.priceMin ?? 0
    const maxPrice = filters.priceMax ?? Infinity

    // For products with variants, check if ANY variant matches BOTH price AND attributes together
    if (product.variants && product.variants.length > 0) {
      return product.variants.some(variant => {
        // Use variant price, fall back to product price if variant has no price
        const variantPrice = variant.price ?? product.price
        // Use effective attributes (variant's own or fallback to product's)
        const effectiveAttributes = getEffectiveAttributes(variant, product)
        return itemMatchesAllFilters(variantPrice, effectiveAttributes, minPrice, maxPrice)
      })
    }

    // For products without variants, check product-level price and attributes together
    return itemMatchesAllFilters(product.price, product.filterAttributes, minPrice, maxPrice)
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
    'doorType', 'glassThickness', 'frameType', 'frameFinish', 'range',
    'feetColour', 'diameter', 'size', 'material'
  ]

  return allFilterKeys.filter(key => {
    const filterValue = filters[key as keyof SelectedFilters]
    return Array.isArray(filterValue) && filterValue.length > 0
  })
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
  if (!attributes) {
    return false
  }

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
    const matches = filterValues.includes(attributeString)

    if (!matches) {
      return false
    }
  }

  return true
}

/**
 * Get filter options with counts based on current filter state
 * Shows how many products would match if each option was selected
 * Optimized: single pass over products instead of O(options × products)
 */
export function getFilterOptionsWithCounts(
    products: Product[],
    filterKey: string,
    currentFilters: SelectedFilters
): FilterOption[] {
  const options = extractFilterOptions(products, filterKey)

  // Initialize count map for all option values
  const countMap = new Map<string, number>()
  for (const option of options) {
    countMap.set(option.value, 0)
  }

  // Get active filters EXCLUDING the current filterKey
  const allActiveFilterKeys = getActiveFilterKeys(currentFilters)
  const activeFilterKeysExcludingCurrent = allActiveFilterKeys.filter(key => key !== filterKey)

  // Get active range filters
  const activeRangeFilters = getActiveRangeFilters(currentFilters)

  // Check if price filter is active
  const hasPriceFilter =
      (currentFilters.priceMin !== undefined && currentFilters.priceMin > 0) ||
      (currentFilters.priceMax !== undefined)

  const minPriceFilter = currentFilters.priceMin ?? 0
  const maxPriceFilter = currentFilters.priceMax ?? Infinity

  // Helper to check if price is in range
  const isPriceInRange = (price: number | null): boolean => {
    if (!hasPriceFilter) return true
    if (price === null) return false
    return price >= minPriceFilter && price <= maxPriceFilter
  }

  // Helper to check if attributes match range filters
  const matchesRangeFilters = (filterAttributes: Record<string, unknown> | undefined): boolean => {
    if (activeRangeFilters.length === 0) return true
    if (!filterAttributes) return false

    for (const rangeFilter of activeRangeFilters) {
      const attributeValue = filterAttributes[rangeFilter.key]
      if (!isValueInRange(attributeValue, rangeFilter.min, rangeFilter.max)) {
        return false
      }
    }
    return true
  }

  // Helper to check if attributes match other active filters (excluding filterKey)
  const matchesOtherFilters = (filterAttributes: Record<string, unknown> | undefined): boolean => {
    if (activeFilterKeysExcludingCurrent.length === 0) return true
    return matchesFilters(filterAttributes as FilterAttributes, currentFilters, activeFilterKeysExcludingCurrent as FilterAttributeKey[])
  }

  // Helper to check if an item passes all filters except filterKey
  const itemPassesOtherFilters = (
      price: unknown,
      filterAttributes: Record<string, unknown> | undefined
  ): boolean => {
    // Check price filter
    if (hasPriceFilter) {
      const parsedPrice = parsePrice(price)
      if (!isPriceInRange(parsedPrice)) {
        return false
      }
    }

    // Check range filters
    if (!matchesRangeFilters(filterAttributes)) {
      return false
    }

    // Check other attribute filters (excluding filterKey)
    if (!matchesOtherFilters(filterAttributes)) {
      return false
    }

    return true
  }

  // Single pass over products to accumulate counts
  for (const product of products) {
    if (product.variants && product.variants.length > 0) {
      // For products with variants, check each variant
      for (const variant of product.variants) {
        const variantPrice = variant.price ?? product.price
        // Use effective attributes (variant's own or fallback to product's)
        const effectiveAttributes = getEffectiveAttributes(variant, product)

        // Check if variant passes all other filters
        if (!itemPassesOtherFilters(variantPrice, effectiveAttributes)) {
          continue
        }

        // Get this variant's value for filterKey and increment count
        const attributeValue = effectiveAttributes?.[filterKey]
        if (attributeValue !== undefined && attributeValue !== null) {
          const valueString = formatFilterValue(attributeValue)
          if (countMap.has(valueString)) {
            countMap.set(valueString, countMap.get(valueString)! + 1)
          }
        }
      }
    } else {
      // For products without variants, check product-level attributes
      if (!itemPassesOtherFilters(product.price, product.filterAttributes)) {
        continue
      }

      // Get this product's value for filterKey and increment count
      const attributeValue = product.filterAttributes?.[filterKey]
      if (attributeValue !== undefined && attributeValue !== null) {
        const valueString = formatFilterValue(attributeValue)
        if (countMap.has(valueString)) {
          countMap.set(valueString, countMap.get(valueString)! + 1)
        }
      }
    }
  }

  // Map options to include counts
  return options.map(option => ({
    ...option,
    count: countMap.get(option.value) ?? 0
  }))
}

/**
 * Filter product variants based on selected filters
 * Returns only the variants that match the filters (including price and range filters)
 */
export function filterProductVariants(
    product: Product,
    filters: SelectedFilters
): ProductVariant[] {
  if (!product.variants) return []

  const activeFilterKeys = getActiveFilterKeys(filters)
  const activeRangeFilters = getActiveRangeFilters(filters)

  // Check if price filter is active
  const hasPriceFilter =
      (filters.priceMin !== undefined && filters.priceMin > 0) ||
      (filters.priceMax !== undefined)

  // If no filters active, return all variants
  if (activeFilterKeys.length === 0 && !hasPriceFilter && activeRangeFilters.length === 0) {
    return product.variants
  }

  return product.variants.filter(variant => {
    // Use effective attributes (variant's own or fallback to product's)
    const effectiveAttributes = getEffectiveAttributes(variant, product)

    // Check price filter first
    if (hasPriceFilter) {
      const variantPrice = parsePrice(variant.price)
      // Exclude variants with null prices when price filter is active
      if (variantPrice === null) {
        return false
      }
      const minPrice = filters.priceMin ?? 0
      const maxPrice = filters.priceMax ?? Infinity
      if (variantPrice < minPrice || variantPrice > maxPrice) {
        return false
      }
    }

    // Check range filters (dimension sliders)
    if (activeRangeFilters.length > 0) {
      for (const rangeFilter of activeRangeFilters) {
        const attributeValue = effectiveAttributes?.[rangeFilter.key]
        if (!isValueInRange(attributeValue, rangeFilter.min, rangeFilter.max)) {
          return false
        }
      }
    }

    // If no attribute filters, variant passes (price and range already checked)
    if (activeFilterKeys.length === 0) {
      return true
    }

    // Check attribute filters
    return matchesFilters(effectiveAttributes, filters, activeFilterKeys)
  })
}

/**
 * Interface for dynamic range bounds (used to detect if user changed from defaults)
 */
export interface DynamicRangeBounds {
  priceMin?: number
  priceMax?: number
  lengthMin?: number
  lengthMax?: number
  widthMin?: number
  widthMax?: number
  heightMin?: number
  heightMax?: number
  depthMin?: number
  depthMax?: number
}

/**
 * Check if price filter is active (user changed from dynamic bounds)
 * @param filters - The selected filters
 * @param dynamicBounds - Optional dynamic bounds to compare against
 */
export function isPriceFilterActive(
    filters: SelectedFilters,
    dynamicBounds?: DynamicRangeBounds
): boolean {
  const dynamicPriceMin = dynamicBounds?.priceMin ?? 0
  const dynamicPriceMax = dynamicBounds?.priceMax
  return (filters.priceMin !== undefined && filters.priceMin > dynamicPriceMin) ||
         (filters.priceMax !== undefined && (dynamicPriceMax === undefined || filters.priceMax < dynamicPriceMax))
}

/**
 * Check if a specific dimension range filter is active (user changed from dynamic bounds)
 * @param filters - The selected filters
 * @param rangeKey - The range filter key (length, width, height, depth)
 * @param dynamicBounds - Optional dynamic bounds to compare against
 */
export function isRangeFilterActive(
    filters: SelectedFilters,
    rangeKey: string,
    dynamicBounds?: DynamicRangeBounds
): boolean {
  const minKey = `${rangeKey}Min` as keyof SelectedFilters
  const maxKey = `${rangeKey}Max` as keyof SelectedFilters
  const dynamicMinKey = `${rangeKey}Min` as keyof DynamicRangeBounds
  const dynamicMaxKey = `${rangeKey}Max` as keyof DynamicRangeBounds

  const filterMin = filters[minKey] as number | undefined
  const filterMax = filters[maxKey] as number | undefined
  const dynamicMin = dynamicBounds?.[dynamicMinKey] ?? 0
  const dynamicMax = dynamicBounds?.[dynamicMaxKey]

  return (filterMin !== undefined && filterMin > dynamicMin) ||
         (filterMax !== undefined && (dynamicMax === undefined || filterMax < dynamicMax))
}

/**
 * Get array of active dimension range filter keys
 * @param filters - The selected filters
 * @param dynamicBounds - Optional dynamic bounds to compare against
 */
export function getActiveRangeFilterKeys(
    filters: SelectedFilters,
    dynamicBounds?: DynamicRangeBounds
): string[] {
  const activeKeys: string[] = []
  for (const rangeKey of RANGE_FILTERS) {
    if (isRangeFilterActive(filters, rangeKey, dynamicBounds)) {
      activeKeys.push(rangeKey)
    }
  }
  return activeKeys
}

/**
 * Check if any filters are currently active
 * @param filters - The selected filters
 * @param dynamicBounds - Optional dynamic bounds to compare against (based on products)
 */
export function hasActiveFilters(
    filters: SelectedFilters,
    dynamicBounds?: DynamicRangeBounds
): boolean {
  const activeFilterKeys = getActiveFilterKeys(filters)
  const hasPriceFilter = isPriceFilterActive(filters, dynamicBounds)
  const hasRangeFilter = getActiveRangeFilterKeys(filters, dynamicBounds).length > 0

  return activeFilterKeys.length > 0 || hasPriceFilter || hasRangeFilter
}

/**
 * Get the total count of active filters
 * @param filters - The selected filters
 * @param dynamicBounds - Optional dynamic bounds to compare against (based on products)
 */
export function getActiveFilterCount(
    filters: SelectedFilters,
    dynamicBounds?: DynamicRangeBounds
): number {
  const activeFilterKeys = getActiveFilterKeys(filters)
  let count = 0

  // Count checkbox filter values
  for (const key of activeFilterKeys) {
    const filterValue = filters[key as keyof SelectedFilters]
    if (Array.isArray(filterValue)) {
      count += filterValue.length
    }
  }

  // Count price filter as 1 if active
  if (isPriceFilterActive(filters, dynamicBounds)) {
    count += 1
  }

  // Count each active dimension range filter as 1
  count += getActiveRangeFilterKeys(filters, dynamicBounds).length

  return count
}

/**
 * Clear all filters - returns empty filter state
 */
export function clearAllFilters(): SelectedFilters {
  return createEmptyFilters()
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