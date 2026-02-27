<template>
  <div class="product-summary" :class="{ 'product-summary--mobile': isMobile }">
    <!-- Product Image -->
    <div class="product-summary__image">
      <img :src="image" :alt="name" loading="lazy" />
    </div>

    <!-- Product Info -->
    <div class="product-summary__info">
      <h3 class="product-summary__name">{{ name }}</h3>
      <div class="product-summary__sku">
        <span class="product-summary__sku-label">SKU:</span> {{ sku }}
      </div>
      <div class="product-summary__price">{{ formattedPrice }}</div>
      <a
        :href="link"
        class="product-summary__more-info"
        target="_blank"
        rel="noopener noreferrer"
        @click="trackMoreInfoClick"
      >
        More info
      </a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGtm } from '@gtm-support/vue-gtm'
import { isMobile as isMobileUtil } from '../../utils/helpers.js'

const gtm = useGtm()

const props = defineProps({
  image: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    default: ''
  },
  price: {
    type: [Number, String],
    required: true
  },
  link: {
    type: String,
    default: '#'
  }
})

const isMobile = computed(() => isMobileUtil())

const formattedPrice = computed(() => {
  const price = typeof props.price === 'string' ? parseFloat(props.price) : props.price
  return `£${price.toFixed(2)}`
})

const trackMoreInfoClick = () => {
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'navigation_click',
      category: 'Product',
      action: 'more_info_click',
      label: props.link
    })
  }
}
</script>

<style scoped>
.product-summary {
  display: flex;
  gap: 15px;
  padding: 15px;
  background-color: #ffffff;
  border-radius: 8px;
  border: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.product-summary--mobile {
  flex-direction: column;
}

.product-summary__image {
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  background-color: #f8f8f8;
}

.product-summary--mobile .product-summary__image {
  width: 100%;
  height: 180px;
}

.product-summary__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-summary__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-summary__name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0;
  line-height: 1.3;
  font-family: Arial, sans-serif;
}

.product-summary__sku {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-family: Arial, sans-serif;
}

.product-summary__sku-label {
  font-weight: bold;
}

.product-summary__price {
  font-size: 18px;
  font-weight: bold;
  color: #e74c3c;
  font-family: Arial, sans-serif;
}

.product-summary__more-info {
  font-size: 14px;
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
  font-family: Arial, sans-serif;
  transition: color 0.2s ease;
}

.product-summary__more-info::after {
  content: ' \2197';
}

.product-summary__more-info:hover {
  color: #0056b3;
  text-decoration: underline;
}
</style>
