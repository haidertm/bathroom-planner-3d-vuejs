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

    <!-- Mobile Overlay -->
    <div
        v-if="isMobileDevice && isSidebarVisible"
        :style="mobileOverlayStyle"
        @click="hideSidebar"
    ></div>

    <!-- Main Sidebar Panel -->
    <div :style="panelStyle" v-show="!isMobileDevice || isSidebarVisible">
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
            @mouseenter="e => e.target.style.backgroundColor = '#f8f9fa'"
            @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
        >
          <h4 :style="accordionTitleStyle">Bathroom Items</h4>
          <span :style="getArrowStyle(isBathroomItemsExpanded)">▼</span>
        </div>
        <div
            :style="getAccordionContentStyle(isBathroomItemsExpanded)"
            ref="bathroomItemsContent"
        >
          <div :style="itemsGridStyle">
            <button
                v-for="component in COMPONENTS"
                :key="component"
                @click.stop="handleAddComponent(component)"
                :style="itemButtonStyle"
            >
              {{ component }}
            </button>
          </div>
        </div>
      </div>

      <!-- Room Settings Accordion -->
      <div :style="accordionSectionStyle">
        <div
            @click="toggleRoomSettingsSection"
            :style="mainAccordionHeaderStyle"
            @mouseenter="e => e.target.style.backgroundColor = '#f8f9fa'"
            @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
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
                Width: {{ roomWidth.toFixed(1) }}m
                <input
                    type="range"
                    :min="ROOM_DEFAULTS.MIN_SIZE"
                    :max="ROOM_DEFAULTS.MAX_SIZE"
                    :step="ROOM_DEFAULTS.STEP"
                    :value="roomWidth"
                    @input="updateWidth"
                    :style="sliderStyle"
                />
              </label>
            </div>

            <div :style="controlGroupStyle">
              <label :style="labelStyle">
                Height: {{ roomHeight.toFixed(1) }}m
                <input
                    type="range"
                    :min="ROOM_DEFAULTS.MIN_SIZE"
                    :max="ROOM_DEFAULTS.MAX_SIZE"
                    :step="ROOM_DEFAULTS.STEP"
                    :value="roomHeight"
                    @input="updateHeight"
                    :style="sliderStyle"
                />
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
                  @mouseenter="e => e.target.style.backgroundColor = '#45a049'"
                  @mouseleave="e => e.target.style.backgroundColor = '#4CAF50'"
              >
                Constrain Objects to Room
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
            @mouseenter="e => e.target.style.backgroundColor = '#059669'"
            @mouseleave="e => e.target.style.backgroundColor = '#10b981'"
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
              @mouseenter="e => e.target.style.backgroundColor = '#f0f2f5'"
              @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
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
              @mouseenter="e => e.target.style.backgroundColor = '#f0f2f5'"
              @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
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
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { FLOOR_TEXTURES, WALL_TEXTURES } from '../../constants/textures.js'
import { COMPONENTS } from '../../constants/components.js'
import { ROOM_DEFAULTS } from '../../constants/dimensions.js'
import { isMobile } from '../../utils/helpers.js'

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
  wallCullingEnabled: {
    type: Boolean,
    required: true
  }
})

// Define emits
const emit = defineEmits(['floor-change', 'wall-change', 'close', 'add', 'room-size-change', 'toggle-grid', 'constrain-objects', 'toggle-wall-culling'])

// Reactive state
const isBathroomItemsExpanded = ref(true)
const isRoomSettingsExpanded = ref(true)
const isTextureDrawerOpen = ref(false)
const isFloorExpanded = ref(true)
const isWallExpanded = ref(false)
const isSidebarVisible = ref(false)
const isButtonPressed = ref(false)

// Computed
const isMobileDevice = computed(() => isMobile())

