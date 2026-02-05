<template>
  <div :style="cardStyle" class="product-card">
    <!-- Product Image -->
    <div :style="imageContainerStyle">
      <img :src="product.image" :alt="product.name" :style="imageStyle" />
    </div>

    <!-- Product Info -->
    <div :style="infoStyle">
      <h3 :style="nameStyle" v-html="highlightedName"></h3>

      <div v-if="product.searchContext" :style="searchContextStyle">
        <div v-if="product.searchContext.matchingVariant" :style="searchVariantStyle">
          SKU: {{ product.searchContext.matchingVariant.sku }}
        </div>
      </div>

      <div :style="priceStyle">
        <span v-if="hasMultiplePrices" style="font-size: 18px; font-weight: normal; color: #666; margin-right: 4px;">From</span>
        £{{ lowestPrice }}
      </div>

      <!-- More Info Link -->
      <a :href="product.link" :style="moreInfoStyle" class="more-info-link" target="_blank" rel="noopener noreferrer">
        More info ↗
      </a>

      <!-- Action Button -->
      <button
        @click="onSelectProduct"
        :style="buttonStyle"
        class="select-button"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGtm } from '@gtm-support/vue-gtm'
import { isMobile } from '../../utils/helpers.js'

const gtm = useGtm()

const props = defineProps({
  product: {
    type: Object,
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

const emit = defineEmits(['select'])

const onSelectProduct = () => {
  if (gtm?.enabled()) {
    // Get SKU from first variant if available
    const sku = props.product.variants?.[0]?.sku || props.product.sku || null

    gtm.trackEvent({
      event: 'product_select',
      category: 'Product',
      action: 'Select',
      label: props.product.name,
      product_id: props.product.id,
      product_name: props.product.name,
      product_sku: sku,
      product_category: props.product.category || null,
      is_search_mode: props.isSearchMode,
      is_direct_add: props.product.searchContext?.showDirectAdd || false
    })
  }
  emit('select', props.product)
}

const isMobileDevice = computed(() => isMobile())

// Helper: Normalize price string
const normalizePrice = (price) => {
  if (typeof price === 'number') return price
  if (typeof price === 'string') {
    const normalized = price.trim().replace(/[^0-9.\-]/g, '')
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }
  return 0
}

// Get the lowest price from all variants
const lowestPrice = computed(() => {
  if (!props.product.variants || props.product.variants.length === 0) {
    return normalizePrice(props.product.price).toFixed(2)
  }

  const prices = props.product.variants
    .map(variant => normalizePrice(variant.price))
    .filter(price => price > 0)

  if (prices.length === 0) {
    return normalizePrice(props.product.price).toFixed(2)
  }

  return Math.min(...prices).toFixed(2)
})

// Check if product has multiple different prices
const hasMultiplePrices = computed(() => {
  if (!props.product.variants || props.product.variants.length <= 1) {
    return false
  }

  const prices = props.product.variants
    .map(variant => normalizePrice(variant.price))
    .filter(price => price > 0)

  const uniquePrices = [...new Set(prices)]
  return uniquePrices.length > 1
})

// Highlighted name for search results
const highlightedName = computed(() => {
  const escapeHtml = (s = '') =>
    String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

  if (props.isSearchMode && props.searchQuery) {
    let searchQuery = props.searchQuery
    if (searchQuery && typeof searchQuery === 'object' && 'value' in searchQuery) {
      searchQuery = searchQuery.value
    }

    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      const rawName = props.product.name || ''
      let result = escapeHtml(rawName)

      const searchTerms = query.split(/\s+/).filter(term => term.length > 0)

      if (searchTerms.length === 1) {
        const term = searchTerms[0]
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escapedTerm})`, 'gi')
        result = result.replace(regex, (match) => {
          return `<span style="color: #EC048C; font-weight: 600;">${match}</span>`
        })
      } else {
        const exactPhrase = query
        const exactRegex = new RegExp(`(${exactPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')

        if (rawName.toLowerCase().includes(exactPhrase.toLowerCase())) {
          result = result.replace(exactRegex, (match) => {
            return `<span style="color: #EC048C; font-weight: 600;">${match}</span>`
          })
        } else {
          const firstWord = searchTerms[0]
          const lastWord = searchTerms[searchTerms.length - 1]
          const flexiblePattern = `(${firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s+\\w+){0,2}\\s+${lastWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
          const flexibleRegex = new RegExp(flexiblePattern, 'gi')

          const flexibleMatch = rawName.match(flexibleRegex)
          if (flexibleMatch) {
            result = result.replace(flexibleRegex, (match) => {
              return `<span style="color: #EC048C; font-weight: 600;">${match}</span>`
            })
          }
        }
      }

      return result
    }
  }

  return escapeHtml(props.product.name || '')
})

const buttonText = computed(() => {
  if (props.product.searchContext?.showDirectAdd) {
    return 'Add to Room'
  }
  return 'SELECT'
})

// Styles
const cardStyle = computed(() => ({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  gap: '15px',
  position: 'relative',
  transition: 'box-shadow 0.2s ease',
  flexDirection: isMobileDevice.value ? 'column' : 'row'
}))

const imageContainerStyle = computed(() => ({
  width: isMobileDevice.value ? '100%' : '200px',
  height: isMobileDevice.value ? '150px' : '150px',
  flexShrink: 0,
  borderRadius: '4px',
  overflow: 'hidden',
  backgroundColor: '#f8f8f8'
}))

const imageStyle = computed(() => ({
  width: '100%',
  height: '100%',
  objectFit: 'cover'
}))

const infoStyle = computed(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
}))

const nameStyle = computed(() => ({
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0',
  lineHeight: '1.4',
  fontFamily: 'Arial, sans-serif'
}))

const priceStyle = computed(() => ({
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#e74c3c',
  fontFamily: 'Arial, sans-serif'
}))

const moreInfoStyle = computed(() => ({
  fontSize: '14px',
  color: '#007bff',
  textDecoration: 'none',
  fontWeight: '500',
  alignSelf: 'flex-start',
  fontFamily: 'Arial, sans-serif'
}))

const buttonStyle = computed(() => {
  const isDirectAdd = props.product.searchContext?.showDirectAdd

  return {
    backgroundColor: '#29275B',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: '10px',
    alignSelf: 'flex-start',
    fontFamily: 'Arial, sans-serif'
  }
})

const searchContextStyle = computed(() => ({
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  marginTop: '8px',
  flexWrap: 'wrap'
}))

const searchVariantStyle = computed(() => ({
  backgroundColor: '#f0f0f0',
  color: '#666',
  padding: '4px 8px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: '500'
}))
</script>

<style scoped>
.product-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

.select-button:hover {
  background-color: #1e1a4a !important;
}

.more-info-link:hover {
  text-decoration: underline !important;
}
</style>
