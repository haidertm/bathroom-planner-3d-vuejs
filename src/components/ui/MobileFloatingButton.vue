<template>
  <button
      v-if="visible"
      @click="$emit('click')"
      @touchstart="isPressed = true"
      @touchend="isPressed = false"
      class="mobile-floating-button"
      :class="{ 'mobile-floating-button--pressed': isPressed }"
      :aria-label="ariaLabel"
  >
    <span class="mobile-floating-button__icon">+</span>
  </button>
</template>

<script setup>
import { ref } from 'vue'

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

defineEmits(['click'])

const isPressed = ref(false)
</script>

<style scoped>
.mobile-floating-button {
  position: fixed;
  bottom: 130px;
  left: 16px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: #29275B;
  color: white;
  border: none;
  cursor: pointer;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  transform: scale(1);
  font-size: 24px;
  font-weight: bold;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.mobile-floating-button--pressed {
  transform: scale(0.95);
}

.mobile-floating-button:hover {
  background-color: #3d3a7a;
}

.mobile-floating-button__icon {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
}
</style>
