<template>
  <div>
    <!-- Mobile Floating + Button -->
    <button
        v-if="isMobileDevice && !isSidebarVisible"
        @click="showSidebar"
        :style="mobileFloatingButtonStyle"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
    >
      <span :style="plusIconStyle">+</span>
    </button>

    <!-- Mobile Sidebar Overlay -->
    <div
        v-if="isMobileDevice && isSidebarVisible"
        :style="mobileSidebarOverlayStyle"
        @click="hideSidebar"
    ></div>

    <!-- Main Sidebar Panel -->
    <div :style="panelStyle">
      <!-- Mobile Close Button -->
      <button
          v-if="isMobileDevice"
          @click="hideSidebar"
          :style="mobileCloseButtonStyle"
      >
        ✕
      </button>

      <!-- Bathroom Items Accordion -->
      <div :style="accordionSectionStyle">
        <div
            @click="toggleBathroomItemsSection"
            :style="mainAccordionHeaderStyle"
        >
          <h4 :style="accordionTitleStyle">Bathroom Items</h4>
          <span :style="getArrowStyle(isBathroomItemsExpanded)">▼</span>
        </div>
        <div
            :style="getAccordionContentStyle(isBathroomItemsExpanded)"
            ref="bathroomItemsContent"
        >
          <div :style="categoriesContainerStyle">
            <!-- Category Items -->
            <div
                v-for="category in bathroomCategories"
                :key="category.id"
                @click.stop="openProductDrawer(category.component)"
                :style="categoryItemStyle"
                class="category-item"
            >
              <div :style="categoryIconStyle">
                <span v-html="category.icon"></span>
              </div>
              <span :style="categoryLabelStyle">{{ category.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Room Settings Accordion -->
      <div :style="accordionSectionStyle">
        <div
            @click="toggleRoomSettingsSection"
            :style="mainAccordionHeaderStyle"
        >
          <h4 :style="accordionTitleStyle">Room Settings</h4>
          <span :style="getArrowStyle(isRoomSettingsExpanded)">▼</span>
        </div>
        <div
            :style="getAccordionContentStyle(isRoomSettingsExpanded)"
            ref="roomSettingsContent"
        >
          <div :style="roomSettingsContentStyle">
            <div :style="controlGroupStyle">
              <label :style="labelStyle">
                Width: {{ safeToFixed(localRoomWidth, 0) }}cm
                <div :style="inputSliderContainerStyle">
                  <input
                      type="number"
                      :min="ROOM_DEFAULTS.MIN_SIZE"
                      :max="ROOM_DEFAULTS.MAX_SIZE"
                      :step="ROOM_DEFAULTS.STEP"
                      :value="localRoomWidth"
                      @input="updateWidthFromInput"
                      @blur="validateAndUpdateWidth"
                      :style="numberInputStyle"
                      placeholder="Width"
                      class="modern-number-input"
                  />
                  <input
                      type="range"
                      :min="ROOM_DEFAULTS.MIN_SIZE"
                      :max="ROOM_DEFAULTS.MAX_SIZE"
                      :step="ROOM_DEFAULTS.STEP"
                      :value="localRoomWidth"
                      @input="updateWidthFromSlider"
                      :style="sliderStyle"
                      class="modern-slider"
                  />
                </div>
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="labelStyle">
                Height: {{ safeToFixed(localRoomHeight, 0) }}cm
                <div :style="inputSliderContainerStyle">
                  <input
                      type="number"
                      :min="ROOM_DEFAULTS.MIN_SIZE"
                      :max="ROOM_DEFAULTS.MAX_SIZE"
                      :step="ROOM_DEFAULTS.STEP"
                      :value="localRoomHeight"
                      @input="updateHeightFromInput"
                      @blur="validateAndUpdateHeight"
                      :style="numberInputStyle"
                      placeholder="Height"
                      class="modern-number-input"
                  />
                  <input
                      type="range"
                      :min="ROOM_DEFAULTS.MIN_SIZE"
                      :max="ROOM_DEFAULTS.MAX_SIZE"
                      :step="ROOM_DEFAULTS.STEP"
                      :value="localRoomHeight"
                      @input="updateHeightFromSlider"
                      :style="sliderStyle"
                      class="modern-slider"
                  />
                </div>
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="checkboxLabelStyle">
                <input
                    type="checkbox"
                    :checked="showGrid"
                    @change="$emit('toggle-grid', $event.target.checked)"
                    :style="checkboxStyle"
                />
                Show Grid
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="checkboxLabelStyle">
                <input
                    type="checkbox"
                    :checked="showWallGrid"
                    @change="$emit('toggle-wall-grid', $event.target.checked)"
                    :style="checkboxStyle"
                />
                Show Wall Grid
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="checkboxLabelStyle">
                <input
                    type="checkbox"
                    :checked="wallCullingEnabled"
                    @change="$emit('toggle-wall-culling', $event.target.checked)"
                    :style="checkboxStyle"
                />
                Smart Wall Hiding
              </label>
            </div>

            <div :style="controlGroupStyle">
              <button
                  @click="$emit('constrain-objects')"
                  :style="buttonStyle"
              >
                Snap Objects to Walls
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Textures Button -->
      <div :style="accordionSectionStyle">
        <button
            @click="toggleTextureDrawer"
            :style="textureButtonStyle"
        >
          <h4 :style="accordionTitleStyle">Textures</h4>
          <span :style="textureArrowStyle">▶</span>
        </button>
      </div>
    </div>

    <!-- Texture Drawer Overlay -->
    <div
        v-if="isTextureDrawerOpen"
        :style="overlayStyle"
        @click="closeTextureDrawer"
    ></div>

    <!-- Texture Drawer -->
    <div :style="drawerStyle">
      <div :style="drawerHeaderStyle">
        <h3 :style="drawerTitleStyle">Textures</h3>
        <button
            @click="closeTextureDrawer"
            :style="drawerCloseButtonStyle"
            @mouseenter="e => e.target.style.backgroundColor = '#f3f4f6'"
            @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
        >
          ✕
        </button>
      </div>

      <div :style="drawerContentStyle">
        <!-- Floor Texture Section -->
        <div :style="drawerSectionStyle">
          <div
              @click="toggleFloorSection"
              :style="drawerSubHeaderStyle"
          >
            <h5 :style="drawerSubTitleStyle">Floor Texture</h5>
            <span :style="getSubArrowStyle(isFloorExpanded)">▼</span>
          </div>
          <div :style="getSubAccordionContentStyle(isFloorExpanded)">
            <div :style="textureGridStyle">
              <div
                  v-for="(texture, index) in FLOOR_TEXTURES"
                  :key="index"
                  @click="$emit('floor-change', texture)"
                  :style="getTextureButtonStyle(texture, index === currentFloor)"
              >
                <div :style="getTexturePreviewStyle(texture)"></div>
                <span :style="textureLabelStyle">{{ texture.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Wall Texture Section -->
        <div :style="drawerSectionStyle">
          <div
              @click="toggleWallSection"
              :style="drawerSubHeaderStyle"
          >
            <h5 :style="drawerSubTitleStyle">Wall Texture</h5>
            <span :style="getSubArrowStyle(isWallExpanded)">▼</span>
          </div>
          <div :style="getSubAccordionContentStyle(isWallExpanded)">
            <div :style="textureGridStyle">
              <div
                  v-for="(texture, index) in WALL_TEXTURES"
                  :key="index"
                  @click="$emit('wall-change', texture)"
                  :style="getTextureButtonStyle(texture, index === currentWall)"
              >
                <div :style="getTexturePreviewStyle(texture)"></div>
                <span :style="textureLabelStyle">{{ texture.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Unified Product Drawer -->
    <ProductDrawer
        :is-open="isProductDrawerOpen"
        :selected-category="selectedCategory"
        @close="closeProductDrawer"
        @add-to-room="handleAddToRoom"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { FLOOR_TEXTURES, WALL_TEXTURES } from '../../constants/textures.js'
import { COMPONENTS } from '../../constants/components.js'
import { ROOM_DEFAULTS } from '../../constants/dimensions.js'
import { isMobile } from '../../utils/helpers.js'
import ProductDrawer from './ProductDrawer.vue'

// Define props
const props = defineProps({
  currentFloor: {
    type: Number,
    required: true
  },
  currentWall: {
    type: Number,
    required: true
  },
  roomWidth: {
    type: Number,
    required: true
  },
  roomHeight: {
    type: Number,
    required: true
  },
  showGrid: {
    type: Boolean,
    required: true
  },
  showWallGrid: {
    type: Boolean,
    required: true
  },
  wallCullingEnabled: {
    type: Boolean,
    required: true
  }
})

// Define emits
const emit = defineEmits([
  'floor-change',
  'wall-change',
  'close',
  'add',
  'room-size-change',
  'toggle-grid',
  'toggle-wall-grid',
  'constrain-objects',
  'toggle-wall-culling'
])

// Bathroom categories with icons (matching your design)
const bathroomCategories = [
  {
    id: 'baths',
    label: 'Baths',
    component: 'Bath',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 12h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-6z"/>
      <path d="M2 18h20"/>
      <circle cx="7" cy="21" r="1"/>
      <circle cx="17" cy="21" r="1"/>
    </svg>`
  },
  {
    id: 'showers',
    label: 'Showers',
    component: 'Shower',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 4h16v16H4z"/>
      <path d="M8 2v20"/>
      <path d="M12 8v8"/>
      <path d="M16 8v8"/>
    </svg>`
  },
  {
    id: 'toilets',
    label: 'Toilets',
    component: 'Toilet',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M6 8h12v8a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>
      <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M6 8H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2"/>
    </svg>`
  },
  {
    id: 'mirrors',
    label: 'Mirrors',
    component: 'Mirror',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
      <path d="M8 12l3 3 5-5"/>
    </svg>`
  },
  {
    id: 'Radiator',
    label: 'Radiator',
    component: 'Radiator',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="4" y="6" width="16" height="12" rx="2"/>
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
      <path d="M8 18v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2"/>
    </svg>`
  },
  {
    id: 'furniture',
    label: 'Furniture',
    component: 'Furniture',
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="8" width="18" height="10" rx="2"/>
      <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/>
      <path d="M7 18v2"/>
      <path d="M17 18v2"/>
    </svg>`
  },
]

// Reactive state
const isBathroomItemsExpanded = ref(true)
const isRoomSettingsExpanded = ref(true)
const isTextureDrawerOpen = ref(false)
const isFloorExpanded = ref(true)
const isWallExpanded = ref(false)
const isSidebarVisible = ref(false)
const isButtonPressed = ref(false)

// Product drawer state
const isProductDrawerOpen = ref(false)
const isVariantsDrawerOpen = ref(false)
const selectedCategory = ref('')
const selectedProduct = ref(null)

// Local state for inputs
const localRoomWidth = ref(Number(props.roomWidth) || ROOM_DEFAULTS.WIDTH)
const localRoomHeight = ref(Number(props.roomHeight) || ROOM_DEFAULTS.HEIGHT)
const isInternalUpdate = ref(false)

// Product drawer methods
const openProductDrawer = (category) => {
  emit('add', category)
  selectedCategory.value = category
  isProductDrawerOpen.value = true

  // Auto-hide sidebar on mobile when opening product drawer
  if (isMobileDevice.value) {
    hideSidebar()
  }
}

const closeProductDrawer = () => {
  isProductDrawerOpen.value = false
  selectedCategory.value = ''
}

const handleAddToRoom = (product) => {
  console.log('Adding product to room:', product)
  selectedProduct.value = product
  isProductDrawerOpen.value = false
  isVariantsDrawerOpen.value = true
}

const closeVariantsDrawer = () => {
  isVariantsDrawerOpen.value = false
  selectedProduct.value = null
}

const backToProductList = () => {
  isVariantsDrawerOpen.value = false
  isProductDrawerOpen.value = true
}

const handleConfirmAdd = (productData) => {
  console.log('Confirming add to room with variants:', productData)
  const componentType = productData.type
  console.log('Extracted component type:', componentType)
  handleAddComponent(componentType)
  closeVariantsDrawer()
  closeProductDrawer()
}

const handleAddComponent = (component) => {
  console.log('Adding component:', component)
  emit('add', component)
  if (isMobileDevice.value) {
    setTimeout(() => {
      hideSidebar()
    }, 300)
  }
}

// Safe toFixed function
const safeToFixed = (value, decimals) => {
  const num = Number(value)
  return isNaN(num) ? '0.0' : num.toFixed(decimals)
}

// Watch for external prop changes
watch(() => props.roomWidth, (newWidth) => {
  if (!isInternalUpdate.value) {
    localRoomWidth.value = Number(newWidth) || ROOM_DEFAULTS.WIDTH
  }
})

watch(() => props.roomHeight, (newHeight) => {
  if (!isInternalUpdate.value) {
    localRoomHeight.value = Number(newHeight) || ROOM_DEFAULTS.HEIGHT
  }
})

// Computed
const isMobileDevice = computed(() => isMobile())

// Styles for new category design
const categoriesContainerStyle = computed(() => ({
  padding: '10px',
  backgroundColor: '#ffffff'
}))

const categoryItemStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  padding: '16px 20px',
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  marginBottom: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  gap: '16px',
  fontFamily: 'Arial, sans-serif',
  ':hover': {
    backgroundColor: '#f9fafb',
    borderColor: '#10b981'
  }
}))

const categoryIconStyle = computed(() => ({
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#29275B',
  flexShrink: 0
}))

const categoryLabelStyle = computed(() => ({
  fontSize: '15px',
  fontWeight: '500',
  color: '#374151',
  fontFamily: 'Arial, sans-serif'
}))

// Keep all other existing styles...
const mobileFloatingButtonStyle = computed(() => ({
  position: 'fixed',
  bottom: '30px',
  left: '20px',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: isButtonPressed.value ? '#29275B' : '#29275B',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  transform: isButtonPressed.value ? 'scale(0.95)' : 'scale(1)',
  fontSize: '24px',
  fontWeight: 'bold',
  backdropFilter: 'blur(10px)'
}))

const plusIconStyle = computed(() => ({
  fontSize: '28px',
  fontWeight: 'bold',
  lineHeight: '1'
}))

const mobileSidebarOverlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1500,
  opacity: '1',
  visibility: 'visible'
}))

