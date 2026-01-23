// Toast Notification Composable
import { ref, readonly } from 'vue';
import type { Toast, ToastType } from '../types/admin';

// Global state - shared across all components
const toasts = ref<Toast[]>([]);
let toastId = 0;

// Default durations by type (in milliseconds)
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

// Maximum number of toasts to display at once
const MAX_TOASTS = 5;

export function useToast() {
  /**
   * Add a new toast notification
   */
  const addToast = (
    type: ToastType,
    message: string,
    duration?: number
  ): number => {
    const id = ++toastId;
    const toast: Toast = {
      id,
      type,
      message,
      duration: duration ?? DEFAULT_DURATIONS[type],
    };

    // Add new toast
    toasts.value.push(toast);

    // Remove oldest toast if exceeding max
    if (toasts.value.length > MAX_TOASTS) {
      toasts.value.shift();
    }

    return id;
  };

  /**
   * Remove a toast by ID
   */
  const removeToast = (id: number): void => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  };

  /**
   * Clear all toasts
   */
  const clearAll = (): void => {
    toasts.value = [];
  };

  // Convenience methods for each toast type
  const success = (message: string, duration?: number): number => {
    return addToast('success', message, duration);
  };

  const error = (message: string, duration?: number): number => {
    return addToast('error', message, duration);
  };

  const warning = (message: string, duration?: number): number => {
    return addToast('warning', message, duration);
  };

  const info = (message: string, duration?: number): number => {
    return addToast('info', message, duration);
  };

  return {
    // State (readonly for external access)
    toasts: readonly(toasts),

    // Core methods
    addToast,
    removeToast,
    clearAll,

    // Convenience methods
    success,
    error,
    warning,
    info,
  };
}
