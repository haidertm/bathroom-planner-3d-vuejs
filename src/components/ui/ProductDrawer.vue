<!-- UnifiedProductDrawer.vue -->
<template>
  <div>
    <!-- Product Drawer Overlay -->
    <div
        v-if="isOpen"
        :style="overlayStyle"
        @click="closeDrawer"
    ></div>

    <!-- Product Drawer -->
    <div :style="drawerStyle">
      <!-- Header -->
      <div :style="headerStyle">
        <button
            v-if="currentView === 'variants'"
            @click="goBackToProductList"
            :style="backButtonStyle"
            class="back-button"
        >
          ← Back to Products
        </button>
        <button
            v-else
            @click="closeDrawer"
            :style="backButtonStyle"
            class="back-button"
        >
          ← Go back
        </button>

        <h2 :style="titleStyle">
          {{ currentView === 'variants' ? 'Select Options' : selectedCategory }}
        </h2>

        <button
            @click="closeDrawer"
            :style="closeButtonStyle"
            class="close-button"
        >
          ✕
        </button>
      </div>

      <!-- PRODUCT LIST VIEW -->
      <div v-if="currentView === 'products'" :style="contentStyle">
        <div
            v-for="product in getProductsForCategory(selectedCategory)"
            :key="product.id"
            :style="productCardStyle"
            class="product-card"
        >
          <!-- Product Image -->
          <div :style="productImageStyle">
            <img :src="product.image" :alt="product.name" :style="imageStyle" />
          </div>

          <!-- Product Info -->
          <div :style="productInfoStyle">
            <div :style="brandStyle">{{ product.brand }}</div>
            <h3 :style="productNameStyle">{{ product.name }}</h3>
            <div :style="priceStyle">£{{ product.price }}</div>

            <!-- More Info Link -->
            <a href="#" :style="moreInfoStyle" class="more-info-link">
              More info ↗
            </a>

            <!-- Add to Room Button -->
            <button
                @click="selectProduct(product)"
                :style="addToRoomButtonStyle"
                class="add-to-room-button"
            >
              Add to Room
            </button>
          </div>
        </div>
      </div>

      <!-- VARIANTS VIEW -->
      <div v-if="currentView === 'variants' && selectedProduct" :style="contentStyle">
        <!-- Product Summary -->
        <div :style="productSummaryStyle">
          <div :style="productImageStyle">
            <img :src="selectedProduct.image" :alt="selectedProduct.name" :style="imageStyle" />
          </div>
          <div :style="productInfoStyle">
            <div :style="brandStyle">{{ selectedProduct.brand }}</div>
            <h3 :style="productNameStyle">{{ selectedProduct.name }}</h3>
            <div :style="priceStyle">£{{ selectedProduct.price }}</div>
          </div>
        </div>

        <!-- Variants Selection (if product has variants) -->
        <div v-if="selectedProduct.variants && selectedProduct.variants.length > 0" :style="sectionStyle">
          <h4 :style="sectionTitleStyle">{{ selectedProduct.variantType || 'Size' }}</h4>
          <div :style="variantOptionsStyle">
            <button
                v-for="variant in selectedProduct.variants"
                :key="variant.id"
                @click="selectVariant(variant.id)"
                :style="getVariantButtonStyle(variant.id)"
                class="variant-button"
            >
              {{ variant.name }}
            </button>
          </div>
        </div>

        <!-- Color Selection (if product has colors) -->
        <div v-if="selectedProduct.colors && selectedProduct.colors.length > 0" :style="sectionStyle">
          <h4 :style="sectionTitleStyle">Color: {{ getSelectedColorName() }}</h4>
          <div :style="colorOptionsStyle">
            <div
                v-for="color in selectedProduct.colors"
                :key="color.id"
                @click="selectColor(color.id)"
                :style="getColorSwatchStyle(color)"
                class="color-swatch"
                :title="color.name"
            >
              <div :style="colorInnerStyle(color)"></div>
              <span :style="colorNameStyle">{{ color.name }}</span>
            </div>
          </div>
        </div>

        <!-- Hardware Section (if product has hardware) -->
        <div v-if="selectedProduct.hardware && selectedProduct.hardware.length > 0" :style="sectionStyle">
          <h4 :style="sectionTitleStyle">Included Hardware</h4>
          <div
              v-for="hardware in selectedProduct.hardware"
              :key="hardware.id"
              :style="hardwareItemStyle"
          >
            <div :style="hardwareIconStyle">🔧</div>
            <div :style="hardwareInfoStyle">
              <h5 :style="hardwareNameStyle">{{ hardware.name }}</h5>
              <div :style="hardwareBrandStyle">{{ hardware.brand }}</div>
              <div :style="hardwarePriceStyle">£{{ hardware.price }}</div>
              <button
                  @click="toggleHardwareChange(hardware.id)"
                  :style="hardwareChangeButtonStyle"
                  class="hardware-change-button"
              >
                🔄 Change
              </button>
            </div>
          </div>
        </div>

        <!-- Total Price Summary -->
        <div :style="priceSummaryStyle">
          <div :style="totalPriceLabelStyle">Total Price:</div>
          <div :style="totalPriceStyle">£{{ calculateTotalPrice() }}</div>
        </div>

        <!-- Action Buttons -->
        <div :style="actionButtonsStyle">
          <button
              @click="goBackToProductList"
              :style="backToCatalogueButtonStyle"
              class="back-to-catalogue-button"
          >
            BACK TO CATALOGUE
          </button>

          <button
              @click="confirmAddToRoom"
              :style="confirmAddButtonStyle"
              class="confirm-add-button"
          >
            ADD TO ROOM
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { isMobile } from '../../utils/helpers.js'

