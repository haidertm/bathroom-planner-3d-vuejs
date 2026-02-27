<template>
  <div class="product-card" :class="{ 'product-card--mobile': isMobile }">
    <!-- Product Image -->
    <div class="product-card__image">
      <img :src="product.image" :alt="product.name" loading="lazy" />
    </div>

    <!-- Product Info -->
    <div class="product-card__info">
      <h3 class="product-card__name" v-html="highlightedName"></h3>

      <div v-if="product.searchContext" class="product-card__search-context">
        <div v-if="product.searchContext.matchingVariant" class="product-card__sku">
          SKU: {{ product.searchContext.matchingVariant.sku }}
        </div>
      </div>

      <div class="product-card__price">
        <span v-if="hasMultiplePrices" class="product-card__price-from">From</span>
        {{ formattedPrice }}
      </div>

      <!-- More Info Link (only render when link is available and safe) -->
      <a
        v-if="sanitizedLink"
        :href="sanitizedLink"
        class="product-card__more-info"
        target="_blank"
        rel="noopener noreferrer"
      >
        More info
      </a>

      <!-- Action Button -->
      <button
        type="button"
        `@click`="$emit('select', product)"
        class="product-card__button"
        :class="{ 'product-card__button--direct-add': showDirectAdd }"
      >
        :class="{ 'product-card__button--direct-add': showDirectAdd }"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { isMobile as isMobileUtil } from '../../utils/helpers'

// Type definitions for ProductCard
interface ProductVariant {
  id?: string
  name?: string
  sku?: string
  price?: number | string
  image?: string
  title?: string
  dimensions?: {
    width: number
    height: number
    depth: number
  }
}

interface SearchContext {
  matchingVariant?: ProductVariant
  highlightedVariant?: ProductVariant
  showDirectAdd?: boolean
  category?: string
  originalProduct?: Product
}

interface Product {
  id: string
  name: string
  image: string
  price?: number | string
  link?: string
  category?: string
  variants?: ProductVariant[]
  colors?: Array<{ id: string | number; name: string; color: string }>
  hardware?: Array<{ id: string; name: string; price: string }>
  searchContext?: SearchContext
}

const props = defineProps({
  product: {
    type: Object as PropType<Product>,
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  },
  isSearchMode: {
    type: Boolean,
    default: false
  }
})

defineEmits<{
  (e: 'select', product: Product): void
}>()

const isMobile = computed<boolean>(() => isMobileUtil())

/**
 * Validates that a URL uses a safe scheme (https, http, mailto) or is a safe relative path.
 * Prevents javascript:, data:, vbscript: and other potentially dangerous URL schemes.
 */
const isSafeUrl = (url: string | undefined): boolean => {
  if (!url) return false

  const trimmedUrl = url.trim()
  if (!trimmedUrl) return false

  // Allow safe relative paths (starting with /)
  if (trimmedUrl.startsWith('/')) return true

  // Parse URL to check scheme
  try {
    const parsed = new URL(trimmedUrl, window.location.origin)
    const safeSchemes = ['https:', 'http:', 'mailto:']
    return safeSchemes.includes(parsed.protocol.toLowerCase())
  } catch {
    // If URL parsing fails, reject it
    return false
  }
}

/**
 * Returns the product link only if it passes URL safety validation.
 * Returns null for unsafe URLs to prevent rendering the anchor.
 */
const sanitizedLink = computed<string | null>(() => {
  const link = props.product.link
  return isSafeUrl(link) ? link! : null
})

const showDirectAdd = computed<boolean | undefined>(() => props.product.searchContext?.showDirectAdd)

const buttonText = computed<string>(() => {
  if (props.product.searchContext?.showDirectAdd) {
    return 'Add to Room'
  }
  return 'SELECT'
})

const getLowestVariantPrice = (product: Product): number | string => {
  if (!product.variants || product.variants.length === 0) {
    return product.price ?? 0
  }

  // Parse prices and filter out NaN, zero, and negative values
  const prices = product.variants
    .map(variant => parseFloat(String(variant.price)))
    .filter(price => !isNaN(price) && price > 0)

  if (prices.length === 0) {
    return product.price ?? 0
  }

  return Math.min(...prices)
}

const hasMultiplePrices = computed<boolean>(() => {
  if (!props.product.variants || props.product.variants.length <= 1) {
    return false
  }

  // Filter out undefined/null, NaN, zero and negative values (mirrors getLowestVariantPrice)
  const prices = props.product.variants
    .map(variant => parseFloat(String(variant.price)))
    .filter(price => !isNaN(price) && price > 0)

  const uniquePrices = [...new Set(prices)]
  return uniquePrices.length > 1
})

const formattedPrice = computed<string>(() => {
  const lowestPrice = getLowestVariantPrice(props.product)
  const price = typeof lowestPrice === 'number' ? lowestPrice : parseFloat(String(lowestPrice)) || 0
  return `£${price.toFixed(2)}`
})

