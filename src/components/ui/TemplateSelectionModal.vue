<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="handleClose">
    <div
      class="modal-container"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-modal-title"
    >
      <!-- Header -->
      <div class="modal-header">
        <h2 id="template-modal-title">How would you like to start?</h2>
        <button class="close-button" @click="handleClose" aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Main Options -->
      <div class="options-container">
        <!-- Start from Scratch Option -->
        <div
          class="option-card"
          :class="{ active: selectedOption === 'scratch' }"
          @click="selectOption('scratch')"
        >
          <div class="option-icon scratch-icon">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <!-- Empty room outline -->
              <rect x="10" y="20" width="60" height="50" fill="none" stroke="#29275B" stroke-width="2" rx="2"/>
              <!-- Plus sign in center -->
              <line x1="40" y1="35" x2="40" y2="55" stroke="#29275B" stroke-width="3" stroke-linecap="round"/>
              <line x1="30" y1="45" x2="50" y2="45" stroke="#29275B" stroke-width="3" stroke-linecap="round"/>
            </svg>
          </div>
          <h3>Start from Scratch</h3>
          <p>Choose your room shape and build your bathroom design from the ground up</p>
        </div>

        <!-- Select a Template Option -->
        <div
          class="option-card"
          :class="{ active: selectedOption === 'template' }"
          @click="selectOption('template')"
        >
          <div class="option-icon template-icon">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <!-- Grid of template layouts -->
              <rect x="8" y="8" width="28" height="28" fill="none" stroke="#29275B" stroke-width="2" rx="2"/>
              <rect x="44" y="8" width="28" height="28" fill="none" stroke="#29275B" stroke-width="2" rx="2"/>
              <rect x="8" y="44" width="28" height="28" fill="none" stroke="#29275B" stroke-width="2" rx="2"/>
              <rect x="44" y="44" width="28" height="28" fill="none" stroke="#29275B" stroke-width="2" rx="2"/>
              <!-- Small fixtures in each -->
              <circle cx="22" cy="22" r="5" fill="#29275B" opacity="0.3"/>
              <rect x="52" y="16" width="12" height="8" fill="#29275B" opacity="0.3" rx="1"/>
              <rect x="14" y="52" width="14" height="10" fill="#29275B" opacity="0.3" rx="1"/>
              <circle cx="58" cy="58" r="6" fill="#29275B" opacity="0.3"/>
            </svg>
          </div>
          <h3>Select a Template</h3>
          <p>Start with a pre-designed layout and customize it to match your needs</p>
        </div>
      </div>

      <!-- Template Grid (shown when template option is selected) -->
      <div v-if="selectedOption === 'template'" class="templates-section">
        <h3 class="templates-title">Choose a Template</h3>
        <div class="templates-grid">
          <!-- Template 1: Standard Family Bathroom -->
          <div
            class="template-card"
            :class="{ active: selectedTemplate === 'standard-family' }"
            @click="selectTemplate('standard-family')"
          >
            <div class="template-thumbnail">
              <svg width="120" height="100" viewBox="0 0 120 100">
                <!-- Room outline (2400x2000) -->
                <rect x="10" y="10" width="100" height="80" fill="#f8f9fa" stroke="#29275B" stroke-width="2" rx="2"/>
                <!-- Bath along back wall -->
                <rect x="10" y="10" width="60" height="22" fill="#29275B" opacity="0.6" rx="3"/>
                <!-- Vanity on right wall -->
                <rect x="92" y="25" width="18" height="25" fill="#29275B" opacity="0.6" rx="2"/>
                <!-- Toilet on right wall -->
                <rect x="92" y="60" width="18" height="22" fill="#29275B" opacity="0.6" rx="3"/>
              </svg>
            </div>
            <span class="template-name">Standard Family Bathroom</span>
          </div>

          <!-- Template 2: Compact En-Suite -->
          <div
            class="template-card"
            :class="{ active: selectedTemplate === 'compact-ensuite' }"
            @click="selectTemplate('compact-ensuite')"
          >
            <div class="template-thumbnail">
              <svg width="120" height="100" viewBox="0 0 120 100">
                <!-- Room outline (1800x1800 square) -->
                <rect x="15" y="10" width="90" height="80" fill="#f8f9fa" stroke="#29275B" stroke-width="2" rx="2"/>
                <!-- Corner shower (back-left) -->
                <rect x="15" y="10" width="35" height="35" fill="#4a90d9" opacity="0.3" stroke="#29275B" stroke-width="1" stroke-dasharray="3,2"/>
                <!-- Basin on right wall -->
                <rect x="87" y="25" width="16" height="22" fill="#29275B" opacity="0.6" rx="2"/>
                <!-- Toilet on right wall -->
                <rect x="87" y="55" width="16" height="22" fill="#29275B" opacity="0.6" rx="3"/>
              </svg>
            </div>
            <span class="template-name">Compact En-Suite</span>
          </div>

          <!-- Template 3: Downstairs Toilet / Cloakroom -->
          <div
            class="template-card"
            :class="{ active: selectedTemplate === 'cloakroom' }"
            @click="selectTemplate('cloakroom')"
          >
            <div class="template-thumbnail">
              <svg width="120" height="100" viewBox="0 0 120 100">
                <!-- Room outline (900x1600 narrow) -->
                <rect x="35" y="10" width="50" height="80" fill="#f8f9fa" stroke="#29275B" stroke-width="2" rx="2"/>
                <!-- Toilet centered on back wall -->
                <rect x="48" y="10" width="22" height="25" fill="#29275B" opacity="0.6" rx="3"/>
                <!-- Basin on left wall -->
                <rect x="35" y="50" width="14" height="20" fill="#29275B" opacity="0.6" rx="2"/>
                <!-- Door on front wall (south) - centered -->
                <rect x="50" y="85" width="20" height="5" fill="#29275B" opacity="0.6" rx="1"/>
                <!-- Door swing arc indicator -->
                <path d="M 50 88 Q 40 78 50 68" fill="none" stroke="#29275B" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>
              </svg>
            </div>
            <span class="template-name">Downstairs toilet / Cloakroom</span>
          </div>

          <!-- Template 4: Shower-Bath Upgrade -->
          <div
            class="template-card"
            :class="{ active: selectedTemplate === 'shower-bath-upgrade' }"
            @click="selectTemplate('shower-bath-upgrade')"
          >
            <div class="template-thumbnail">
              <svg width="120" height="100" viewBox="0 0 120 100">
                <!-- Room outline (2400x2000) -->
                <rect x="10" y="10" width="100" height="80" fill="#f8f9fa" stroke="#29275B" stroke-width="2" rx="2"/>
                <!-- L-shaped shower bath (back-left) -->
                <path d="M12 12 L12 50 L45 50 L45 35 L60 35 L60 12 Z" fill="#29275B" opacity="0.6"/>
                <!-- Shower screen indicator -->
                <line x1="45" y1="12" x2="45" y2="50" stroke="#4a90d9" stroke-width="2"/>
                <!-- Vanity on right wall -->
                <rect x="92" y="25" width="18" height="25" fill="#29275B" opacity="0.6" rx="2"/>
                <!-- Toilet on right wall -->
                <rect x="92" y="60" width="18" height="22" fill="#29275B" opacity="0.6" rx="3"/>
              </svg>
            </div>
            <span class="template-name">Shower-Bath Upgrade</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="modal-actions">
        <button class="btn-secondary" @click="handleClose">Cancel</button>
        <button
          class="btn-primary"
          :disabled="!canContinue"
          @click="handleContinue"
        >
          Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'select-scratch', 'select-template'])