const mobileCloseButtonStyle = computed(() => ({
  position: 'absolute',
  top: '10px',
  right: '10px',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#29275B',
  color: 'white',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
}))

// FIXED: Main panel styles - the key fix is here
const panelStyle = computed(() => ({
  position: isMobileDevice.value ? 'fixed' : 'absolute',
  top: isMobileDevice.value ? '0' : '60px',
  left: '0',
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  padding: isMobileDevice.value ? '50px 20px 20px 20px' : '20px',
  boxShadow: isMobileDevice.value ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.15)',
  width: isMobileDevice.value ? '100vw' : '480px',
  maxWidth: isMobileDevice.value ? '100vw' : '500px',
  zIndex: isMobileDevice.value ? 1600 : 1000,
  backdropFilter: 'blur(12px)',
  // FIXED: Changed from 100vh to calc(100vh - 60px) for desktop
  maxHeight: isMobileDevice.value ? '100vh' : 'calc(100vh - 60px)',
  height: isMobileDevice.value ? '100vh' : 'calc(100vh - 60px)',
  overflowY: 'auto',
  fontFamily: 'Arial, sans-serif',
  border: isMobileDevice.value ? 'none' : '1px solid rgba(16, 185, 129, 0.2)',
  transform: isMobileDevice.value ? (isSidebarVisible.value ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
  transition: 'transform 0.3s ease',
  display: isMobileDevice.value ? 'block' : 'block',
  // ADDED: Additional bottom padding to ensure content doesn't get cut off
  paddingBottom: isMobileDevice.value ? '20px' : '40px'
}))

