<template>
  <div class="color-selector">
    <h4 class="color-selector__title">Color: {{ selectedColorName }}</h4>
    <div class="color-selector__options" :class="{ 'color-selector__options--mobile': isMobile }">
      <div
        v-for="color in colors"
        :key="color.id"
        @click="$emit('select', color.id)"
        class="color-selector__swatch"
        :class="{ 'color-selector__swatch--selected': selectedColor === color.id }"
        :title="color.name"
      >
        <div
          class="color-selector__inner"
          :style="{ backgroundColor: color.color }"
          :class="{ 'color-selector__inner--selected': selectedColor === color.id }"
        ></div>
        <span class="color-selector__name">{{ color.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isMobile as isMobileUtil } from '../../utils/helpers.js'

const props = defineProps({
  colors: {
    type: Array,
    required: true
  },
  selectedColor: {
    type: [String, Number],
    default: null
  }
})

defineEmits(['select'])

const isMobile = computed(() => isMobileUtil())

const selectedColorName = computed(() => {
  const color = props.colors.find(c => c.id === props.selectedColor)
  return color?.name || ''
})
</script>

<style scoped>
.color-selector {
  margin-bottom: 16px;
}

.color-selector__title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 15px 0;
  font-family: Arial, sans-serif;
}

.color-selector__options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.color-selector__options--mobile {
  grid-template-columns: repeat(2, 1fr);
}

.color-selector__swatch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background-color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-selector__swatch:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.color-selector__swatch--selected {
  border-color: #29275B;
  background-color: #f0f8f0;
}

.color-selector__inner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #e0e0e0;
  transition: box-shadow 0.2s ease;
}

.color-selector__inner--selected {
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.color-selector__name {
  font-size: 12px;
  color: #333;
  font-weight: 500;
  text-align: center;
  font-family: Arial, sans-serif;
}
</style>
