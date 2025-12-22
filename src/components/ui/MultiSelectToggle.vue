<template>
  <button
    :class="['multi-select-toggle', { active: modelValue }]"
    @click="toggleMultiSelect"
    :title="modelValue ? 'Exit Multi-Select Mode' : 'Enable Multi-Select Mode'"
  >
    <div class="icon-container">
      <svg 
        v-if="!modelValue" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <!-- Multiple squares icon -->
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      <svg 
        v-else 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        stroke-width="2"
      >
        <!-- Checkmark icon when active -->
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <span class="label">{{ modelValue ? 'Multi-Select ON' : 'Multi-Select' }}</span>
    <div v-if="selectedCount > 0" class="badge">{{ selectedCount }}</div>
  </button>
</template>

<script setup>

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  selectedCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'toggle'])

const toggleMultiSelect = () => {
  const newValue = !props.modelValue
  emit('update:modelValue', newValue)
  emit('toggle', newValue)
}
</script>

<style scoped>
.multi-select-toggle {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.multi-select-toggle:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.multi-select-toggle:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.multi-select-toggle.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.multi-select-toggle.active:hover {
  background: linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
}

.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.label {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  letter-spacing: 0.3px;
}

.badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  background: #ff6b6b;
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  animation: pulse 0.3s ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .multi-select-toggle {
    bottom: 80px; /* Move up to avoid overlap with other mobile controls */
    right: 16px;
    padding: 10px 16px;
    font-size: 13px;
  }
  
  .icon-container {
    width: 20px;
    height: 20px;
  }
  
  .icon-container svg {
    width: 20px;
    height: 20px;
  }
}

/* Touch-friendly sizing for tablets */
@media (min-width: 769px) and (max-width: 1024px) {
  .multi-select-toggle {
    padding: 14px 22px;
    font-size: 15px;
  }
}

/* Animation for entering/exiting */
.multi-select-toggle {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
