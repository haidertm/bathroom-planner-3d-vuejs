<template>
  <div class="filter-dropdown" ref="dropdownRef">
    <button
      ref="triggerRef"
      class="filter-trigger"
      :class="{ 'is-active': selected.length > 0 || isOpen }"
      @click="toggleDropdown"
    >
      <span class="filter-label">{{ label }}</span>
      <span class="filter-arrow">&#9662;</span>
    </button>

    <!-- Teleport dropdown menu to body to avoid overflow clipping -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="filter-dropdown-menu"
        :style="dropdownMenuStyle"
        ref="menuRef"
      >
        <!-- Search Input -->
        <div class="filter-search">
          <input
            type="text"
            v-model="searchQuery"
            :placeholder="`Search ${label}`"
            class="filter-search-input"
            ref="searchInputRef"
          />
        </div>

        <!-- Options List -->
        <div class="filter-options">
          <label
            v-for="option in filteredOptions"
            :key="option.value"
            class="filter-option"
          >
            <input
              type="checkbox"
              :checked="isSelected(option.value)"
              @change="toggleOption(option.value)"
              class="filter-checkbox"
            />
            <span class="filter-option-label">{{ option.label }}</span>
          </label>

          <!-- No results message -->
          <div v-if="filteredOptions.length === 0" class="filter-no-results">
            No options found
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useGtm } from '@gtm-support/vue-gtm'

const gtm = useGtm()

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  options: {
    type: Array,
    default: () => []
  },
  selected: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update'])

const isOpen = ref(false)
const searchQuery = ref('')
const dropdownRef = ref(null)
const triggerRef = ref(null)
const menuRef = ref(null)
const searchInputRef = ref(null)

// Dropdown menu position
const menuPosition = ref({ top: 0, left: 0 })

const dropdownMenuStyle = computed(() => ({
  position: 'fixed',
  top: `${menuPosition.value.top}px`,
  left: `${menuPosition.value.left}px`,
  zIndex: 2100
}))

// Filter options based on search query
const filteredOptions = computed(() => {
  if (!searchQuery.value.trim()) {
    return props.options
  }
  const query = searchQuery.value.toLowerCase().trim()
  return props.options.filter(option =>
    option.label.toLowerCase().includes(query)
  )
})

const updateMenuPosition = () => {
  if (triggerRef.value) {
    const rect = triggerRef.value.getBoundingClientRect()
    menuPosition.value = {
      top: rect.bottom + 4,
      left: rect.left
    }
  }
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    updateMenuPosition()
    // Focus search input when dropdown opens
    nextTick(() => {
      searchInputRef.value?.focus()
    })
    // Track dropdown opened event
    if (gtm?.enabled()) {
      gtm.trackEvent({
        event: 'filter_interaction',
        category: 'Filter',
        action: 'dropdown_opened',
        label: props.label ?? 'filter'
      })
    }
  }
}

const closeDropdown = () => {
  isOpen.value = false
  searchQuery.value = ''
}

const isSelected = (value) => {
  return props.selected.includes(value)
}

const toggleOption = (value) => {
  const newSelected = [...props.selected]
  const index = newSelected.indexOf(value)
  if (index === -1) {
    newSelected.push(value)
  } else {
    newSelected.splice(index, 1)
  }
  // Track option selected event
  if (gtm?.enabled()) {
    gtm.trackEvent({
      event: 'filter_interaction',
      category: 'Filter',
      action: 'option_selected',
      label: String(value)
    })
  }
  // Emit immediately for real-time filtering
  emit('update', newSelected)
  // Close dropdown after selection
  closeDropdown()
}

// Click outside to close
const handleClickOutside = (event) => {
  const clickedTrigger = triggerRef.value && triggerRef.value.contains(event.target)
  const clickedMenu = menuRef.value && menuRef.value.contains(event.target)

  if (!clickedTrigger && !clickedMenu) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.filter-dropdown {
  position: relative;
  display: inline-block;
  flex-shrink: 0; /* Don't shrink in flex container */
}

.filter-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 20px; /* Pill shape */
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: Arial, sans-serif;
  white-space: nowrap;
}

.filter-trigger:hover {
  border-color: #9ca3af;
}

.filter-trigger.is-active {
  background-color: #29275B;
  border-color: #29275B;
  color: #ffffff;
}

.filter-label {
  white-space: nowrap;
}

.filter-arrow {
  font-size: 10px;
  margin-left: 2px;
}
</style>

<style>
/* Global styles for teleported dropdown menu */
.filter-dropdown-menu {
  min-width: 200px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.filter-search {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.filter-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  font-family: Arial, sans-serif;
  outline: none;
  box-sizing: border-box;
}

.filter-search-input:focus {
  border-color: #29275B;
  box-shadow: 0 0 0 2px rgba(41, 39, 91, 0.1);
}

.filter-search-input::placeholder {
  color: #9ca3af;
}

.filter-options {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px 0;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background-color 0.1s ease;
  font-family: Arial, sans-serif;
}

.filter-option:hover {
  background-color: #f9fafb;
}

.filter-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #29275B;
  cursor: pointer;
  flex-shrink: 0;
}

.filter-option-label {
  font-size: 14px;
  color: #374151;
}

.filter-no-results {
  padding: 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  font-family: Arial, sans-serif;
}

/* Scrollbar styling */
.filter-options::-webkit-scrollbar {
  width: 6px;
}

.filter-options::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.filter-options::-webkit-scrollbar-thumb {
  background: #c4c4c4;
  border-radius: 3px;
}

.filter-options::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