// Props
const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  selectedCategory: {
    type: String,
    default: ''
  }
})

// Emits - ADD 'back' event for better control
const emit = defineEmits(['close', 'add-to-room', 'back'])

// Reactive state
const currentView = ref('products') // 'products' or 'variants'
const selectedProduct = ref(null)
const selectedVariant = ref('')
const selectedColor = ref('')

// Reset view when drawer opens/closes
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    currentView.value = 'products'
    selectedProduct.value = null
  }
})

// Initialize selections when product changes
watch(() => selectedProduct.value, (newProduct) => {
  if (newProduct) {
    selectedVariant.value = newProduct.variants?.[0]?.id || ''
    selectedColor.value = newProduct.colors?.[0]?.id || ''
  }
})

// Sample product data
const productData = {
  Furniture: [
    // Furniture Variant 1 (2 variants)
    {
      id: 'furniture_variant_1',
      brand: 'Corsica',
      name: 'Corsica Gloss White Basin Drawer Vanity 600mm',
      price: '299.95',
      image: 'assets/productImages/furniture/C76237-1000-White-Basin-Drawer-Vanity-600mm_1.webp',
      variants: [
        {
          id: 'c76236',
          name: 'Wall Hung Slimline Basin Drawer Vanity 600mm',
          sku: 'C76236',
          price: '299.95',
          title: 'Corsica Gloss White Wall Hung Slimline Basin Drawer Vanity 600mm'
        },
        {
          id: 'c76237',
          name: 'Slimline Basin Drawer Vanity 600mm',
          sku: 'C76237',
          price: '279.95',
          title: 'Corsica Gloss White Slimline Basin Drawer Vanity 600mm'
        }
      ],
      variantType: 'Style Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    },

    // Furniture Variant 2 (4 variants)
    {
      id: 'furniture_variant_2',
      brand: 'Bali',
      name: 'Bali Gloss White Wall Hung Basin Drawer Vanity',
      price: '319.95',
      image: 'assets/productImages/furniture/C77608-1000-Bali-Gloss-White-Wall-Hung-Basin-Drawer_1.webp',
      variants: [
        {
          id: 'c77605',
          name: '600mm Width',
          sku: 'C77605',
          price: '319.95',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 600mm'
        },
        {
          id: 'c77606',
          name: '800mm Width',
          sku: 'C77606',
          price: '359.95',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 800mm'
        },
        {
          id: 'c77607',
          name: '900mm Width',
          sku: 'C77607',
          price: '399.95',
          title: 'Bali Gloss White Basin Drawer Vanity 900mm'
        },
        {
          id: 'c77608',
          name: '1000mm Width',
          sku: 'C77608',
          price: '439.95',
          title: 'Bali Gloss White Wall Hung Basin Drawer Vanity 1000mm'
        }
      ],
      variantType: 'Width Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' },
        { id: 'c2', name: 'Matt Grey', color: '#6b7280' }
      ],
      features: ['Multiple Sizes', 'Soft Close Drawers', 'Wall Mounted', 'Ceramic Basin']
    }
  ],

  Mirror: [
    // Mirror Variant 1 (3 variants)
    {
      id: 'mirror_variant_1',
      brand: 'Haisley',
      name: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker',
      price: '449.95',
      image: 'assets/productImages/mirror/73104v2-1000-illuminated-led-mirror-cabinet-with-bluetooth_2.webp',
      variants: [
        {
          id: '73189v2',
          name: '650x1200mm',
          sku: '73189V2',
          price: '449.95',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 650x1200mm'
        },
        {
          id: '73104v2',
          name: '600x600mm',
          sku: '73104V2',
          price: '329.95',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 600x600mm'
        },
        {
          id: '73103v2',
          name: '600x450mm',
          sku: '73103V2',
          price: '299.95',
          title: 'Haisley Illuminated LED Mirror Cabinet With BLUETOOTH Speaker 600x450mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Silver Frame', color: '#c0c0c0' }
      ],
      features: ['LED Lighting', 'Bluetooth Speaker', 'Touch Controls', 'Mirror Cabinet']
    },

    // Mirror Variant 2 (4 variants)
    {
      id: 'mirror_variant_2',
      brand: 'Evelyn',
      name: 'Evelyn Illuminated LED Mirror',
      price: '199.95',
      image: 'assets/productImages/mirror/73153v2-1000-evelyn-illuminated-led-mirror-600x400mm_1.webp',
      variants: [
        {
          id: '73035v2',
          name: '500x1200mm',
          sku: '73035V2',
          price: '199.95',
          title: 'Evelyn Large Illuminated LED Mirror 500x1200mm'
        },
        {
          id: '73154v2',
          name: '500x1000mm',
          sku: '73154V2',
          price: '179.95',
          title: 'Evelyn Illuminated LED Mirror 500x1000mm'
        },
        {
          id: '73153v2',
          name: '600x400mm',
          sku: '73153V2',
          price: '149.95',
          title: 'Evelyn Illuminated LED Mirror 600x400mm'
        },
        {
          id: '73033v2',
          name: '700x500mm',
          sku: '73033V2',
          price: '169.95',
          title: 'Evelyn Illuminated LED Mirror 700x500mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Clear', color: '#f0f0f0' }
      ],
      features: ['LED Lighting', 'Touch Controls', 'Energy Efficient']
    }
  ],

  Radiator: [
    // Radiator Variant 1 (3 variants)
    {
      id: 'radiator_variant_1',
      brand: 'Faro',
      name: 'Faro Anthracite Double Flat Panel Vertical Radiator',
      price: '289.95',
      image: 'assets/productImages/radiator/31019-1000-Anthracite-Double-Flat-Panel-Vertical-Radiator-1600x350mm_1.webp',
      variants: [
        {
          id: '31022',
          name: '1600x560mm',
          sku: '31022',
          price: '289.95',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1600x560mm'
        },
        {
          id: '31063',
          name: '1800x560mm',
          sku: '31063',
          price: '319.95',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1800x560mm'
        },
        {
          id: '31019',
          name: '1600x350mm',
          sku: '31019',
          price: '259.95',
          title: 'Faro Anthracite Double Flat Panel Vertical Radiator 1600x350mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Anthracite', color: '#404040' },
        { id: 'c2', name: 'White', color: '#ffffff' }
      ],
      features: ['Double Panel', 'Vertical Design', 'High Heat Output']
    },

    // Radiator Variant 2 (2 variants)
    {
      id: 'radiator_variant_2',
      brand: 'Faro',
      name: 'Faro Matt Black Double Flat Panel Horizontal Radiator',
      price: '259.95',
      image: 'assets/productImages/radiator/32124-1000-Matt-Black-Double-Flat-Panel-Horizontal-Radiator-600x420mm_1.webp',
      variants: [
        {
          id: '32128',
          name: '600x1190mm',
          sku: '32128',
          price: '259.95',
          title: 'Faro Matt Black Double Flat Panel Horizontal Radiator 600x1190mm'
        },
        {
          id: '32124',
          name: '600x420mm',
          sku: '32124',
          price: '199.95',
          title: 'Faro Matt Black Double Flat Panel Horizontal Radiator 600x420mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Matt Black', color: '#000000' },
        { id: 'c2', name: 'White', color: '#ffffff' }
      ],
      features: ['Double Panel', 'Horizontal Design', 'Modern Styling']
    }
  ],

  Shower: [
    // Shower Variant 1 (4 variants)
    {
      id: 'shower_variant_1',
      brand: 'London',
      name: 'London Matt Black 6mm Sliding Shower Enclosure',
      price: '599.95',
      image: 'assets/productImages/shower/c46006-1000-london-matt-black-6mm-sliding-shower-enclosure-1000x760mm.webp',
      variants: [
        {
          id: 'c46247',
          name: '1000x700mm',
          sku: 'C46247',
          price: '599.95',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1000x700mm'
        },
        {
          id: 'c46006',
          name: '1000x760mm',
          sku: 'C46006',
          price: '629.95',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1000x760mm'
        },
        {
          id: 'c46009',
          name: '1200x800mm',
          sku: 'C46009',
          price: '699.95',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1200x800mm'
        },
        {
          id: 'c46175',
          name: '1400x900mm',
          sku: 'C46175',
          price: '799.95',
          title: 'London Matt Black 6mm Sliding Shower Enclosure 1400x900mm'
        }
      ],
      variantType: 'Size Options',
      colors: [
        { id: 'c1', name: 'Matt Black', color: '#000000' },
        { id: 'c2', name: 'Chrome', color: '#c0c0c0' }
      ],
      features: ['6mm Tempered Glass', 'Sliding Door', 'Easy Clean Glass']
    }
  ],

  Bath: [
    // Bath Variant 1 (3 variants)
    {
      id: 'bath_variant_1',
      brand: 'Newham',
      name: 'Newham Freestanding Bath',
      price: '399.95',
      image: 'assets/productImages/bath/C51092-1000-Newham-V2-1500mm-Freestanding-Bath_6.webp',
      variants: [
        {
          id: 'c51096',
          name: '1370mm Length',
          sku: 'C51096',
          price: '399.95',
          title: 'Newham 1370mm Freestanding Bath'
        },
        {
          id: 'c51092',
          name: '1500mm Length',
          sku: 'C51092',
          price: '449.95',
          title: 'Newham 1500mm Freestanding Bath'
        },
        {
          id: 'c51093',
          name: '1700mm Length',
          sku: 'C51093',
          price: '499.95',
          title: 'Newham 1700mm Freestanding Bath'
        }
      ],
      variantType: 'Length Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['Freestanding Design', 'Acrylic Construction', 'Modern Shape']
    },

    // Bath 2 (1 variant)
    {
      id: 'bath_2',
      brand: 'L Shaped',
      name: 'L Shaped 1700 Shower Bath with Front Panel & Bath Screen',
      price: '599.95',
      image: 'assets/productImages/bath/C57499-1000-L-Shaped-Shower-Bath-Front-Panel-Bath-Screen-Right.webp',
      variants: [
        {
          id: 'c57499',
          name: 'Right Handed',
          sku: 'C57499',
          price: '599.95',
          title: 'L Shaped 1700 Shower Bath with Front Panel & 6mm Easy Clean Brushed Brass Bath Screen - Right Handed'
        }
      ],
      variantType: 'Orientation',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['L-Shaped Design', 'Shower Screen Included', 'Front Panel Included']
    }
  ],

  Toilet: [
    // Toilet Variant 1 (2 variants)
    {
      id: 'toilet_variant_1',
      brand: 'Nevada',
      name: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Seat',
      price: '399.95',
      image: 'assets/productImages/toilet/c66174-1000-rimless-wall-hung-toilet-with-soft-close-seat.webp',
      variants: [
        {
          id: 'c66175',
          name: 'Slim Seat',
          sku: 'C66175',
          price: '399.95',
          title: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Slim Seat'
        },
        {
          id: 'c66174',
          name: 'Standard Seat',
          sku: 'C66174',
          price: '379.95',
          title: 'Nevada Rimless Wall Hung Toilet With Premium Soft Close Seat'
        }
      ],
      variantType: 'Seat Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['Rimless Design', 'Soft Close Seat', 'Wall Hung', 'Premium Quality']
    },

    // Toilet Variant 2 (3 variants)
    {
      id: 'toilet_variant_2',
      brand: 'Portland',
      name: 'Portland Close Coupled Toilet With Soft Close Seat',
      price: '299.95',
      image: 'assets/productImages/toilet/C66183-1000-Close-Coupled-Toilet-With-Soft-Close-Slim-Seat.webp',
      variants: [
        {
          id: 'c66183',
          name: 'Slim Seat',
          sku: 'C66183',
          price: '299.95',
          title: 'Portland Close Coupled Toilet With Soft Close Slim Seat'
        },
        {
          id: 'c66185',
          name: 'Comfort Height',
          sku: 'C66185',
          price: '329.95',
          title: 'Portland Comfort Height Close Coupled Toilet With Soft Close Slim Seat'
        },
        {
          id: 'c66184',
          name: 'Back to Wall',
          sku: 'C66184',
          price: '349.95',
          title: 'Portland Fully Back to Wall Close Coupled Toilet With Soft Close Slim Seat'
        }
      ],
      variantType: 'Style Options',
      colors: [
        { id: 'c1', name: 'Gloss White', color: '#ffffff' }
      ],
      features: ['Close Coupled', 'Soft Close Seat', 'Multiple Styles']
    }
  ],
};

