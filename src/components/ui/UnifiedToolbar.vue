<template>
  <div class="unified-toolbar" :style="toolbarStyle">
    <!-- Undo/Redo Section -->
    <div class="toolbar-section">
      <div
        class="btn-wrapper"
        @mouseenter="showUndoTooltip = true"
        @mouseleave="showUndoTooltip = false"
      >
        <div v-if="showUndoTooltip" class="dark-tooltip">Undo</div>
        <button
          class="toolbar-btn"
          :class="{ disabled: !canUndo }"
          :disabled="!canUndo"
          @click="$emit('undo')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7v6h6"/>
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
          </svg>
        </button>
      </div>
      <div
        class="btn-wrapper"
        @mouseenter="showRedoTooltip = true"
        @mouseleave="showRedoTooltip = false"
      >
        <div v-if="showRedoTooltip" class="dark-tooltip">Redo</div>
        <button
          class="toolbar-btn"
          :class="{ disabled: !canRedo }"
          :disabled="!canRedo"
          @click="$emit('redo')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 7v6h-6"/>
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="toolbar-divider"></div>

    <!-- 2D/3D Toggle Section -->
    <div
      class="toolbar-section view-toggle-section"
      @mouseenter="showViewModeTooltip = true"
      @mouseleave="showViewModeTooltip = false"
    >
      <div v-if="showViewModeTooltip" class="view-mode-tooltip">
        {{ viewMode === '2d' ? 'Switch to 3D view' : 'Switch to 2D Blueprint view' }}
      </div>
      <div class="view-toggle">
        <div class="view-toggle-slider" :class="{ 'is-3d': viewMode === '3d' }"></div>
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === '2d' }"
          @click="$emit('update:viewMode', '2d')"
        >
          2D
        </button>
        <button
          class="view-toggle-btn"
          :class="{ active: viewMode === '3d' }"
          @click="$emit('update:viewMode', '3d')"
        >
          3D
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="toolbar-divider"></div>

    <!-- Measurement Toggle -->
    <div class="toolbar-section">
      <div
        class="btn-wrapper"
        @mouseenter="showMeasurementTooltip = true"
        @mouseleave="showMeasurementTooltip = false"
      >
        <div v-if="showMeasurementTooltip" class="dark-tooltip">Toggle Measurements</div>
        <button
          class="toolbar-btn"
          :class="{ active: measurementEnabled }"
          @click="$emit('update:measurementEnabled', !measurementEnabled)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z"/>
            <path d="m14.5 12.5 2-2"/>
            <path d="m11.5 9.5 2-2"/>
            <path d="m8.5 6.5 2-2"/>
            <path d="m17.5 15.5 2-2"/>
          </svg>
        </button>
      </div>
    </div>
    <!-- Divider -->
    <div class="toolbar-divider"></div>
    <!-- Multi-select Toggle -->
    <div class="toolbar-section">
      <div
        class="btn-wrapper"
        @mouseenter="showMultiselectTooltip = true"
        @mouseleave="showMultiselectTooltip = false"
      >
        <div v-if="showMultiselectTooltip" class="dark-tooltip">{{ multiSelectEnabled ? 'Disable Multi-select' : 'Enable Multi-select' }}</div>
        <button
          class="toolbar-btn with-label"
          :class="{ active: multiSelectEnabled }"
          @click="$emit('update:multiSelectEnabled', !multiSelectEnabled)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="6" width="14" height="14" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
            <rect x="4" y="4" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2" :fill="multiSelectEnabled ? '#29275b' : 'white'"/>
          </svg>
          <span class="btn-label">Multi-select</span>
        </button>
      </div>
    </div>

    <!-- Divider -->
    <div class="toolbar-divider"></div>

    <!-- Delete Button -->
    <div
      class="toolbar-section delete-section"
      @mouseenter="showDeleteTooltip = true"
      @mouseleave="showDeleteTooltip = false"
    >
      <div v-if="showDeleteTooltip && !hasSelectedItem" class="delete-tooltip" @click="handleClearAll">
        Clear All Objects
      </div>
      <button
        class="toolbar-btn delete-btn"
        @click="handleDeleteClick"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>
    <!-- Divider -->
    <div class="toolbar-divider"></div>
    <!-- Instructions Button -->
    <div class="toolbar-section">
      <div
        class="btn-wrapper"
        @mouseenter="showInstructionsTooltip = true"
        @mouseleave="showInstructionsTooltip = false"
      >
        <div v-if="showInstructionsTooltip" class="dark-tooltip">Read Instructions</div>
        <button
          class="toolbar-btn instructions-btn"
          @click="$emit('show-instructions')"
        >
          <span class="emoji-icon">📖</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { isMobile } from '../../utils/helpers'
import type { ViewMode } from '../../constants/camera'

// Props
const props = defineProps<{
  canUndo: boolean
  canRedo: boolean
  viewMode: ViewMode
  measurementEnabled: boolean
  multiSelectEnabled: boolean
  hasSelectedItem?: boolean
  sidebarWidth?: number
}>()

// Emits
const emit = defineEmits<{
  (e: 'undo'): void
  (e: 'redo'): void
  (e: 'update:viewMode', value: ViewMode): void
  (e: 'update:measurementEnabled', value: boolean): void
  (e: 'update:multiSelectEnabled', value: boolean): void
  (e: 'delete'): void
  (e: 'clear'): void
  (e: 'show-instructions'): void
}>()