const accordionSectionStyle = computed(() => ({
  border: '1px solid #fff',
  borderRadius: '10px',
  overflow: 'hidden',
  backgroundColor: '#ffffff',
  marginBottom: '12px'
}))

const mainAccordionHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px',
  cursor: 'pointer',
  backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  background: '#29275B',
  transition: 'all 0.2s ease',
  color: '#ffffff',
  fontFamily: 'Arial, sans-serif'
}))

const accordionTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  color: '#ffffff',
  fontFamily: 'Arial, sans-serif'
}))

// Room Settings styles
const roomSettingsContentStyle = computed(() => ({
  padding: '20px',
  backgroundColor: '#fafbfc'
}))

const controlGroupStyle = computed(() => ({
  marginBottom: '20px',
  padding: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
  transition: 'all 0.2s ease'
}))

const labelStyle = computed(() => ({
  display: 'block',
  fontSize: isMobileDevice.value ? '14px' : '15px',
  color: '#1f2937',
  marginBottom: '8px',
  fontFamily: 'Arial, sans-serif',
  fontWeight: '600'
}))

const inputSliderContainerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '15px',
  marginTop: '12px'
}))

const numberInputStyle = computed(() => ({
  width: isMobileDevice.value ? '80px' : '90px',
  padding: '12px 16px',
  border: '2px solid #e5e7eb',
  borderRadius: '10px',
  fontSize: isMobileDevice.value ? '14px' : '15px',
  fontFamily: 'Arial, sans-serif',
  backgroundColor: '#ffffff',
  color: '#1f2937',
  outline: 'none',
  transition: 'all 0.3s ease',
  textAlign: 'center',
  fontWeight: '600',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
  position: 'relative'
}))

