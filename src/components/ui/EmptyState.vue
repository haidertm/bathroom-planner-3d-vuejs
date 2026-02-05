<template>
  <div :class="['empty-state', `empty-state--${size}`]">
    <!-- Icon slot or default icon -->
    <div v-if="showIcon" class="empty-state-icon">
      <slot name="icon">
        <svg :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
          <path d="M8 8l6 6"></path>
          <path d="M14 8l-6 6"></path>
        </svg>
      </slot>
    </div>

    <!-- Title (optional) -->
    <h3 v-if="title" class="empty-state-title">{{ title }}</h3>

    <!-- Message -->
    <p class="empty-state-message">{{ message }}</p>

    <!-- Action button (optional) -->
    <button v-if="showButton" type="button" class="empty-state-btn" @click="$emit('action')">
      {{ buttonText }}
    </button>

    <!-- Custom content slot -->
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  message: {
    type: String,
    default: 'No results found.'
  },
  title: {
    type: String,
    default: ''
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  showButton: {
    type: Boolean,
    default: false
  },
  buttonText: {
    type: String,
    default: 'Clear Filters'
  },
  size: {
    type: String,
    default: 'default', // 'compact', 'default', 'large'
    validator: (value) => ['compact', 'default', 'large'].includes(value)
  }
})

defineEmits(['action'])

const iconSize = computed(() => {
  switch (props.size) {
    case 'compact': return 32
    case 'large': return 80
    default: return 64
  }
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

/* Size variants */
.empty-state--compact {
  padding: 20px 16px;
  min-height: auto;
}

.empty-state--default {
  padding: 40px 20px;
  min-height: 200px;
}

.empty-state--large {
  padding: 60px 20px;
  min-height: 300px;
}

.empty-state-icon {
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state--compact .empty-state-icon {
  margin-bottom: 12px;
}

.empty-state-title {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
  font-family: Arial, sans-serif;
}

.empty-state--compact .empty-state-title {
  font-size: 14px;
}

.empty-state-message {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  margin: 0;
  font-family: Arial, sans-serif;
  line-height: 1.5;
}

.empty-state--large .empty-state-message {
  font-size: 16px;
}

.empty-state-btn {
  margin-top: 20px;
  padding: 12px 24px;
  background-color: #29275B;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  font-family: Arial, sans-serif;
  transition: background-color 0.15s ease;
}

.empty-state--compact .empty-state-btn {
  margin-top: 12px;
  padding: 8px 16px;
  font-size: 12px;
}

.empty-state-btn:hover {
  background-color: #1e1b47;
}
</style>
