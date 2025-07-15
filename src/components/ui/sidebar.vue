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
                Width: {{ safeToFixed(localRoomWidth, 1) }}m
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
                Height: {{ safeToFixed(localRoomHeight, 1) }}m
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
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
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

// Local state for inputs - FIXED: Ensure they're always numbers
const localRoomWidth = ref(Number(props.roomWidth) || ROOM_DEFAULTS.WIDTH)
const localRoomHeight = ref(Number(props.roomHeight) || ROOM_DEFAULTS.HEIGHT)

// Track if we're currently updating to prevent circular updates
const isInternalUpdate = ref(false)

// FIXED: Safe toFixed function
const safeToFixed = (value, decimals) => {
  const num = Number(value)
  return isNaN(num) ? '0.0' : num.toFixed(decimals)
}

// Watch for external prop changes and update local state (but not during internal updates)
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

// Mobile floating button styles
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

// Main panel styles
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
  maxHeight: isMobileDevice.value ? '100vh' : '100vh',
  height: isMobileDevice.value ? '100vh' : '100vh',
  overflowY: 'auto',
  fontFamily: 'Arial, sans-serif',
  border: isMobileDevice.value ? 'none' : '1px solid rgba(16, 185, 129, 0.2)',
  transform: isMobileDevice.value ? (isSidebarVisible.value ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
  transition: 'transform 0.3s ease',
  display: isMobileDevice.value ? 'block' : 'block'
}))

const accordionSectionStyle = computed(() => ({
  border: '1px solid #fff',
  borderRadius: '10px',
  overflow: 'hidden',
  backgroundColor: '#ffffff'
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

const itemsGridStyle = computed(() => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  padding: '15px',
  justifyContent: isMobileDevice.value ? 'center' : 'flex-start'
}))

const itemButtonStyle = computed(() => ({
  padding: isMobileDevice.value ? '12px 16px' : '12px 18px',
  border: '2px solid #29275B',
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
  minWidth: isMobileDevice.value ? '120px' : 'auto',
  textAlign: 'center'
}))

// Room Settings styles with enhanced design
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
  height: isMobileDevice.value ? '100vh' : '100vh',
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
  minHeight: '0'
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

// FIXED: Room settings methods with proper validation and number conversion
const validateValue = (value, min, max) => {
  const num = Number(value)
  if (isNaN(num)) return min
  return Math.max(min, Math.min(max, num))
}

// FIXED: Ensure all input handlers convert to numbers
const updateWidthFromInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    // Update local value without clamping during typing
    localRoomWidth.value = newValue

    // Only emit valid values (within range)
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
    // Update local value without clamping during typing
    localRoomHeight.value = newValue

    // Only emit valid values (within range)
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

/* Control group hover effect */
.control-group:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  transform: translateY(-1px) !important;
}

/* Animation for input focus */
@keyframes inputFocus {
  0% {
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
  100% {
    box-shadow: 0 0 0 4px rgba(41, 39, 91, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}

.modern-number-input:focus {
  animation: inputFocus 0.3s ease !important;
}

/* Mobile optimizations */
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