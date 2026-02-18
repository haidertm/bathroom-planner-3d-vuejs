<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { ToastType } from '../../types/admin';

const props = defineProps<{
  id: number;
  type: ToastType;
  message: string;
  duration: number;
}>();

const emit = defineEmits<{
  (e: 'close', id: number): void;
}>();

const isVisible = ref(false);
const isLeaving = ref(false);
let timeoutId: ReturnType<typeof setTimeout> | null = null;

const iconPath = computed(() => {
  switch (props.type) {
    case 'success':
      return 'M20 6L9 17l-5-5';
    case 'error':
      return 'M18 6L6 18M6 6l12 12';
    case 'warning':
      return 'M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    case 'info':
    default:
      return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
});

const close = () => {
  isLeaving.value = true;
  setTimeout(() => {
    emit('close', props.id);
  }, 300);
};

onMounted(() => {
  // Trigger enter animation
  requestAnimationFrame(() => {
    isVisible.value = true;
  });

  // Auto-close after duration
  if (props.duration > 0) {
    timeoutId = setTimeout(close, props.duration);
  }
});

onUnmounted(() => {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
});
</script>

<template>
  <div
    class="toast"
    :class="[`toast--${type}`, { 'toast--visible': isVisible, 'toast--leaving': isLeaving }]"
    role="alert"
    aria-live="polite"
  >
    <div class="toast__icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path :d="iconPath" />
      </svg>
    </div>
    <p class="toast__message">{{ message }}</p>
    <button @click="close" class="toast__close" aria-label="Close notification">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.toast {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background-color: #ffffff;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 320px;
  max-width: 450px;
  transform: translateX(120%);
  opacity: 0;
  transition: transform 0.3s ease, opacity 0.3s ease;
  pointer-events: auto;
}

.toast--visible {
  transform: translateX(0);
  opacity: 1;
}

.toast--leaving {
  transform: translateX(120%);
  opacity: 0;
}

.toast__icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast--success .toast__icon {
  background-color: #dcfce7;
  color: #16a34a;
}

.toast--error .toast__icon {
  background-color: #fee2e2;
  color: #dc2626;
}

.toast--warning .toast__icon {
  background-color: #fef3c7;
  color: #d97706;
}

.toast--info .toast__icon {
  background-color: #dbeafe;
  color: #2563eb;
}

.toast__message {
  flex: 1;
  font-size: 14px;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
}

.toast__close {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
}

.toast__close:hover {
  color: #4b5563;
  background-color: #f3f4f6;
}

/* Mobile styles */
@media (max-width: 480px) {
  .toast {
    min-width: calc(100vw - 32px);
    max-width: calc(100vw - 32px);
  }
}
</style>