const sliderStyle = computed(() => ({
  flex: 1,
  marginTop: '0',
  accentColor: '#29275B',
  height: isMobileDevice.value ? '8px' : '6px',
  borderRadius: '4px',
  cursor: 'pointer'
}))

const checkboxLabelStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  color: '#666',
  cursor: 'pointer',
  fontFamily: 'Arial, sans-serif'
}))

const checkboxStyle = computed(() => ({
  accentColor: '#29275B',
  width: isMobileDevice.value ? '18px' : '16px',
  height: isMobileDevice.value ? '18px' : '16px'
}))

const buttonStyle = computed(() => ({
  width: '100%',
  padding: isMobileDevice.value ? '12px' : '10px',
  backgroundColor: '#29275B',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '12px' : '14px',
  fontWeight: '500',
  transition: 'background-color 0.2s ease',
  fontFamily: 'Arial, sans-serif'
}))

// Texture button styles
const textureButtonStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px',
  cursor: 'pointer',
  backgroundColor: '#29275B',
  background: '#29275B',
  transition: 'all 0.2s ease',
  color: '#ffffff',
  fontFamily: 'Arial, sans-serif',
  border: 'none',
  width: '100%',
  borderRadius: '0'
}))

const textureArrowStyle = computed(() => ({
  fontSize: '14px',
  color: '#ffffff',
  transition: 'transform 0.2s ease',
  fontFamily: 'Arial, sans-serif'
}))

