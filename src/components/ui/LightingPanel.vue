<!-- Create this as: src/components/ui/LightingPanel.vue -->
<template>
  <div :style="panelStyle">
    <!-- Header -->
    <div :style="headerStyle">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">💡</span>
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Lighting Controls</h3>
      </div>
      <button
          @click="$emit('close')"
          :style="closeButtonStyle"
          title="Close Lighting Panel"
          @mouseenter="e => e.target.style.backgroundColor = '#f0f0f0'"
          @mouseleave="e => e.target.style.backgroundColor = 'transparent'"
      >
        ✕
      </button>
    </div>

    <!-- Lighting Preset Selection -->
    <div :style="sectionStyle">
      <h4 :style="sectionTitleStyle">Lighting Style</h4>
      <div :style="presetGridStyle">
        <button
            v-for="preset in lightingPresets"
            :key="preset.value"
            @click="$emit('preset-change', preset.value)"
            :style="getPresetButtonStyle(preset.value)"
            :title="preset.description"
        >
          <span style="font-size: 16px; margin-bottom: 4px;">{{ preset.icon }}</span>
          <span style="font-size: 12px;">{{ preset.label }}</span>
        </button>
      </div>
    </div>

    <!-- Time of Day Selection -->
    <div :style="sectionStyle">
      <h4 :style="sectionTitleStyle">Time of Day</h4>
      <div :style="timeGridStyle">
        <button
            v-for="time in timeOfDayOptions"
            :key="time.value"
            @click="$emit('time-change', time.value)"
            :style="getTimeButtonStyle(time.value)"
            :title="time.description"
        >
          <span style="font-size: 14px; margin-bottom: 2px;">{{ time.icon }}</span>
          <span style="font-size: 11px;">{{ time.label }}</span>
        </button>
      </div>
    </div>

    <!-- Intensity Control -->
    <div :style="sectionStyle">
      <h4 :style="sectionTitleStyle">
        Brightness: {{ Math.round(lightingInfo.intensity * 100) }}%
      </h4>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 12px; color: #666;">🔅</span>
        <input
            type="range"
            :value="lightingInfo.intensity"
            @input="$emit('intensity-change', parseFloat($event.target.value))"
            min="0.1"
            max="3.0"
            step="0.1"
            :style="sliderStyle"
        />
        <span style="font-size: 12px; color: #666;">🔆</span>
      </div>
    </div>

    <!-- Shadows Toggle -->
    <div :style="sectionStyle">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h4 :style="sectionTitleStyle">Shadows</h4>
        <label :style="toggleLabelStyle">
          <input
              type="checkbox"
              :checked="lightingInfo.shadowsEnabled"
              @change="$emit('shadows-toggle', $event.target.checked)"
              :style="checkboxStyle"
          />
          <span :style="checkboxCustomStyle">
            <div :style="toggleDotStyle"></div>
          </span>
        </label>
      </div>
      <p style="font-size: 11px; color: #666; margin: 4px 0 0 0;">
        Realistic shadows (may impact performance)
      </p>
    </div>

    <!-- Quick Actions -->
    <div :style="sectionStyle">
      <h4 :style="sectionTitleStyle">Quick Actions</h4>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button
            @click="handleQuickAction('reset')"
            :style="quickActionButtonStyle"
            title="Reset to default lighting"
        >
          🔄 Reset
        </button>
        <button
            @click="handleQuickAction('dramatic')"
            :style="quickActionButtonStyle"
            title="Apply dramatic lighting"
        >
          🎭 Dramatic
        </button>
        <button
            @click="handleQuickAction('soft')"
            :style="quickActionButtonStyle"
            title="Apply soft lighting"
        >
          🕯️ Soft
        </button>
      </div>
    </div>

    <!-- Lighting Info -->
    <div :style="infoStyle">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #666;">
        <span>Lights: {{ lightingInfo.lightCount }}</span>
        <span>{{ lightingInfo.preset }} • {{ lightingInfo.timeOfDay }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  lightingInfo: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'preset-change',
  'time-change',
  'intensity-change',
  'shadows-toggle',
  'close'
])

// Lighting preset options
const lightingPresets = [
  { value: 'natural', label: 'Natural', icon: '☀️', description: 'Balanced natural lighting' },
  { value: 'warm', label: 'Warm', icon: '🔥', description: 'Cozy warm lighting' },
  { value: 'cool', label: 'Cool', icon: '❄️', description: 'Cool daylight lighting' },
  { value: 'bright', label: 'Bright', icon: '💡', description: 'High-intensity lighting' },
  { value: 'dramatic', label: 'Dramatic', icon: '🎭', description: 'High contrast dramatic lighting' },
  { value: 'soft', label: 'Soft', icon: '🕯️', description: 'Gentle diffused lighting' }
]

