<template>
  <div v-if="showPrompt" class="migration-prompt">
    <div class="prompt-content">
      <h3>📦 Migrate Your Designs</h3>
      <p>
        We found {{ designCount }} design{{ designCount !== 1 ? 's' : '' }} saved locally.
        Would you like to migrate them to your cloud account?
      </p>
      <div class="prompt-actions">
        <button @click="handleMigrate" :disabled="migrating" class="btn-primary">
          {{ migrating ? 'Migrating...' : 'Migrate Now' }}
        </button>
        <button @click="handleDismiss" :disabled="migrating" class="btn-secondary">
          Not Now
        </button>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { migrateLocalStorageDesigns, hasLocalStorageDesigns } from '../../utils/migrateLocalStorage'

const showPrompt = ref(false)
const migrating = ref(false)
const error = ref('')
const designCount = ref(0)

const { isAuthenticated } = useAuth()

onMounted(() => {
  // Only show prompt if user is authenticated and has localStorage designs
  if (isAuthenticated.value && hasLocalStorageDesigns()) {
    const savedDesigns = localStorage.getItem('saved-designs')
    if (savedDesigns) {
      try {
        const designs = JSON.parse(savedDesigns)
        designCount.value = designs.length
        showPrompt.value = true
      } catch {
        // Invalid JSON, ignore
      }
    }
  }
})

const handleMigrate = async () => {
  migrating.value = true
  error.value = ''

  const result = await migrateLocalStorageDesigns()

  if (result.success) {
    alert(`Successfully migrated ${result.migratedCount} design${result.migratedCount !== 1 ? 's' : ''}!`)
    showPrompt.value = false
  } else {
    error.value = result.errors.join(', ')
  }

  migrating.value = false
}

const handleDismiss = () => {
  showPrompt.value = false
}
</script>

<style scoped>
.migration-prompt {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
}

.prompt-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  border: 2px solid #667eea;
}

.prompt-content h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: #1a202c;
}

.prompt-content p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: #4a5568;
  line-height: 1.5;
}

.prompt-actions {
  display: flex;
  gap: 12px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: #edf2f7;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-text {
  color: #e53e3e;
  font-size: 12px;
  margin: 12px 0 0 0 !important;
}

@media (max-width: 768px) {
  .migration-prompt {
    left: 20px;
    right: 20px;
    max-width: none;
  }
}
</style>