const selectedOption = ref(null)
const selectedTemplate = ref(null)

const canContinue = computed(() => {
  if (selectedOption.value === 'scratch') return true
  if (selectedOption.value === 'template' && selectedTemplate.value) return true
  return false
})

const selectOption = (option) => {
  selectedOption.value = option
  if (option === 'scratch') {
    selectedTemplate.value = null
  }
}

const selectTemplate = (template) => {
  selectedTemplate.value = template
}

const handleClose = () => {
  selectedOption.value = null
  selectedTemplate.value = null
  emit('close')
}

const handleContinue = () => {
  if (selectedOption.value === 'scratch') {
    emit('select-scratch')
  } else if (selectedOption.value === 'template' && selectedTemplate.value) {
    emit('select-template', selectedTemplate.value)
  }
  handleClose()
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 20px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #29275B;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  color: #6c757d;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: #f8f9fa;
  color: #29275B;
}

.options-container {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  padding: 32px;
}

.option-card {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-card:hover {
  border-color: #29275B;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(41, 39, 91, 0.15);
}

.option-card.active {
  border-color: #29275B;
  background: #f0f0ff;
  box-shadow: 0 4px 16px rgba(41, 39, 91, 0.2);
}

.option-icon {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
}

.option-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #29275B;
  margin: 0 0 8px 0;
}

.option-card p {
  font-size: 14px;
  color: #6c757d;
  margin: 0;
  line-height: 1.5;
}

.templates-section {
  padding: 0 32px 24px;
  border-top: 1px solid #e9ecef;
  margin-top: -8px;
  padding-top: 24px;
}

.templates-title {
  font-size: 16px;
  font-weight: 600;
  color: #29275B;
  margin: 0 0 16px 0;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.template-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  border-color: #29275B;
  box-shadow: 0 4px 12px rgba(41, 39, 91, 0.1);
}

.template-card.active {
  border-color: #29275B;
  background: #f8f9ff;
  box-shadow: 0 4px 12px rgba(41, 39, 91, 0.15);
}

.template-thumbnail {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 8px;
}

.template-name {
  font-size: 12px;
  font-weight: 500;
  color: #29275B;
  display: block;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 32px;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 0 0 20px 20px;
}

.btn-secondary {
  background: white;
  color: #6c757d;
  border: 2px solid #e9ecef;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: #29275B;
  color: #29275B;
}

.btn-primary {
  background: #29275B;
  color: white;
  border: none;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  background: #1e1b47;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(41, 39, 91, 0.3);
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Responsive Design */
@media (max-width: 768px) {
  .modal-container {
    max-height: 95vh;
    border-radius: 16px;
  }

  .modal-header {
    padding: 20px 24px;
  }

  .modal-header h2 {
    font-size: 20px;
  }

  .options-container {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 24px;
  }

  .option-card {
    padding: 24px 20px;
  }

  .templates-section {
    padding: 0 24px 20px;
    padding-top: 20px;
  }

  .templates-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .modal-actions {
    padding: 16px 24px;
  }
}

@media (max-width: 480px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }
}
</style>