// Computed
const isMobileDevice = computed(() => isMobile())

// Methods
const getProductsForCategory = (category) => {
  return productData[category] || []
}

const selectProduct = (product) => {
  selectedProduct.value = product
  currentView.value = 'variants'
}

const goBackToProductList = () => {
  currentView.value = 'products'
  selectedProduct.value = null
}

const selectVariant = (variantId) => {
  selectedVariant.value = variantId
}

const selectColor = (colorId) => {
  selectedColor.value = colorId
}

const getSelectedColorName = () => {
  if (!selectedProduct.value || !selectedProduct.value.colors) return ''
  const color = selectedProduct.value.colors.find(c => c.id === selectedColor.value)
  return color?.name || ''
}

const toggleHardwareChange = (hardwareId) => {
  console.log('Toggle hardware change for:', hardwareId)
}

const calculateTotalPrice = () => {
  if (!selectedProduct.value) return '0.00'

  let total = parseFloat(selectedProduct.value.price)

  if (selectedProduct.value.hardware) {
    selectedProduct.value.hardware.forEach(hw => {
      total += parseFloat(hw.price)
    })
  }

  return total.toFixed(2)
}

const confirmAddToRoom = () => {
  if (!selectedProduct.value) return

  const componentType = selectedProduct.value.id?.includes('sink') ? 'Sink' :
      selectedProduct.value.id?.includes('toilet') ? 'Toilet' :
          selectedProduct.value.id?.includes('bath') ? 'Bath' :
              selectedProduct.value.id?.includes('shower') ? 'Shower' :
                  selectedProduct.value.id?.includes('radiator') ? 'Radiator' :
                      selectedProduct.value.id?.includes('mirror') ? 'Mirror' :
                          selectedProduct.value.id?.includes('door') ? 'Door' : 'Unknown'

  const productData = {
    type: componentType,
    product: selectedProduct.value,
    selectedVariant: selectedVariant.value,
    selectedColor: selectedColor.value,
    totalPrice: calculateTotalPrice()
  }

  console.log('UnifiedProductDrawer: Adding to room:', productData)
  emit('add-to-room', productData)
}