// Drawer styles
const overlayStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  zIndex: 1500,
  opacity: isTextureDrawerOpen.value ? '1' : '0',
  visibility: isTextureDrawerOpen.value ? 'visible' : 'hidden',
  transition: 'opacity 0.3s ease, visibility 0.3s ease'
}))

const drawerStyle = computed(() => ({
  position: isMobileDevice.value ? 'fixed' : 'absolute',
  top: isMobileDevice.value ? '0' : '60px',
  left: isMobileDevice.value ? '0' : '0',
  // FIXED: Same height fix for drawer
  height: isMobileDevice.value ? '100vh' : 'calc(100vh - 60px)',
  width: isMobileDevice.value ? '100vw' : '480px',
  maxWidth: isMobileDevice.value ? '100vw' : '500px',
  backgroundColor: '#ffffff',
  boxShadow: isMobileDevice.value ? 'none' : '2px 0 20px rgba(0, 0, 0, 0.15)',
  zIndex: 1700,
  transform: isTextureDrawerOpen.value ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease',
  overflowY: 'hidden',
  fontFamily: 'Arial, sans-serif',
  display: 'flex',
  flexDirection: 'column'
}))

const drawerHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#f9fafb',
  position: 'sticky',
  top: '0',
  zIndex: 10,
  flexShrink: 0
}))

const drawerTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '18px' : '20px',
  fontWeight: 'bold',
  color: '#1f2937',
  fontFamily: 'Arial, sans-serif'
}))

const drawerCloseButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: 'none',
  fontSize: '20px',
  cursor: 'pointer',
  color: '#6b7280',
  padding: '8px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}))

const drawerContentStyle = computed(() => ({
  padding: '20px',
  flexGrow: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  height: '0',
  minHeight: '0',
  // ADDED: Bottom padding to ensure content doesn't get cut off
  paddingBottom: '40px'
}))

const drawerSectionStyle = computed(() => ({
  marginBottom: '20px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  overflow: 'hidden'
}))

const drawerSubHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px',
  color: 'white',
  cursor: 'pointer',
  backgroundColor: '#29275B',
  transition: 'background-color 0.2s ease',
  borderBottom: '1px solid #e5e7eb'
}))

const drawerSubTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '15px' : '16px',
  fontWeight: '600',
  color: '#fff',
  fontFamily: 'Arial, sans-serif'
}))

const textureGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: isMobileDevice.value ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
  gap: '12px',
  padding: '15px'
}))

const textureLabelStyle = computed(() => ({
  fontSize: isMobileDevice.value ? '11px' : '12px',
  color: '#6b7280',
  textAlign: 'center',
  fontWeight: '500',
  lineHeight: '1.3',
  fontFamily: 'Arial, sans-serif'
}))

// Methods
const showSidebar = () => {
  isSidebarVisible.value = true
}

const hideSidebar = () => {
  isSidebarVisible.value = false
}

const handleTouchStart = () => {
  isButtonPressed.value = true
}

const handleTouchEnd = () => {
  isButtonPressed.value = false
}

const toggleBathroomItemsSection = () => {
  isBathroomItemsExpanded.value = !isBathroomItemsExpanded.value
}

const toggleRoomSettingsSection = () => {
  isRoomSettingsExpanded.value = !isRoomSettingsExpanded.value
}

const toggleTextureDrawer = () => {
  isTextureDrawerOpen.value = !isTextureDrawerOpen.value
}

const closeTextureDrawer = () => {
  isTextureDrawerOpen.value = false
}

const toggleFloorSection = () => {
  isFloorExpanded.value = !isFloorExpanded.value
}

const toggleWallSection = () => {
  isWallExpanded.value = !isWallExpanded.value
}

// Room settings methods
const validateValue = (value, min, max) => {
  const num = Number(value)
  if (isNaN(num)) return min
  return Math.max(min, Math.min(max, num))
}

const updateWidthFromInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    localRoomWidth.value = newValue
    if (newValue >= ROOM_DEFAULTS.MIN_SIZE && newValue <= ROOM_DEFAULTS.MAX_SIZE) {
      isInternalUpdate.value = true
      emit('room-size-change', newValue, localRoomHeight.value)
      setTimeout(() => {
        isInternalUpdate.value = false
      }, 100)
    }
  }
}

const updateHeightFromInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    localRoomHeight.value = newValue
    if (newValue >= ROOM_DEFAULTS.MIN_SIZE && newValue <= ROOM_DEFAULTS.MAX_SIZE) {
      isInternalUpdate.value = true
      emit('room-size-change', localRoomWidth.value, newValue)
      setTimeout(() => {
        isInternalUpdate.value = false
      }, 100)
    }
  }
}

const updateWidthFromSlider = (event) => {
  const newValue = Number(event.target.value)
  localRoomWidth.value = newValue
  isInternalUpdate.value = true
  emit('room-size-change', newValue, localRoomHeight.value)
  setTimeout(() => {
    isInternalUpdate.value = false
  }, 100)
}

const updateHeightFromSlider = (event) => {
  const newValue = Number(event.target.value)
  localRoomHeight.value = newValue
  isInternalUpdate.value = true
  emit('room-size-change', localRoomWidth.value, newValue)
  setTimeout(() => {
    isInternalUpdate.value = false
  }, 100)
}

// FIXED: Validation methods that ensure numbers
const validateAndUpdateWidth = () => {
  const validatedValue = validateValue(
      localRoomWidth.value,
      ROOM_DEFAULTS.MIN_SIZE,
      ROOM_DEFAULTS.MAX_SIZE
  )

  if (validatedValue !== localRoomWidth.value) {
    localRoomWidth.value = validatedValue
    isInternalUpdate.value = true
    emit('room-size-change', validatedValue, localRoomHeight.value)
    setTimeout(() => {
      isInternalUpdate.value = false
    }, 100)
  }
}

const validateAndUpdateHeight = () => {
  const validatedValue = validateValue(
      localRoomHeight.value,
      ROOM_DEFAULTS.MIN_SIZE,
      ROOM_DEFAULTS.MAX_SIZE
  )

  if (validatedValue !== localRoomHeight.value) {
    localRoomHeight.value = validatedValue
    isInternalUpdate.value = true
    emit('room-size-change', localRoomWidth.value, validatedValue)
    setTimeout(() => {
      isInternalUpdate.value = false
    }, 100)
  }
}

const getArrowStyle = (isExpanded) => ({
  fontSize: '14px',
  color: '#ffffff',
  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
  transition: 'transform 0.2s ease',
  display: 'inline-block',
  fontFamily: 'Arial, sans-serif'
})

