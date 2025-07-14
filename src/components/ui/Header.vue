<template>
  <header :style="headerStyle">
    <div :style="logoContainerStyle">
      <img v-if="logo" :src="logo" :alt="logoAlt" :style="logoStyle" />
      <span v-else :style="titleStyle">{{ title }}</span>
    </div>
    <div :style="navStyle">
      <router-link
          v-if="$route.name === 'MyDesigns'"
          to="/"
          :style="navLinkStyle"
          @mouseenter="e => e.target.style.backgroundColor = '#f0f0f0'"
          @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
      >
        ← Back to Planner
      </router-link>
      <router-link
          v-else-if="$route.name === 'Home'"
          to="/my-designs"
          :style="navLinkStyle"
          @mouseenter="e => e.target.style.backgroundColor = '#f0f0f0'"
          @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
      >
        📁 My Designs
      </router-link>
      <div v-else :style="navLinkStyle">
        <router-link
            to="/"
            :style="{ ...navLinkStyle, marginRight: '10px' }"
            @mouseenter="e => e.target.style.backgroundColor = '#f0f0f0'"
            @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
        >
          🏠 Planner
        </router-link>
        <router-link
            to="/my-designs"
            :style="navLinkStyle"
            @mouseenter="e => e.target.style.backgroundColor = '#f0f0f0'"
            @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
        >
          📁 My Designs
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  logo: {
    type: String,
    default: null
  },
  logoAlt: {
    type: String,
    default: 'Logo'
  },
  logoHeight: {
    type: String,
    default: '40px'
  },
  title: {
    type: String,
    default: 'Bathroom Planner 3D'
  },
  backgroundColor: {
    type: String,
    default: '#fff'
  }
})

const headerStyle = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  right: '0',
  height: '60px',
  backgroundColor: props.backgroundColor,
  borderBottom: '1px solid #e0e0e0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  zIndex: 1001,
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
}))

const logoContainerStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center'
}))

const logoStyle = computed(() => ({
  height: props.logoHeight,
  width: 'auto'
}))

const titleStyle = computed(() => ({
  fontSize: '20px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0'
}))

const navStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '15px'
}))

const navLinkStyle = computed(() => ({
  padding: '8px 16px',
  backgroundColor: 'transparent',
  color: '#333',
  textDecoration: 'none',
  borderRadius: '4px',
  transition: 'background-color 0.2s',
  fontSize: '14px',
  fontWeight: '500'
}))
</script>

<style scoped>
/* Additional styles if needed */
</style>