const closeDrawer = () => {
  emit('close')
}

// Styles
const overlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1800,
  opacity: props.isOpen ? '1' : '0',
  visibility: props.isOpen ? 'visible' : 'hidden',
  transition: 'opacity 0.3s ease, visibility 0.3s ease'
}))

const drawerStyle = computed(() => ({
  position: 'fixed',
  top: isMobileDevice.value ? '0' : '60px',
  left: '0',
  maxHeight: isMobileDevice.value ? '100vh' : 'calc(100vh - 60px)',
  height: isMobileDevice.value ? '100vh' : 'calc(100vh - 60px)',
  width: isMobileDevice.value ? '100vw' : '500px',
  maxWidth: '100vw',
  backgroundColor: currentView.value === 'variants' ? '#ffffff' : '#f5f5f5',
  zIndex: 1900,
  transform: props.isOpen ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: 'Arial, sans-serif',
  boxShadow: '2px 0 20px rgba(0, 0, 0, 0.15)',
  paddingBottom: isMobileDevice.value ? '20px' : '40px',
}))

const headerStyle = computed(() => ({
  backgroundColor: currentView.value === 'variants' ? '#29275B' : '#ffffff',
  color: currentView.value === 'variants' ? 'white' : '#333',
  padding: '20px',
  borderBottom: currentView.value === 'variants' ? 'none' : '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
  position: 'sticky',
  top: 0,
  zIndex: 10
}))

const backButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: currentView.value === 'variants' ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
  color: currentView.value === 'variants' ? 'white' : '#666',
  fontSize: '14px',
  cursor: 'pointer',
  padding: '8px 12px',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
  transition: 'background-color 0.2s ease',
  fontFamily: 'Arial, sans-serif'
}))

const titleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '18px' : '20px',
  fontWeight: 'bold',
  color: currentView.value === 'variants' ? 'white' : '#333',
  fontFamily: 'Arial, sans-serif'
}))

const closeButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: currentView.value === 'variants' ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid #e0e0e0',
  color: currentView.value === 'variants' ? 'white' : '#666',
  fontSize: '18px',
  cursor: 'pointer',
  padding: '8px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  width: '36px',
  height: '36px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Arial, sans-serif'
}))

const contentStyle = computed(() => ({
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: currentView.value === 'variants' ? '25px' : '20px'
}))

// Product List Styles
const productCardStyle = computed(() => ({
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

const productImageStyle = computed(() => ({
  width: isMobileDevice.value ? '100%' : currentView.value === 'variants' ? '120px' : '200px',
  height: isMobileDevice.value ? '150px' : currentView.value === 'variants' ? '120px' : '150px',
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

const productInfoStyle = computed(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: currentView.value === 'variants' ? '8px' : '10px'
}))

const brandStyle = computed(() => ({
  fontSize: currentView.value === 'variants' ? '12px' : '14px',
  color: '#666',
  fontWeight: '500',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: 'Arial, sans-serif'
}))

const productNameStyle = computed(() => ({
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0',
  lineHeight: currentView.value === 'variants' ? '1.3' : '1.4',
  fontFamily: 'Arial, sans-serif'
}))

const priceStyle = computed(() => ({
  fontSize: currentView.value === 'variants' ? '18px' : '20px',
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

const addToRoomButtonStyle = computed(() => ({
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
}))

// Variants View Styles
const productSummaryStyle = computed(() => ({
  display: 'flex',
  gap: '15px',
  padding: '15px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e9ecef',
  flexDirection: isMobileDevice.value ? 'column' : 'row'
}))

const sectionStyle = computed(() => ({
  padding: '0'
}))

const sectionTitleStyle = computed(() => ({
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0 0 15px 0',
  fontFamily: 'Arial, sans-serif'
}))

const variantOptionsStyle = computed(() => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
}))

const colorOptionsStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: isMobileDevice.value ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
  gap: '12px'
}))

const hardwareItemStyle = computed(() => ({
  display: 'flex',
  gap: '12px',
  alignItems: 'flex-start',
  padding: '15px',
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  border: '1px solid #e9ecef'
}))

const hardwareIconStyle = computed(() => ({
  fontSize: '20px',
  color: '#666',
  flexShrink: 0,
  marginTop: '2px'
}))

const hardwareInfoStyle = computed(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
}))