// Time of day options
const timeOfDayOptions = [
  { value: 'morning', label: 'Morning', icon: '🌅', description: 'Soft morning light' },
  { value: 'noon', label: 'Noon', icon: '☀️', description: 'Bright midday sun' },
  { value: 'afternoon', label: 'Afternoon', icon: '🌤️', description: 'Warm afternoon light' },
  { value: 'evening', label: 'Evening', icon: '🌇', description: 'Golden hour lighting' },
  { value: 'night', label: 'Night', icon: '🌙', description: 'Cool night lighting' }
]

// Quick action handler
const handleQuickAction = (action) => {
  switch (action) {
    case 'reset':
      emit('preset-change', 'natural')
      emit('time-change', 'noon')
      emit('intensity-change', 1.0)
      emit('shadows-toggle', true)
      break
    case 'dramatic':
      emit('preset-change', 'dramatic')
      emit('time-change', 'afternoon')
      emit('intensity-change', 1.5)
      break
    case 'soft':
      emit('preset-change', 'soft')
      emit('time-change', 'morning')
      emit('intensity-change', 0.8)
      break
  }
}

// Styles
const panelStyle = computed(() => ({
  position: 'fixed',
  top: '60px',
  left: '0',
  width: '320px',
  height: 'calc(100vh - 60px)',
  backgroundColor: '#ffffff',
  borderRight: '1px solid #e0e0e0',
  overflowY: 'auto',
  zIndex: 1000,
  padding: '0',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
}))

const headerStyle = computed(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid #e0e0e0',
  backgroundColor: '#f8f9fa'
}))

const closeButtonStyle = computed(() => ({
  background: 'transparent',
  border: 'none',
  fontSize: '16px',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease'
}))

const sectionStyle = computed(() => ({
  padding: '16px 20px',
  borderBottom: '1px solid #f0f0f0'
}))

const sectionTitleStyle = computed(() => ({
  margin: '0 0 12px 0',
  fontSize: '13px',
  fontWeight: '600',
  color: '#333',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
}))

const presetGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px'
}))

const timeGridStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '6px'
}))

const getPresetButtonStyle = (preset) => {
  const isActive = props.lightingInfo.preset === preset
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '12px 8px',
    border: isActive ? '2px solid #007bff' : '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: isActive ? '#f0f8ff' : '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? '#007bff' : '#333',
    transition: 'all 0.2s ease'
  }
}

const getTimeButtonStyle = (time) => {
  const isActive = props.lightingInfo.timeOfDay === time
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '8px 4px',
    border: isActive ? '2px solid #28a745' : '1px solid #e0e0e0',
    borderRadius: '6px',
    backgroundColor: isActive ? '#f0fff4' : '#ffffff',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? '#28a745' : '#333',
    transition: 'all 0.2s ease'
  }
}

const sliderStyle = computed(() => ({
  flex: '1',
  height: '4px',
  borderRadius: '2px',
  outline: 'none',
  background: 'linear-gradient(to right, #e0e0e0, #007bff)',
  cursor: 'pointer'
}))

const toggleLabelStyle = computed(() => ({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  cursor: 'pointer'
}))

const checkboxStyle = computed(() => ({
  position: 'absolute',
  opacity: 0,
  cursor: 'pointer'
}))

const checkboxCustomStyle = computed(() => ({
  position: 'relative',
  width: '44px',
  height: '24px',
  backgroundColor: props.lightingInfo.shadowsEnabled ? '#007bff' : '#ccc',
  borderRadius: '12px',
  transition: 'background-color 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  padding: '2px'
}))

const toggleDotStyle = computed(() => ({
  width: '20px',
  height: '20px',
  backgroundColor: '#ffffff',
  borderRadius: '50%',
  transition: 'transform 0.3s ease',
  transform: props.lightingInfo.shadowsEnabled ? 'translateX(20px)' : 'translateX(0px)',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
}))

const infoStyle = computed(() => ({
  padding: '12px 20px',
  backgroundColor: '#f8f9fa',
  borderTop: '1px solid #e0e0e0',
  fontSize: '11px'
}))

const quickActionButtonStyle = computed(() => ({
  padding: '8px 12px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  backgroundColor: '#ffffff',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: '500',
  color: '#333',
  transition: 'all 0.2s ease'
}))
</script>