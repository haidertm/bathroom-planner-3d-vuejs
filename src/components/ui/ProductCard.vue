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

      <!-- More Info Link -->
      <a
        :href="product.link"
        class="product-card__more-info"
        target="_blank"
        rel="noopener noreferrer"
      >
        More info
      </a>

      <!-- Action Button -->
      <button
        @click="$emit('select', product)"
        class="product-card__button"
        :class="{ 'product-card__button--direct-add': showDirectAdd }"
      >
        {{ buttonText }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isMobile as isMobileUtil } from '../../utils/helpers.js'

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

defineEmits(['select'])

const isMobile = computed(() => isMobileUtil())

const showDirectAdd = computed(() => props.product.searchContext?.showDirectAdd)

const buttonText = computed(() => {
  if (props.product.searchContext?.showDirectAdd) {
    return 'Add to Room'
  }
  return 'SELECT'
})

const getLowestVariantPrice = (product) => {
  if (!product.variants || product.variants.length === 0) {
    return product.price
  }

  const prices = product.variants
    .map(variant => parseFloat(variant.price))
    .filter(price => !isNaN(price))

  if (prices.length === 0) {
    return product.price
  }

  return Math.min(...prices)
}

const hasMultiplePrices = computed(() => {
  if (!props.product.variants || props.product.variants.length <= 1) {
    return false
  }

  const prices = props.product.variants
    .map(variant => parseFloat(variant.price))
    .filter(price => !isNaN(price))

  const uniquePrices = [...new Set(prices)]
  return uniquePrices.length > 1
})

const formattedPrice = computed(() => {
  const lowestPrice = getLowestVariantPrice(props.product)
  const price = typeof lowestPrice === 'number' ? lowestPrice : parseFloat(lowestPrice) || 0
  return `£${price.toFixed(2)}`
})

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
          return `<span class="highlight">${match}</span>`
        })
      } else {
        // Try exact phrase first
        const exactPhrase = query
        const exactRegex = new RegExp(`(${exactPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')

        if (rawName.toLowerCase().includes(exactPhrase.toLowerCase())) {
          result = result.replace(exactRegex, (match) => {
            return `<span class="highlight">${match}</span>`
          })
        } else {
          // Highlight individual terms (only terms with 2+ characters to avoid random single char matches)
          for (const term of searchTerms) {
            if (term.length < 2) continue // Skip single character terms
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(`(${escapedTerm})`, 'gi')
            result = result.replace(regex, (match) => {
              return `<span class="highlight">${match}</span>`
            })
          }
        }
      }

      return result
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