const hardwareNameStyle = computed(() => ({
  fontSize: '14px',
  fontWeight: '600',
  color: '#333',
  margin: '0',
  fontFamily: 'Arial, sans-serif'
}))

const hardwareBrandStyle = computed(() => ({
  fontSize: '12px',
  color: '#666',
  fontWeight: '500',
  fontFamily: 'Arial, sans-serif'
}))

const hardwarePriceStyle = computed(() => ({
  fontSize: '14px',
  fontWeight: 'bold',
  color: '#e74c3c',
  fontFamily: 'Arial, sans-serif'
}))

const hardwareChangeButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: '1px solid #29275B',
  color: '#29275B',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  alignSelf: 'flex-start',
  marginTop: '5px',
  fontFamily: 'Arial, sans-serif'
}))

const priceSummaryStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  backgroundColor: '#29275B',
  color: 'white',
  borderRadius: '8px',
  fontFamily: 'Arial, sans-serif'
}))

const totalPriceLabelStyle = computed(() => ({
  fontSize: '16px',
  fontWeight: '500',
  fontFamily: 'Arial, sans-serif'
}))

const totalPriceStyle = computed(() => ({
  fontSize: '24px',
  fontWeight: 'bold',
  fontFamily: 'Arial, sans-serif'
}))