// Tooltips on hover
const showDeleteTooltip = ref(false)
const showViewModeTooltip = ref(false)
const showUndoTooltip = ref(false)
const showRedoTooltip = ref(false)
const showMeasurementTooltip = ref(false)
const showMultiselectTooltip = ref(false)
const showInstructionsTooltip = ref(false)

// Computed
const isMobileDevice = computed(() => isMobile())

const toolbarStyle = computed(() => {
  // Calculate center position relative to canvas area (accounting for sidebar)
  const sidebarOffset = props.sidebarWidth || 0
  const canvasCenter = sidebarOffset + (window.innerWidth - sidebarOffset) / 2

  return {
    '--toolbar-padding': isMobileDevice.value ? '6px 10px' : '8px 12px',
    '--btn-size': isMobileDevice.value ? '36px' : '40px',
    '--icon-size': isMobileDevice.value ? '18px' : '20px',
    left: isMobileDevice.value ? '50%' : `${canvasCenter}px`,
    transform: 'translateX(-50%)',
    bottom: isMobileDevice.value ? '70px' : '20px'
  }
})

// Methods
const handleDeleteClick = () => {
  if (props.hasSelectedItem) {
    emit('delete')
  } else {
    // Clear all objects when clicking the button directly
    emit('clear')
  }
}

const handleClearAll = () => {
  emit('clear')
}
</script>

<style scoped>
.unified-toolbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: var(--toolbar-padding, 8px 12px);
  background-color: rgba(255, 255, 255, 0.98);
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Dark tooltip style for most buttons */
.dark-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  margin-bottom: 8px;
  z-index: 1001;
  animation: tooltipFadeIn 0.2s ease-out;
}

.dark-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: rgba(0, 0, 0, 0.1);
  margin: 0 6px;
}

.toolbar-btn {
  width: var(--btn-size, 40px);
  height: var(--btn-size, 40px);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  cursor: pointer;
  color: #555;
  transition: all 0.2s ease;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.05);
}

.toolbar-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.toolbar-btn.active {
  background-color: #29275b;
  color: white;
}

.toolbar-btn.active:hover {
  background-color: #1e1b47;
}

.toolbar-btn.disabled,
.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.with-label {
  width: auto;
  padding: 0 14px;
  gap: 6px;
}

.btn-label {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.toolbar-btn svg {
  width: var(--icon-size, 20px);
  height: var(--icon-size, 20px);
  flex-shrink: 0;
}

.emoji-icon {
  font-size: 18px;
  line-height: 1;
}

/* View Toggle with sliding animation */
.view-toggle {
  display: flex;
  align-items: center;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  padding: 3px;
  position: relative;
}

.view-toggle-slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(50% - 3px);
  height: calc(100% - 6px);
  background-color: #29275b;
  border-radius: 6px;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.view-toggle-slider.is-3d {
  transform: translateX(100%);
}

.view-toggle-btn {
  padding: 8px 14px;
  border: none;
  background-color: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  transition: color 0.2s ease;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  z-index: 1;
}

.view-toggle-btn.active {
  color: white;
}

.view-toggle-btn:hover:not(.active) {
  color: #333;
}

/* View toggle section and tooltip */
.view-toggle-section {
  position: relative;
}

.view-mode-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  margin-bottom: 8px;
  z-index: 1001;
  animation: tooltipFadeIn 0.2s ease-out;
}

.view-mode-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}

/* Delete button special styling */
.delete-section {
  position: relative;
}

.delete-btn:hover:not(:disabled) {
  background-color: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

/* Delete tooltip - red/orange style */
.delete-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(231, 76, 60, 0.9);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  margin-bottom: 8px;
  z-index: 1001;
  animation: tooltipFadeIn 0.2s ease-out;
}

.delete-tooltip:hover {
  background-color: rgba(200, 60, 50, 0.95);
}

/* Tooltip arrow */
.delete-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-top-color: rgba(231, 76, 60, 0.9);
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Focus styles for accessibility */
.toolbar-btn:focus-visible,
.view-toggle-btn:focus-visible {
  outline: 2px solid #29275b;
  outline-offset: 2px;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .unified-toolbar {
    bottom: 70px;
    gap: 2px;
    padding: 6px 8px;
    max-width: calc(100vw - 24px);
    border-radius: 20px;
  }

  .toolbar-section {
    gap: 2px;
  }

  .toolbar-divider {
    height: 18px;
    margin: 0 3px;
  }

  .toolbar-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .toolbar-btn svg {
    width: 16px;
    height: 16px;
  }

  /* Hide label on mobile, show only icon */
  .toolbar-btn.with-label {
    width: 32px;
    padding: 0;
  }

  .btn-label {
    display: none;
  }

  .view-toggle {
    border-radius: 8px;
    padding: 2px;
  }

  .view-toggle-btn {
    padding: 5px 8px;
    font-size: 11px;
  }

  .view-toggle-slider {
    border-radius: 5px;
    top: 2px;
    left: 2px;
    width: calc(50% - 2px);
    height: calc(100% - 4px);
  }

  .emoji-icon {
    font-size: 14px;
  }
}
</style>