<template>
  <header :style="headerStyle">
    <div :style="containerStyle">
      <!-- Logo Only -->
      <div :style="logoContainerStyle">
        <img
            v-if="logo"
            :src="logo"
            alt="Logo"
        />
        <div
            v-else
            :style="defaultLogoStyle"
        >
          ✓
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed, defineProps } from 'vue'

// Define props
const props = defineProps({
  logo: {
    type: String,
    default: null
  },
  backgroundColor: {
    type: String,
    default: '#4ade80'
  },
  logoHeight: {
    type: String,
    default: '40px'
  }
})

// Computed styles
const headerStyle = computed(() => ({
  backgroundColor: props.backgroundColor,
  padding: '12px 20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  position: 'relative',
  zIndex: 1000
}))

const containerStyle = computed(() => ({
  maxWidth: '1200px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start'
}))

const logoContainerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center'
}))


const defaultLogoStyle = computed(() => ({
  width: props.logoHeight,
  height: props.logoHeight,
  backgroundColor: '#ffffff',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '20px',
  fontWeight: 'bold',
  color: props.backgroundColor
}))
</script>

<style scoped>
/* Responsive adjustments */
@media (max-width: 768px) {
  header {
    padding: 10px 15px;
  }
}
</style>