const actionButtonsStyle = computed(() => ({
  display: 'flex',
  gap: '10px',
  marginTop: '10px',
  flexDirection: isMobileDevice.value ? 'column' : 'row'
}))

const backToCatalogueButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: '1px solid #666',
  color: '#666',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  flex: isMobileDevice.value ? '1' : '0 0 auto',
  fontFamily: 'Arial, sans-serif'
}))

const confirmAddButtonStyle = computed(() => ({
  backgroundColor: '#29275B',
  color: 'white',
  border: 'none',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background-color 0.2s ease',
  flex: '1',
  fontFamily: 'Arial, sans-serif'
}))

// Dynamic styles methods
const getVariantButtonStyle = (variantId) => ({
  padding: '12px 16px',
  border: selectedVariant.value === variantId ? '2px solid #29275B' : '2px solid #e0e0e0',
  borderRadius: '6px',
  backgroundColor: selectedVariant.value === variantId ? '#f0f8f0' : '#ffffff',
  color: selectedVariant.value === variantId ? '#29275B' : '#333',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  transition: 'all 0.2s ease',
  textAlign: 'left',
  fontFamily: 'Arial, sans-serif'
})

const getColorSwatchStyle = (color) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  padding: '12px',
  border: selectedColor.value === color.id ? '2px solid #29275B' : '2px solid #e0e0e0',
  borderRadius: '8px',
  backgroundColor: selectedColor.value === color.id ? '#f0f8f0' : '#ffffff',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
})

const colorInnerStyle = (color) => ({
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: color.color,
  border: '2px solid #e0e0e0',
  boxShadow: selectedColor.value === color.id ? '0 0 0 2px rgba(76, 175, 80, 0.2)' : 'none'
})

const colorNameStyle = computed(() => ({
  fontSize: '12px',
  color: '#333',
  fontWeight: '500',
  textAlign: 'center',
  fontFamily: 'Arial, sans-serif'
}))
</script>

<style scoped>
/* Hover effects */
.product-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

.back-button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.add-to-room-button:hover {
  background-color: #29275B !important;
}

.variant-button:hover {
  border-color: #29275B !important;
  background-color: #f0f8f0 !important;
}

.color-swatch:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.hardware-change-button:hover {
  background-color: #29275B !important;
  color: white !important;
}

.confirm-add-button:hover {
  background-color: #29275B !important;
}

.back-to-catalogue-button:hover {
  background-color: #f8f9fa !important;
  border-color: #333 !important;
}

.more-info-link:hover {
  text-decoration: underline !important;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>