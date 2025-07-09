<template>
  <div :style="panelStyle">
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

    <!-- Textures Accordion -->
    <div :style="accordionSectionStyle">
      <div
          @click="toggleTexturesSection"
          :style="mainAccordionHeaderStyle"
          @mouseenter="e => e.target.style.backgroundColor = '#f8f9fa'"
          @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
      >
        <h4 :style="accordionTitleStyle">Textures</h4>
        <span :style="getArrowStyle(isTexturesExpanded)">▼</span>
      </div>
      <div
          :style="getAccordionContentStyle(isTexturesExpanded)"
          ref="texturesContent"
      >
        <!-- Floor Texture Sub-Accordion -->
        <div :style="subAccordionSectionStyle">
          <div
              @click="toggleFloorSection"
              :style="subAccordionHeaderStyle"
              @mouseenter="e => e.target.style.backgroundColor = '#f0f2f5'"
              @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
          >
            <h5 :style="subAccordionTitleStyle">Floor Texture</h5>
            <span :style="getSubArrowStyle(isFloorExpanded)">▼</span>
          </div>
          <div
              :style="getSubAccordionContentStyle(isFloorExpanded)"
              ref="floorContent"
          >
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

        <!-- Wall Texture Sub-Accordion -->
        <div :style="subAccordionSectionStyle">
          <div
              @click="toggleWallSection"
              :style="subAccordionHeaderStyle"
              @mouseenter="e => e.target.style.backgroundColor = '#f0f2f5'"
              @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
          >
            <h5 :style="subAccordionTitleStyle">Wall Texture</h5>
            <span :style="getSubArrowStyle(isWallExpanded)">▼</span>
          </div>
          <div
              :style="getSubAccordionContentStyle(isWallExpanded)"
              ref="wallContent"
          >
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
  }
})

// Define emits
const emit = defineEmits(['floor-change', 'wall-change', 'close', 'add'])

// Reactive state for accordion
const isBathroomItemsExpanded = ref(true)  // Bathroom items accordion
const isTexturesExpanded = ref(false)      // Main textures accordion
const isFloorExpanded = ref(true)          // Floor sub-accordion
const isWallExpanded = ref(false)          // Wall sub-accordion

// Computed
const isMobileDevice = computed(() => isMobile())

const panelStyle = computed(() => ({
  position: 'absolute',
  top: isMobileDevice.value ? '80px' : '70px',
  left: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  padding: '20px',
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
  width: isMobileDevice.value ? '90vw' : '480px',
  maxWidth: isMobileDevice.value ? '90vw' : '500px',
  zIndex: 1000,
  backdropFilter: 'blur(12px)',
  maxHeight: isMobileDevice.value ? '70vh' : '80vh',
  overflowY: 'auto',
  fontFamily: 'Arial, sans-serif',
  border: '1px solid rgba(16, 185, 129, 0.2)'
}))

const panelHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  marginBottom: '15px',
  padding: '0'
}))

const topCloseButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: '1px solid #ddd',
  fontSize: '16px',
  cursor: 'pointer',
  color: '#666',
  padding: '6px 10px',
  borderRadius: '4px',
  transition: 'all 0.2s ease',
  minWidth: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: '1'
}))

const accordionTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '16px' : '18px',
  fontWeight: 'bold',
  color: '#1f2937',
  fontFamily: 'Arial, sans-serif'
}))

const closeButtonStyle = computed(() => ({
  backgroundColor: 'transparent',
  border: '1px solid #ddd',
  fontSize: '16px',
  cursor: 'pointer',
  color: '#666',
  padding: '6px 10px',
  borderRadius: '4px',
  transition: 'all 0.2s ease',
  minWidth: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: '1'
}))

// Main accordion styles
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

const headerControlsStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
}))

// Bathroom items styles
const itemsGridStyle = computed(() => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  padding: '15px',
  justifyContent: isMobileDevice.value ? 'center' : 'flex-start'
}))

const itemButtonStyle = computed(() => ({
  padding: isMobileDevice.value ? '10px 14px' : '12px 18px',
  border: '2px solid #f59e0b',
  borderRadius: '8px',
  backgroundColor: '#f59e0b',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: isMobileDevice.value ? '13px' : '14px',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  whiteSpace: 'nowrap',
  fontFamily: 'Arial, sans-serif',
  textTransform: 'capitalize',
  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
}))

// Sub-accordion styles
const subAccordionSectionStyle = computed(() => ({
  marginBottom: '8px',
  border: '1px solid #e8e8e8',
  borderRadius: '4px',
  overflow: 'hidden',
  backgroundColor: '#fff'
}))

const subAccordionHeaderStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 15px',
  cursor: 'pointer',
  backgroundColor: '#f0fdf4',
  transition: 'background-color 0.2s ease',
  borderBottom: '1px solid #dcfce7',
  fontFamily: 'Arial, sans-serif'
}))

const subAccordionTitleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '14px' : '16px',
  fontWeight: '600',
  color: '#374151',
  fontFamily: 'Arial, sans-serif'
}))

const textureGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: isMobileDevice.value ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
  gap: '10px',
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
const handleClose = () => {
  console.log('Close button clicked - emitting close event')
  emit('close')
}

const handleAddComponent = (component) => {
  console.log('Adding component:', component)
  emit('add', component)
}

const toggleBathroomItemsSection = () => {
  isBathroomItemsExpanded.value = !isBathroomItemsExpanded.value
}

const toggleTexturesSection = () => {
  isTexturesExpanded.value = !isTexturesExpanded.value
}

const toggleFloorSection = () => {
  isFloorExpanded.value = !isFloorExpanded.value
}

const toggleWallSection = () => {
  isWallExpanded.value = !isWallExpanded.value
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
  padding: isExpanded ? '15px' : '0px'
})

const getSubAccordionContentStyle = (isExpanded) => ({
  maxHeight: isExpanded ? '400px' : '0px',
  overflow: 'hidden',
  transition: 'max-height 0.3s ease-in-out',
  backgroundColor: '#ffffff'
})

const getTextureButtonStyle = (texture, isActive) => ({
  padding: '10px',
  border: isActive ? '3px solid #4CAF50' : '1px solid #ddd',
  borderRadius: '6px',
  cursor: 'pointer',
  backgroundColor: isActive ? '#f0f8f0' : '#fff',
  transition: 'all 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  minHeight: '70px',
  ':hover': {
    borderColor: isActive ? '#4CAF50' : '#bbb',
    backgroundColor: isActive ? '#f0f8f0' : '#f9f9f9'
  }
})

const getTexturePreviewStyle = (texture) => ({
  width: '100%',
  height: '40px',
  backgroundColor: `#${texture.color.toString(16).padStart(6, '0')}`,
  borderRadius: '4px',
  border: '1px solid #eee',
  backgroundImage: texture.file ? `url(${texture.file})` : 'none',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
})
</script>

<style scoped>
/* Add scrollbar styling */
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