const highlightedName = computed<string>(() => {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  const escapeHtml = (s: string = ''): string =>
    String(s).replace(/[&<>"']/g, c => htmlEscapeMap[c] || c)

  // Collect all match ranges from raw text using a regex
  const findMatchRanges = (text: string, regex: RegExp): Array<{ start: number; end: number }> => {
    const ranges: Array<{ start: number; end: number }> = []
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length })
    }
    return ranges
  }

  // Merge overlapping ranges and sort by start position
  const mergeRanges = (ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> => {
    if (ranges.length === 0) return []
    const sorted = [...ranges].sort((a, b) => a.start - b.start)
    const merged: Array<{ start: number; end: number }> = [sorted[0]]
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1]
      const current = sorted[i]
      if (current.start <= last.end) {
        last.end = Math.max(last.end, current.end)
      } else {
        merged.push(current)
      }
    }
    return merged
  }

  // Build HTML from raw text and match ranges
  const buildHighlightedHtml = (rawText: string, ranges: Array<{ start: number; end: number }>): string => {
    if (ranges.length === 0) return escapeHtml(rawText)

    let result = ''
    let lastEnd = 0
    for (const range of ranges) {
      // Add escaped non-matching segment before this match
      if (range.start > lastEnd) {
        result += escapeHtml(rawText.slice(lastEnd, range.start))
      }
      // Add highlighted match (escape the matched text too)
      result += `<span class="highlight">${escapeHtml(rawText.slice(range.start, range.end))}</span>`
      lastEnd = range.end
    }
    // Add remaining text after last match
    if (lastEnd < rawText.length) {
      result += escapeHtml(rawText.slice(lastEnd))
    }
    return result
  }

  if (props.isSearchMode && props.searchQuery) {
    const searchQuery = props.searchQuery.trim()

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const rawName = props.product.name || ''
      const searchTerms = query.split(/\s+/).filter(term => term.length > 0)

      let matchRanges: Array<{ start: number; end: number }> = []

      if (searchTerms.length === 1) {
        // Single term matching
        const term = searchTerms[0]
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedTerm, 'gi')
        matchRanges = findMatchRanges(rawName, regex)
      } else {
        // Try exact phrase first
        const exactPhrase = query
        if (rawName.toLowerCase().includes(exactPhrase)) {
          const escapedPhrase = exactPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const regex = new RegExp(escapedPhrase, 'gi')
          matchRanges = findMatchRanges(rawName, regex)
        } else {
          // Highlight individual terms (only terms with 2+ characters to avoid random single char matches)
          for (const term of searchTerms) {
            if (term.length < 2) continue // Skip single character terms
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(escapedTerm, 'gi')
            const termRanges = findMatchRanges(rawName, regex)
            matchRanges.push(...termRanges)
          }
          // Merge overlapping ranges from multiple terms
          matchRanges = mergeRanges(matchRanges)
        }
      }

      return buildHighlightedHtml(rawName, matchRanges)
    }
  }

  return escapeHtml(props.product.name || '')
})
</script>

<style scoped>
.product-card {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 15px;
  position: relative;
  transition: box-shadow 0.2s ease;
}

.product-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.product-card--mobile {
  flex-direction: column;
}

.product-card__image {
  width: 200px;
  height: 150px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f8f8f8;
}

.product-card--mobile .product-card__image {
  width: 100%;
  height: 150px;
}

.product-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.product-card__name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0;
  line-height: 1.4;
  font-family: Arial, sans-serif;
}

.product-card__search-context {
  font-size: 13px;
  color: #666;
}

.product-card__sku {
  background-color: #f3f4f6;
  color: #6b7280;
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-block;
  font-size: 12px;
}

.product-card__price {
  font-size: 16px;
  font-weight: bold;
  color: #e74c3c;
  font-family: Arial, sans-serif;
}

.product-card__price-from {
  font-size: 14px;
  font-weight: normal;
  color: #666;
  margin-right: 4px;
}

.product-card__more-info {
  font-size: 14px;
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
  align-self: flex-start;
  font-family: Arial, sans-serif;
  transition: color 0.2s ease;
}

.product-card__more-info::after {
  content: ' \2197';
}

.product-card__more-info:hover {
  color: #0056b3;
  text-decoration: underline;
}

.product-card__button {
  padding: 12px 24px;
  background-color: #29275B;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s ease;
  font-family: Arial, sans-serif;
  margin-top: 10px;
  align-self: flex-start;
}

.product-card__button:hover {
  background-color: #1e1a4a;
}

.product-card__button--direct-add {
  background-color: #29275B;
}

:deep(.highlight) {
  color: #EC048C;
  font-weight: 600;
}
</style>
