<template>
  <button
      v-if="visible"
      @click="handleActivate"
      @touchstart.passive="isPressed = true"
      @touchend.passive="isPressed = false"
      @touchcancel.passive="isPressed = false"
      class="mobile-floating-button"
      :class="{ 'mobile-floating-button--pressed': isPressed }"
      :aria-label="ariaLabel"
  >
    <span class="mobile-floating-button__icon">+</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'
import { useGtm } from '@gtm-support/vue-gtm'

defineProps({
  visible: {
    type: Boolean,
    default: true
  },
  ariaLabel: {
    type: String,
    default: 'Open product menu'
  }
})

const emit = defineEmits(['click'])

const isPressed = ref(false)
const gtm = useGtm()

const handleActivate = () => {
  // Track sidebar open in GTM
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'sidebar_open',
      category: 'Navigation',
      action: 'Open Sidebar',
      source: 'mobile_fab'
    })
  }

  // Emit click event for parent handling
  emit('click')
}
</script>

<style scoped>
/* CSS custom properties for theming */
.mobile-floating-button {
  --color-primary: #29275B;
  --color-primary-hover: #3d3a7a;
  --color-text-on-primary: white;
  --shadow-elevation: 0 4px 12px rgba(0, 0, 0, 0.2);

  position: fixed;
  bottom: 130px;
  left: 16px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease, background-color 0.2s ease;
  transform: scale(1);
  font-size: 24px;
  font-weight: bold;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-elevation);
}

.mobile-floating-button--pressed {
  transform: scale(0.95);
}

.mobile-floating-button:hover {
  background-color: var(--color-primary-hover);
}

.mobile-floating-button__icon {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
}
</style>
