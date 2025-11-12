<template>
  <div class="shared-design-container">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading design...</p>
    </div>

    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Design Not Found</h2>
      <p>{{ error }}</p>
      <router-link to="/" class="btn-primary">Go Home</router-link>
    </div>

    <div v-else-if="design" class="design-view">
      <div class="design-header">
        <div>
          <h1>{{ design.name }}</h1>
          <p v-if="design.description" class="description">{{ design.description }}</p>
          <p class="meta">
            Shared by {{ ownerEmail || 'Anonymous' }} •
            {{ formatDate(design.created_at) }}
          </p>
        </div>
        <div class="actions">
          <button @click="duplicateDesign" class="btn-secondary" v-if="isAuthenticated">
            📋 Duplicate to My Designs
          </button>
          <router-link to="/login" class="btn-primary" v-else>
            Sign in to Save
          </router-link>
        </div>
      </div>

      <div class="design-info">
        <div class="info-card">
          <span class="label">Room Size</span>
          <span class="value">{{ design.room_width }}cm × {{ design.room_height }}cm</span>
        </div>
        <div class="info-card">
          <span class="label">Items</span>
          <span class="value">{{ design.items.length }} fixtures</span>
        </div>
      </div>

      <button @click="loadDesign" class="btn-load">
        🏠 Load This Design in Planner
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { designService } from '../services/designService'
import { useAuth } from '../composables/useAuth'
import type { Design } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()

const loading = ref(true)
const error = ref('')
const design = ref<Design | null>(null)
const ownerEmail = ref('')

onMounted(async () => {
  const token = route.params.token as string

  if (!token) {
    error.value = 'No share token provided'
    loading.value = false
    return
  }

  const { data, error: fetchError } = await designService.getDesignByShareToken(token)

  if (fetchError || !data) {
    error.value = 'This design link is invalid or has been removed'
  } else {
    design.value = data
    // Optionally fetch owner email (would need to join with profiles table)
  }

  loading.value = false
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const duplicateDesign = async () => {
  if (!design.value || !isAuthenticated.value) return

  loading.value = true
  const { error: dupError } = await designService.duplicateDesign(
    design.value.id,
    `${design.value.name} (Copy)`
  )
  loading.value = false

  if (dupError) {
    alert('Failed to duplicate design')
  } else {
    alert('Design duplicated successfully!')
    router.push('/my-designs')
  }
}

const loadDesign = () => {
  if (!design.value) return

  // Store design data to load in planner
  localStorage.setItem('design-to-load', JSON.stringify({
    id: design.value.id,
    name: design.value.name,
    timestamp: Date.now(),
    items: design.value.items,
    roomWidth: design.value.room_width,
    roomHeight: design.value.room_height,
    currentFloorTexture: design.value.current_floor_texture,
    currentWallTexture: design.value.current_wall_texture,
  }))

  router.push('/planner')
}
</script>

<style scoped>
.shared-design-container {
  min-height: calc(100vh - 60px);
  margin-top: 60px;
  padding: 40px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  gap: 20px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 64px;
}

.error-state h2 {
  font-size: 24px;
  color: #1a202c;
  margin: 0;
}

.error-state p {
  color: #718096;
  margin: 8px 0 24px 0;
}

.design-view {
  max-width: 1200px;
  margin: 0 auto;
}

.design-header {
  background: white;
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.design-header h1 {
  font-size: 32px;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.description {
  font-size: 16px;
  color: #4a5568;
  margin: 8px 0;
}

.meta {
  font-size: 14px;
  color: #a0aec0;
  margin: 8px 0 0 0;
}

.actions {
  display: flex;
  gap: 12px;
}

.design-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.info-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-card .label {
  font-size: 12px;
  text-transform: uppercase;
  color: #a0aec0;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.info-card .value {
  font-size: 20px;
  font-weight: 700;
  color: #1a202c;
}

.btn-load {
  width: 100%;
  padding: 20px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-load:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  white-space: nowrap;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #f7fafc;
}

@media (max-width: 768px) {
  .design-header {
    flex-direction: column;
  }

  .actions {
    width: 100%;
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }
}
</style>
