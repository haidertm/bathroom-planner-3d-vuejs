<template>
  <div class="search-section" v-if="visible">
    <div class="search-container">
      <!-- Search Icon -->
      <div class="search-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
      </div>

      <!-- Search Input -->
      <input
          ref="inputRef"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          @keydown.enter="$emit('search')"
          @focus="$emit('focus')"
          @blur="$emit('blur')"
          type="text"
          :placeholder="placeholder"
          aria-label="Search products by name or SKU"
          class="search-input"
          autocomplete="off"
      />

      <!-- Clear Button -->
      <button
          v-if="modelValue"
          @click="$emit('clear')"
          class="clear-button"
          type="button"
          aria-label="Clear search"
          title="Clear search"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- Loading Indicator -->
      <div v-if="isSearching" class="search-loading">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32">
            <animate attributeName="stroke-dashoffset" dur="1s" values="32;0" repeatCount="indefinite"/>
          </circle>
        </svg>
      </div>
    </div>

    <!-- Search Tips -->
    <div v-if="!modelValue && showTips" class="search-tips">
      <div class="search-tips__text">
        Try product names or SKU codes
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Search by name or SKU...'
  },
  isSearching: {
    type: Boolean,
    default: false
  },
  showTips: {
    type: Boolean,
    default: false
  },
  visible: {
    type: Boolean,
    default: true
  }
})

defineEmits(['update:modelValue', 'search', 'clear', 'focus', 'blur'])

const inputRef = ref(null)

defineExpose({
  focus: () => inputRef.value?.focus()
})
</script>

<style scoped>
.search-section {
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background-color: #ffffff;
  position: absolute;
  top: 60px;
  left: 0;
  width: 480px;
  max-width: 500px;
  z-index: 2000;
  box-sizing: border-box;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
  background-color: #f8fafc;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.search-container:focus-within {
  border-color: #29275B;
  box-shadow: 0 0 0 4px rgba(41, 39, 91, 0.1), 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.search-icon {
  padding: 12px 16px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: color 0.2s ease;
}

.search-container:focus-within .search-icon {
  color: #29275B;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  background-color: transparent;
  padding: 12px 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  font-family: Arial, sans-serif;
  min-width: 0;
}

.search-input::placeholder {
  color: #9ca3af;
}

.clear-button {
  padding: 8px 12px;
  background-color: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.clear-button:hover {
  color: #6b7280;
  background-color: #f3f4f6;
}

.search-loading {
  padding: 8px 12px;
  color: #29275B;
  display: flex;
  align-items: center;
}

.search-tips {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #f8fafc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.search-tips__text {
  font-size: 11px;
  color: #9ca3af;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .search-section {
    position: fixed;
    top: 60px;
    width: 100vw;
    max-width: 100vw;
    z-index: 2000;
  }

  .search-input {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
</style>
