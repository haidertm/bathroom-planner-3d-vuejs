<template>
  <div :style="panelStyle">
    <div :style="headerStyle">
      <h3 :style="titleStyle">Textures</h3>
      <button
          @click="handleClose"
          :style="closeButtonStyle"
          title="Close Panel"
          @mouseenter="e => e.target.style.backgroundColor = '#f0f0f0'"
          @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
      >
        ✕
      </button>
    </div>

    <div :style="sectionStyle">
      <h4 :style="sectionTitleStyle">Floor Texture</h4>
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

    <div :style="sectionStyle">
      <h4 :style="sectionTitleStyle">Wall Texture</h4>
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
</template>

<script setup>
import { computed } from 'vue'
import { FLOOR_TEXTURES, WALL_TEXTURES } from '../../constants/textures.js'
import { isMobile } from '../../utils/helpers.ts'

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
const emit = defineEmits(['floor-change', 'wall-change', 'close'])

// Computed
const isMobileDevice = computed(() => isMobile())

const panelStyle = computed(() => ({
  position: 'absolute',
  top: isMobileDevice.value ? '80px' : '70px',
  left: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  width: isMobileDevice.value ? '90vw' : '480px',
  maxWidth: isMobileDevice.value ? '90vw' : '500px',
  zIndex: 1000,
  backdropFilter: 'blur(10px)',
  maxHeight: isMobileDevice.value ? '70vh' : '80vh',
  overflowY: 'auto'
}))

const headerStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  borderBottom: '2px solid #eee',
  paddingBottom: '10px'
}))

const titleStyle = computed(() => ({
  margin: '0',
  fontSize: isMobileDevice.value ? '18px' : '20px',
  fontWeight: 'bold',
  color: '#333'
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

const sectionStyle = computed(() => ({
  marginBottom: '25px'
}))

const sectionTitleStyle = computed(() => ({
  margin: '0 0 15px 0',
  fontSize: isMobileDevice.value ? '14px' : '16px',
  fontWeight: 'bold',
  color: '#333'
}))

const textureGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: isMobileDevice.value ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
  gap: '10px'
}))

const textureLabelStyle = computed(() => ({
  fontSize: isMobileDevice.value ? '11px' : '12px',
  color: '#666',
  textAlign: 'center',
  fontWeight: '500',
  lineHeight: '1.3'
}))

// Methods
const handleClose = () => {
  console.log('Close button clicked')
  emit('close')
}

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
  backgroundColor: `#${ texture.color.toString(16).padStart(6, '0') }`,
  borderRadius: '4px',
  border: '1px solid #eee',
  backgroundImage: texture.file ? `url(${ texture.file })` : 'none',
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

/* Close button hover effect */
button:hover {
  background-color: #f0f0f0 !important;
  color: #333 !important;
}
</style>
