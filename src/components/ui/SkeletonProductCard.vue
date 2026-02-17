<template>
  <div class="skeleton-card" :class="{ 'skeleton-card--mobile': isMobile }">
    <!-- Skeleton Image -->
    <div class="skeleton-card__image">
      <div class="skeleton-card__shimmer"></div>
    </div>

    <!-- Skeleton Content -->
    <div class="skeleton-card__content">
      <div class="skeleton-card__line"></div>
      <div class="skeleton-card__line"></div>
      <div class="skeleton-card__line"></div>
      <div class="skeleton-card__line"></div>
      <div class="skeleton-card__button"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isMobile as isMobileUtil } from '../../utils/helpers.js'

const isMobile = computed(() => isMobileUtil())
</script>

<style scoped>
.skeleton-card {
  background-color: #ffffff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 15px;
  position: relative;
  overflow: hidden;
}

.skeleton-card--mobile {
  flex-direction: column;
}

.skeleton-card__image {
  width: 200px;
  height: 150px;
  background-color: #f0f0f0;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.skeleton-card--mobile .skeleton-card__image {
  width: 100%;
}

.skeleton-card__shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 1.5s infinite;
}

.skeleton-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card__line {
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 6px;
  width: 90%;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
}

.skeleton-card--mobile .skeleton-card__line {
  width: 70%;
}

.skeleton-card__line::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 1.5s infinite;
}

.skeleton-card__button {
  height: 36px;
  background-color: #f0f0f0;
  border-radius: 4px;
  width: 135px;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
}

.skeleton-card__button::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}
</style>
