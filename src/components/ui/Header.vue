<template>
  <header :style="headerStyle">
    <div :style="logoContainerStyle">
      <img v-if="logo" :src="logo" :alt="logoAlt" :style="logoStyle" />
      <span v-else :style="titleStyle">{{ title }}</span>
    </div>

    <div :style="navStyle">
      <!-- Hamburger Menu for BOTH desktop and mobile -->
      <div :style="hamburgerNavStyle" data-menu-container>
        <button
            @click="toggleMenu"
            :style="hamburgerButtonStyle"
            @mouseenter="e => e.target.style.backgroundColor = '#f0f0f0'"
            @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
            title="Menu"
        >
          ☰
        </button>

        <!-- Dropdown Menu -->
        <div v-if="showMenu" :style="menuStyle">
          <template v-if="$route.name === 'Planner'">
            <button
                @click="handleSaveDesign"
                :style="menuItemStyle"
                class="menu-item"
            >
              💾 Save Design
            </button>
            <router-link
                to="/my-designs"
                :style="menuItemStyle"
                @click="closeMenu"
                class="menu-item"
            >
              📁 My Designs
            </router-link>
          </template>
          <template v-else-if="$route.name === 'MyDesigns'">
            <router-link
                to="/planner"
                :style="menuItemStyle"
                @click="closeMenu"
                class="menu-item"
            >
              🏠 Planner
            </router-link>
            <router-link
                to="/"
                :style="menuItemStyle"
                @click="closeMenu"
                class="menu-item"
            >
              🔙 Room Shapes
            </router-link>
          </template>
          <template v-else-if="$route.name === 'RoomShapeSelector'">
            <router-link
                to="/planner"
                :style="menuItemStyle"
                @click="closeMenu"
                class="menu-item"
            >
              🏠 Planner
            </router-link>
            <router-link
                to="/my-designs"
                :style="menuItemStyle"
                @click="closeMenu"
                class="menu-item"
            >
              📁 My Designs
            </router-link>
          </template>
          <template v-else>
            <router-link
                to="/"
                :style="menuItemStyle"
                @click="closeMenu"
                class="menu-item"
            >
              🔙 Room Shapes
            </router-link>
            <router-link
                to="/planner"
                :style="menuItemStyle"
                @click="closeMenu"
                class="menu-item"
            >
              🏠 Planner
            </router-link>
            <router-link
                to="/my-designs"
                :style="menuItemStyle"
                @click="closeMenu"
                class="menu-item"
            >
              📁 My Designs
            </router-link>
          </template>
        </div>
      </div>
    </div>

    <!-- Menu Overlay -->
    <div v-if="showMenu" :style="overlayStyle" @click="closeMenu"></div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'

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

// Define emits
const emit = defineEmits(['save-design'])

// Menu state
const showMenu = ref(false)

// Check if device is mobile for responsive styling
const isMobile = ref(false)

const checkIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
}

// Menu functions
const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const handleSaveDesign = () => {
  emit('save-design')
  closeMenu()
}

// Close menu when clicking outside
const handleClickOutside = (event) => {
  const menuContainer = event.target.closest('[data-menu-container]')
  if (!menuContainer && showMenu.value) {
    closeMenu()
  }
}

// Close menu on escape key
const handleKeydown = (event) => {
  if (event.key === 'Escape' && showMenu.value) {
    closeMenu()
  }
}

// Lifecycle
onMounted(() => {
  checkIsMobile()
  window.addEventListener('resize', checkIsMobile)
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkIsMobile)
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})

// Styles
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
  fontSize: isMobile.value ? '18px' : '20px',
  fontWeight: 'bold',
  color: '#333',
  margin: '0'
}))

const navStyle = computed(() => ({
  display: 'flex',
  alignItems: 'center'
}))

const hamburgerNavStyle = computed(() => ({
  position: 'relative'
}))

const hamburgerButtonStyle = computed(() => ({
  padding: '10px 12px',
  backgroundColor: 'transparent',
  color: '#29275B',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  transition: 'all 0.2s ease',
  fontSize: '18px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '44px',
  height: '40px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
}))

const menuStyle = computed(() => ({
  position: 'absolute',
  top: '50px',
  right: '0',
  backgroundColor: 'white',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
  padding: '8px 0',
  minWidth: isMobile.value ? '180px' : '200px',
  zIndex: 1002,
  animation: 'fadeIn 0.2s ease-out'
}))

const menuItemStyle = computed(() => ({
  display: 'block',
  width: '100%',
  padding: '12px 20px',
  backgroundColor: 'transparent',
  color: '#333',
  textDecoration: 'none',
  border: 'none',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background-color 0.2s ease',
  whiteSpace: 'nowrap'
}))

const overlayStyle = computed(() => ({
  position: 'fixed',
  top: '60px',
  left: '0',
  right: '0',
  bottom: '0',
  backgroundColor: 'transparent',
  zIndex: 1001
}))
</script>

<style scoped>
/* Menu item hover effects */
.menu-item:hover {
  background-color: #f8f9fa !important;
}

/* Hamburger button hover effect */
button:hover {
  background-color: #f0f0f0 !important;
  border-color: #29275B !important;
}

/* Menu animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Add data attribute for click outside detection */
[data-menu-container] {
  position: relative;
}
</style>