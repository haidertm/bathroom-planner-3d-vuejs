<template>
    <div :style="panelStyle">
      <div :style="sectionStyle">
        <h4 :style="titleStyle">Floor Texture</h4>
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
        <h4 :style="titleStyle">Wall Texture</h4>
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
  const emit = defineEmits(['floor-change', 'wall-change'])
  
  // Computed
  const isMobileDevice = computed(() => isMobile())
  
  const panelStyle = computed(() => ({
    position: 'absolute',
    top: isMobileDevice.value ? '80px' : '70px',
    right: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    minWidth: isMobileDevice.value ? '280px' : '320px',
    maxWidth: isMobileDevice.value ? '90vw' : '350px',
    zIndex: 1000,
    backdropFilter: 'blur(10px)',
    maxHeight: isMobileDevice.value ? '60vh' : '70vh',
    overflowY: 'auto'
  }))
  
  const sectionStyle = computed(() => ({
    marginBottom: '20px'
  }))
  
  const titleStyle = computed(() => ({
    margin: '0 0 10px 0',
    fontSize: isMobileDevice.value ? '14px' : '16px',
    fontWeight: 'bold',
    color: '#333'
  }))
  
  const textureGridStyle = computed(() => ({
    display: 'grid',
    gridTemplateColumns: isMobileDevice.value ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
    gap: '8px'
  }))
  
  const textureLabelStyle = computed(() => ({
    fontSize: isMobileDevice.value ? '10px' : '12px',
    color: '#666',
    textAlign: 'center',
    marginTop: '4px',
    lineHeight: '1.2'
  }))
  
  // Methods
  const getTextureButtonStyle = (texture, isActive) => ({
    padding: '8px',
    border: isActive ? '2px solid #4CAF50' : '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: isActive ? '#f0f8f0' : '#fff',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minHeight: '60px'
  })
  
  const getTexturePreviewStyle = (texture) => ({
    width: '100%',
    height: '30px',
    backgroundColor: `#${texture.color.toString(16).padStart(6, '0')}`,
    borderRadius: '2px',
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