// Mobile floating button styles
const mobileFloatingButtonStyle = computed(() => ({
  position: 'fixed',
  bottom: '30px',
  left: '20px',
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  backgroundColor: isButtonPressed.value ? '#059669' : '#10b981',
  color: 'white',
  border: 'none',
  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
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

const mobileOverlayStyle = computed(() => ({
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
  backgroundColor: '#ef4444',
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

// Main panel styles
const panelStyle = computed(() => ({
  position: isMobileDevice.value ? 'fixed' : 'absolute',
  top: isMobileDevice.value ? '0' : '93px',
  left: '0',
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  padding: isMobileDevice.value ? '50px 20px 20px 20px' : '20px',
  borderRadius: isMobileDevice.value ? '0' : '12px',
  boxShadow: isMobileDevice.value ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.15)',
  width: isMobileDevice.value ? '100vw' : '480px',
  maxWidth: isMobileDevice.value ? '100vw' : '500px',
  zIndex: isMobileDevice.value ? 1600 : 1000,
  backdropFilter: 'blur(12px)',
  maxHeight: isMobileDevice.value ? '100vh' : '100vh',
  height: isMobileDevice.value ? '100vh' : '80vh',
  overflowY: 'auto',
  fontFamily: 'Arial, sans-serif',
  border: isMobileDevice.value ? 'none' : '1px solid rgba(16, 185, 129, 0.2)',
  transform: isMobileDevice.value && !isSidebarVisible.value ? 'translateX(-100%)' : 'translateX(0)',
  transition: 'transform 0.3s ease'
}))

const accordionSectionStyle = computed(() => ({
  marginBottom: '15px',
  border: '1px solid #d1fae5',
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)',
  backgroundColor: '#ffffff'
}))

const mainAccordionHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px',
  cursor: 'pointer',
  backgroundColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  transition: 'all 0.2s ease',
  borderBottom: '1px solid #d1fae5',
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

const itemsGridStyle = computed(() => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  padding: '15px',
  justifyContent: isMobileDevice.value ? 'center' : 'flex-start'
}))

const itemButtonStyle = computed(() => ({
  padding: isMobileDevice.value ? '12px 16px' : '12px 18px',
  border: '2px solid #29275Bb',
  borderRadius: '8px',
  backgroundColor: '#29275B',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '14px' : '14px',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  whiteSpace: 'nowrap',
  fontFamily: 'Arial, sans-serif',
  textTransform: 'capitalize',
  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)',
  minWidth: isMobileDevice.value ? '120px' : 'auto',
  textAlign: 'center'
}))

// Room Settings styles
const roomSettingsContentStyle = computed(() => ({
  padding: '15px'
}))

const controlGroupStyle = computed(() => ({
  marginBottom: '15px'
}))

const labelStyle = computed(() => ({
  display: 'block',
  fontSize: isMobileDevice.value ? '14px' : '14px',
  color: '#666',
  marginBottom: '5px',
  fontFamily: 'Arial, sans-serif'
}))

const checkboxLabelStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: isMobileDevice.value ? '14px' : '14px',
  color: '#666',
  cursor: 'pointer',
  fontFamily: 'Arial, sans-serif'
}))

const sliderStyle = computed(() => ({
  width: '100%',
  marginTop: '5px',
  accentColor: '#10b981',
  height: isMobileDevice.value ? '8px' : '6px'
}))

const checkboxStyle = computed(() => ({
  accentColor: '#10b981',
  width: isMobileDevice.value ? '18px' : '16px',
  height: isMobileDevice.value ? '18px' : '16px'
}))

const buttonStyle = computed(() => ({
  width: '100%',
  padding: isMobileDevice.value ? '12px' : '10px',
  backgroundColor: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '14px' : '14px',
  fontWeight: '600',
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
  backgroundColor: '#10b981',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
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
  top: isMobileDevice.value ? '0' : '104px',
  left: isMobileDevice.value ? '0' : '0',
  height: isMobileDevice.value ? '100vh' : '83vh',
  width: isMobileDevice.value ? '100vw' : '400px',
  backgroundColor: '#ffffff',
  boxShadow: isMobileDevice.value ? 'none' : '2px 0 20px rgba(0, 0, 0, 0.15)',
  zIndex: 1700,
  transform: isTextureDrawerOpen.value ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.3s ease',
  overflowY: 'auto',
  fontFamily: 'Arial, sans-serif'
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
  zIndex: 10
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
  padding: '20px'
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
  cursor: 'pointer',
  backgroundColor: '#f9fafb',
  transition: 'background-color 0.2s ease',
  borderBottom: '1px solid #e5e7eb'
}))

const drawerSubTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '15px' : '16px',
  fontWeight: '600',
  color: '#374151',
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
const handleAddComponent = (component) => {
  console.log('Adding component:', component)
  emit('add', component)
  // Auto-hide sidebar on mobile after adding component
  if (isMobileDevice.value) {
    setTimeout(() => {
      hideSidebar()
    }, 300)
  }
}

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
const updateWidth = (event) => {
  const newWidth = parseFloat(event.target.value)
  emit('room-size-change', newWidth, props.roomHeight)
}

const updateHeight = (event) => {
  const newHeight = parseFloat(event.target.value)
  emit('room-size-change', props.roomWidth, newHeight)
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
  maxHeight: isExpanded ? '600px' : '0px',
  overflow: 'hidden',
  transition: 'max-height 0.3s ease-in-out',
  backgroundColor: '#ffffff'
})

const getTextureButtonStyle = (texture, isActive) => ({
  padding: '10px',
  border: isActive ? '3px solid #10b981' : '2px solid #e5e7eb',
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
  backgroundColor: `#${texture.color.toString(16).padStart(6, '0')}`,
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
  backgroundImage: texture.file ? `url(${texture.file})` : 'none',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
})
</script>

<style scoped>
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

/* Prevent body scroll when sidebar is open on mobile */
body:has([data-sidebar-open]) {
  overflow: hidden;
}

/* Custom slider styles */
input[type="range"] {
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Mobile optimizations */
@media (max-width: 768px) {
  input[type="range"]::-webkit-slider-thumb {
    width: 22px;
    height: 22px;
  }

  input[type="range"]::-moz-range-thumb {
    width: 22px;
    height: 22px;
  }
}
</style>