const getSubArrowStyle = (isExpanded) => ({
  fontSize: '12px',
  color: '#6b7280',
  transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
  transition: 'transform 0.2s ease',
  display: 'inline-block',
  fontFamily: 'Arial, sans-serif'
})

const getAccordionContentStyle = (isExpanded) => ({
  maxHeight: isExpanded ? '800px' : '0px',
  overflow: 'hidden',
  transition: 'max-height 0.3s ease-in-out',
  backgroundColor: '#f9fafb',
  padding: isExpanded ? '0px' : '0px'
})

const getSubAccordionContentStyle = (isExpanded) => ({
  maxHeight: isExpanded ? 'none' : '0px',
  overflow: isExpanded ? 'visible' : 'hidden',
  transition: 'max-height 0.3s ease-in-out',
  backgroundColor: '#ffffff'
})

const getTextureButtonStyle = (texture, isActive) => ({
  padding: '10px',
  border: isActive ? '3px solid #29275B' : '2px solid #e5e7eb',
  borderRadius: '8px',
  cursor: 'pointer',
  backgroundColor: isActive ? '#f0fdf4' : '#fff',
  transition: 'all 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px',
  minHeight: isMobileDevice.value ? '70px' : '80px',
  boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
})

const getTexturePreviewStyle = (texture) => ({
  width: '100%',
  height: isMobileDevice.value ? '35px' : '45px',
  backgroundColor: `#${ texture.color.toString(16).padStart(6, '0') }`,
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
  backgroundImage: texture.file ? `url(${ texture.file })` : 'none',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
})
</script>

<style scoped>
/* Category item hover effects */
.category-item:hover {
  background-color: #f9fafb !important;
  border-color: #29275B !important;
  transform: translateY(-1px);
}

.category-item:hover .category-icon {
  color: #29275B !important;
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

/* Enhanced modern input styles */
.modern-number-input {
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 2px solid #e5e7eb !important;
  border-radius: 10px !important;
  padding: 12px 16px !important;
  font-weight: 600 !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08) !important;
}

.modern-number-input:hover {
  border-color: #9ca3af !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12) !important;
  transform: translateY(-1px) !important;
}

.modern-number-input:focus {
  border-color: #29275B !important;
  box-shadow: 0 0 0 4px rgba(41, 39, 91, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  transform: translateY(-1px) !important;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%) !important;
}

.modern-number-input::-webkit-outer-spin-button,
.modern-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

.modern-number-input {
  -moz-appearance: textfield !important;
}

/* Enhanced slider styles */
.modern-slider {
  appearance: none !important;
  height: 8px !important;
  border-radius: 4px !important;
  background: linear-gradient(to right, #e5e7eb 0%, #e5e7eb 100%) !important;
  outline: none !important;
  transition: all 0.2s ease !important;
}

.modern-slider:hover {
  background: linear-gradient(to right, #d1d5db 0%, #d1d5db 100%) !important;
}

.modern-slider::-webkit-slider-thumb {
  appearance: none !important;
  width: 24px !important;
  height: 24px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #29275B 0%, #1e1b47 100%) !important;
  cursor: pointer !important;
  box-shadow: 0 3px 10px rgba(41, 39, 91, 0.3) !important;
  transition: all 0.2s ease !important;
  border: 3px solid #ffffff !important;
}

.modern-slider::-webkit-slider-thumb:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 5px 15px rgba(41, 39, 91, 0.4) !important;
}

.modern-slider::-moz-range-thumb {
  width: 24px !important;
  height: 24px !important;
  border-radius: 50% !important;
  background: linear-gradient(135deg, #29275B 0%, #1e1b47 100%) !important;
  cursor: pointer !important;
  border: 3px solid #ffffff !important;
  box-shadow: 0 3px 10px rgba(41, 39, 91, 0.3) !important;
  transition: all 0.2s ease !important;
}

.modern-slider::-moz-range-thumb:hover {
  transform: scale(1.1) !important;
  box-shadow: 0 5px 15px rgba(41, 39, 91, 0.4) !important;
}

@media (max-width: 768px) {
  .modern-slider::-webkit-slider-thumb {
    width: 26px !important;
    height: 26px !important;
  }

  .modern-slider::-moz-range-thumb {
    width: 26px !important;
    height: 26px !important;
  }

  .modern-number-input {
    font-size: 14px !important;
    padding: 10px 14px !important;
  }
}
</style>