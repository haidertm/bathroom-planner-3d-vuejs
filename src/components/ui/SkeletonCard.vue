<template>
  <div
    :style="cardStyle"
    class="skeleton-card"
    role="status"
    aria-busy="true"
    aria-label="Loading content"
  >
    <!-- Skeleton Image -->
    <div :style="imageStyle" aria-hidden="true">
      <div :style="shimmerStyle"></div>
    </div>

    <!-- Skeleton Content -->
    <div :style="contentStyle" aria-hidden="true">
      <div :style="lineStyle"></div>
      <div :style="lineStyle"></div>
      <div :style="lineStyle"></div>
      <div :style="lineStyle"></div>
      <div :style="buttonStyle"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useIsMobile } from '../../composables/useIsMobile'

const isMobileDevice = useIsMobile()

const cardStyle = computed(() => ({
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '20px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: isMobileDevice.value ? 'column' : 'row',
  gap: '15px',
  position: 'relative',
  overflow: 'hidden'
}))

const imageStyle = computed(() => ({
  width: isMobileDevice.value ? '100%' : '200px',
  height: '150px',
  backgroundColor: '#f0f0f0',
  borderRadius: '8px',
  position: 'relative',
  overflow: 'hidden'
}))

const shimmerStyle = computed(() => ({
  position: 'absolute',
  top: '0',
  left: '-100%',
  width: '100%',
  height: '100%',
  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
  animation: 'shimmer 1.5s infinite'
}))

const contentStyle = computed(() => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
}))

const lineStyle = computed(() => ({
  height: '20px',
  backgroundColor: '#f0f0f0',
  borderRadius: '6px',
  width: isMobileDevice.value ? '70%' : '90%',
  marginTop: '8px'
}))

const buttonStyle = computed(() => ({
  height: '36px',
  backgroundColor: '#f0f0f0',
  borderRadius: '4px',
  width: '135px',
  marginTop: '8px'
}))
</script>

<style scoped>
@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}
</style>
