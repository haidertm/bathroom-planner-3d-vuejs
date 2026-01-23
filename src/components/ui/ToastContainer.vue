<script setup lang="ts">
import { useToast } from '../../composables/useToast';
import Toast from './Toast.vue';

const { toasts, removeToast } = useToast();
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-label="Notifications">
      <TransitionGroup name="toast-list">
        <Toast
          v-for="toast in toasts"
          :key="toast.id"
          :id="toast.id"
          :type="toast.type"
          :message="toast.message"
          :duration="toast.duration"
          @close="removeToast"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  pointer-events: none;
}

/* TransitionGroup animations */
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all 0.3s ease;
}

.toast-list-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-list-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-list-move {
  transition: transform 0.3s ease;
}

/* Mobile styles */
@media (max-width: 480px) {
  .toast-container {
    top: 16px;
    right: 16px;
    left: 16px;
  }
}
</style>
