<template>
  <div class="dimension-control">
    <label class="dimension-control__label">
      {{ label }}: {{ displayValue }}cm
      <div class="dimension-control__inputs">
        <input
            type="number"
            :min="min"
            :max="max"
            :step="step"
            :value="modelValue"
            @input="handleInput"
            @blur="handleBlur"
            :placeholder="label"
            class="dimension-control__number-input"
        />
        <input
            type="range"
            :min="min"
            :max="max"
            :step="step"
            :value="modelValue"
            @input="handleSlider"
            class="dimension-control__slider"
        />
      </div>
    </label>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  min: {
    type: Number,
    default: 100
  },
  max: {
    type: Number,
    default: 600
  },
  step: {
    type: Number,
    default: 5
  }
})

const emit = defineEmits(['update:modelValue', 'change'])

const displayValue = computed(() => {
  const value = props.modelValue
  return isNaN(value) ? 0 : Math.round(value)
})

const validateValue = (value) => {
  const num = Number(value)
  if (isNaN(num)) return props.min
  return Math.max(props.min, Math.min(props.max, num))
}

const handleInput = (event) => {
  const newValue = Number(event.target.value)
  if (!isNaN(newValue)) {
    emit('update:modelValue', newValue)
    if (newValue >= props.min && newValue <= props.max) {
      emit('change', newValue)
    }
  }
}

const handleSlider = (event) => {
  const newValue = Number(event.target.value)
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

const handleBlur = (event) => {
  const newValue = validateValue(event.target.value)
  emit('update:modelValue', newValue)
  emit('change', newValue)
}
</script>

<style scoped>
.dimension-control {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
}

.dimension-control__label {
  display: block;
  font-size: 15px;
  color: #1f2937;
  margin-bottom: 8px;
  font-family: Arial, sans-serif;
  font-weight: 600;
}

.dimension-control__inputs {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 12px;
}

.dimension-control__number-input {
  width: 90px;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  font-family: Arial, sans-serif;
  background-color: #ffffff;
  color: #1f2937;
  outline: none;
  transition: all 0.3s ease;
  text-align: center;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.dimension-control__number-input:focus {
  border-color: #29275B;
  box-shadow: 0 0 0 3px rgba(41, 39, 91, 0.1);
}

.dimension-control__slider {
  flex: 1;
  margin-top: 0;
  accent-color: #29275B;
  height: 6px;
  border-radius: 4px;
  cursor: pointer;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .dimension-control__label {
    font-size: 14px;
  }

  .dimension-control__number-input {
    width: 80px;
    font-size: 14px;
  }

  .dimension-control__slider {
    height: 8px;
  }
}
</style>
