<template>
  <div class="my-designs-container">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">Your Bathroom Design Collection</h1>
        <p class="hero-subtitle">
          Access all your saved bathroom designs in one place. Load previous projects,
          create variations, or start fresh with new ideas to bring your vision to life.
        </p>
        <router-link to="/" class="cta-button">
          + Create New Design
        </router-link>
      </div>
      <div class="hero-image">
        <div class="bathroom-preview">
          🛁 ✨ 🚿
        </div>
      </div>
    </div>

    <!-- Designs Grid Section -->
    <div class="designs-section">
      <div class="section-header">
        <h2>Your Saved Designs</h2>
        <p>{{ designs.length }} design{{ designs.length !== 1 ? 's' : '' }} saved</p>
      </div>

      <div class="designs-grid">
        <!-- New Design Card -->
        <div class="design-card new-design-card">
          <div class="new-design-content">
            <div class="plus-icon">+</div>
            <h3>Create a New Design</h3>
          </div>
          <div class="card-actions">
            <router-link to="/" class="action-button primary">START DESIGNING</router-link>
          </div>
        </div>

        <!-- Existing Design Cards -->
        <div class="design-card" v-for="design in designs" :key="design.id">
          <div class="design-preview">
            <div class="design-thumbnail">
              <div class="thumbnail-content">
                <span class="room-icon">🏠</span>
                <div class="room-info">
                  <span class="room-size">{{ design.room_width }}cm × {{ design.room_height }}cm</span>
                  <span class="item-count">{{ itemCount(design) }} items</span>
                </div>
              </div>
            </div>
            <div class="design-menu">
              <button @click="toggleMenu(design.id)" class="menu-trigger">⋮</button>
              <div v-if="activeMenu === design.id" class="menu-dropdown">
                <button @click="shareDesign(design)" class="menu-item">
                  🔗 Share
                </button>
                <button @click="duplicateDesign(design)" class="menu-item">
                  📋 Duplicate
                </button>
                <button @click="renameDesign(design)" class="menu-item">
                  ✏️ Rename
                </button>
                <button @click="deleteDesign(design.id)" class="menu-item delete">
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>

          <div class="design-info">
            <h3 class="design-title">{{ design.name }}</h3>
            <div class="design-meta">
              <span class="meta-item">Modified {{ formatDate(design.updated_at) }}</span>
              <span class="meta-item share-status" v-if="design.is_public">🔗 Shared</span>
            </div>
          </div>

          <div class="card-actions">
            <button @click="loadDesign(design)" class="action-button primary">OPEN DESIGN</button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div class="loading-state" v-if="loading && designs.length === 0">
        <div class="spinner"></div>
        <p>Loading your designs...</p>
      </div>

      <!-- Empty State -->
      <div class="empty-state" v-if="!loading && designs.length === 0">
        <div class="empty-content">
          <div class="empty-icon">🎨</div>
          <h3>No designs saved yet</h3>
          <p>Start creating your first bathroom design and save it to access later</p>
          <router-link to="/" class="cta-button">Begin Designing</router-link>
        </div>
      </div>
    </div>

    <!-- Share Modal -->
    <div v-if="showShareModal" class="modal-overlay" @click="closeShareModal">
      <div class="modal-content" @click.stop>
        <button @click="closeShareModal" class="modal-close">✕</button>

        <h2>Share Design</h2>
        <p class="modal-description">
          Anyone with this link can view and duplicate this design
        </p>

        <div class="share-url-container">
          <input
            v-model="shareUrl"
            type="text"
            readonly
            class="share-url-input"
            @focus="($event.target as HTMLInputElement)?.select()"
          />
          <button @click="copyShareUrl" class="copy-button">
            {{ copySuccess ? '✓ Copied!' : '📋 Copy' }}
          </button>
        </div>

        <div class="modal-actions">
          <button @click="makePrivate" class="btn-danger">
            Make Private
          </button>
          <button @click="closeShareModal" class="btn-secondary">
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, computed} from 'vue'
import {useRouter} from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { designService } from '../services/designService'
import type { Design } from '../lib/supabase'

const router = useRouter()
const { isAuthenticated } = useAuth()
const activeMenu = ref(null)
const loading = ref(true)
const showShareModal = ref(false)
const shareModalDesign = ref<Design | null>(null)
const shareUrl = ref('')
const copySuccess = ref(false)

// Designs data from Supabase
const designs = ref<Design[]>([])

onMounted(async () => {
  // Redirect to login if not authenticated
  if (!isAuthenticated.value) {
    router.push('/login')
    return
  }

  // Load designs from Supabase
  await loadDesigns()
})

const loadDesigns = async () => {
  loading.value = true
  const { data, error } = await designService.getUserDesigns()

  if (error) {
    console.error('Failed to load designs:', error)
    alert('Failed to load designs. Please try again.')
  } else if (data) {
    designs.value = data
  }

  loading.value = false
}

const itemCount = computed(() => (design: Design) => {
  return design.items?.length || 0
})

const formatDate = (date: string) => {
  const now = new Date()
  const designDate = new Date(date)
  const diffTime = Math.abs(now.getTime() - designDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`

  return designDate.toLocaleDateString()
}

const toggleMenu = (designId) => {
  activeMenu.value = activeMenu.value === designId ? null : designId
}

const loadDesign = (design: Design) => {
  try {
    // Convert Supabase design format to the format Planner.vue expects
    const designToLoad = {
      id: design.id,
      name: design.name,
      timestamp: new Date(design.created_at).getTime(),
      items: design.items || [],
      roomWidth: design.room_width,
      roomHeight: design.room_height,
      currentFloorTexture: design.current_floor_texture || 0,
      currentWallTexture: design.current_wall_texture || 0,
    }

    console.log('💾 Design data to load:', designToLoad)

    // Store the design to load in localStorage
    localStorage.setItem('design-to-load', JSON.stringify(designToLoad))
    // Navigate to planner
    router.push('/planner')

  } catch (error) {
    console.error('❌ Error loading design:', error)
    alert('Failed to load design. Please try again.')
  }
}

const duplicateDesign = async (design: Design) => {
  activeMenu.value = null
  loading.value = true

  const { error } = await designService.duplicateDesign(design.id)

  if (error) {
    alert('Failed to duplicate design. Please try again.')
  } else {
    await loadDesigns()
  }

  loading.value = false
}

const renameDesign = async (design: Design) => {
  const newName = prompt('Enter new name for the design:', design.name)
  activeMenu.value = null

  if (newName && newName.trim()) {
    loading.value = true

    const { error } = await designService.updateDesign(design.id, { name: newName.trim() })

    if (error) {
      alert('Failed to rename design. Please try again.')
    } else {
      await loadDesigns()
    }

    loading.value = false
  }
}

const deleteDesign = async (designId: string) => {
  if (confirm('Are you sure you want to delete this design? This action cannot be undone.')) {
    activeMenu.value = null
    loading.value = true

    const { error } = await designService.deleteDesign(designId)

    if (error) {
      alert('Failed to delete design. Please try again.')
    } else {
      await loadDesigns()
    }

    loading.value = false
  } else {
    activeMenu.value = null
  }
}

const shareDesign = async (design: Design) => {
  activeMenu.value = null
  loading.value = true

  let token = design.share_token

  // Generate share token if it doesn't exist
  if (!token) {
    const { token: newToken, error } = await designService.generateShareToken(design.id)

    if (error || !newToken) {
      alert('Failed to generate share link. Please try again.')
      loading.value = false
      return
    }

    token = newToken
  }

  shareUrl.value = designService.getShareUrl(token)
  shareModalDesign.value = design
  showShareModal.value = true
  loading.value = false
}

const copyShareUrl = async () => {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
    alert('Failed to copy link. Please copy it manually.')
  }
}

const closeShareModal = () => {
  showShareModal.value = false
  shareModalDesign.value = null
  shareUrl.value = ''
  copySuccess.value = false
}

const makePrivate = async () => {
  if (!shareModalDesign.value) return

  const confirmed = confirm('This will disable the share link. Are you sure?')
  if (!confirmed) return

  loading.value = true
  const { error } = await designService.removeShareToken(shareModalDesign.value.id)

  if (error) {
    alert('Failed to make design private. Please try again.')
  } else {
    await loadDesigns()
    closeShareModal()
  }

  loading.value = false
}
</script>

<style scoped>
.my-designs-container {
  min-height: calc(100vh - 60px);
  margin-top: 60px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding-top: 10px;
}

.hero-section {
  background: linear-gradient(135deg, #29275B 0%, #1a1845 100%);
  color: white;
  padding: 60px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 0 0 20px 20px;
  position: relative;
  overflow: hidden;
}

.hero-content {
  flex: 1;
  max-width: 500px;
}

.hero-title {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 20px;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 18px;
  margin-bottom: 30px;
  opacity: 0.9;
  line-height: 1.6;
}

.hero-image {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.bathroom-preview {
  font-size: 120px;
  opacity: 0.3;
  transform: rotate(-10deg);
}

.cta-button {
  display: inline-block;
  padding: 15px 30px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  text-decoration: none;
  border-radius: 50px;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.3s ease;
  border: 2px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.cta-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.designs-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-header h2 {
  font-size: 32px;
  color: #29275B;
  margin-bottom: 10px;
}

.section-header p {
  color: #7f8c8d;
  font-size: 16px;
}

.designs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
  margin-bottom: 40px;
}

.design-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #e9ecef;
}

.design-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.new-design-card {
  border: 2px dashed #29275B;
  background: linear-gradient(135deg, #f8f9fb 0%, #eeeef5 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 300px;
}

.new-design-content {
  text-align: center;
  padding: 40px 20px;
}

.plus-icon {
  width: 60px;
  height: 60px;
  background: #29275B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: bold;
  color: white;
  margin: 0 auto 20px;
}

.new-design-content h3 {
  color: #29275B;
  font-size: 24px;
  margin: 0;
}

.design-preview {
  height: 180px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.design-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-content {
  text-align: center;
}

.room-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.room-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.room-size {
  font-size: 14px;
  font-weight: 600;
  color: #495057;
}

.item-count {
  font-size: 12px;
  color: #6c757d;
}

.design-menu {
  position: absolute;
  top: 15px;
  right: 15px;
}

.menu-trigger {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  color: #495057;
  transition: all 0.2s ease;
}

.menu-trigger:hover {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.menu-dropdown {
  position: absolute;
  top: 40px;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px 0;
  min-width: 140px;
  z-index: 10;
}

.menu-item {
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  color: #495057;
  transition: background 0.2s ease;
}

.menu-item:hover {
  background: #f8f9fa;
}

.menu-item.delete {
  color: #dc3545;
}

.menu-item.delete:hover {
  background: #fff5f5;
}

.design-info {
  padding: 20px;
}

.design-title {
  font-size: 18px;
  font-weight: 600;
  color: #29275B;
  margin: 0 0 10px 0;
}

.design-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  font-size: 12px;
  color: #6c757d;
}

.meta-item.expiry {
  color: #29275B;
}

.card-actions {
  padding: 0 20px 20px;
}

.action-button {
  width: 100%;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: block;
  text-align: center;
}

.action-button.primary {
  background: #29275B;
  color: white;
}

.action-button.primary:hover {
  background: #1e1b47;
  transform: translateY(-1px);
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  margin: 40px 0;
}

.empty-content {
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  font-size: 72px;
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 24px;
  color: #29275B;
  margin-bottom: 15px;
}

.empty-state p {
  color: #7f8c8d;
  margin-bottom: 30px;
  line-height: 1.6;
}

.help-section {
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.help-content {
  font-size: 14px;
  color: #6c757d;
}

.help-link {
  color: #29275B;
  text-decoration: none;
  font-weight: 500;
  margin-left: 10px;
}

.help-link:hover {
  text-decoration: underline;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e2e8f0;
  border-top-color: #29275B;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p {
  color: #7f8c8d;
  font-size: 16px;
}

.share-status {
  color: #29275B !important;
  font-weight: 600;
}

/* Share Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  position: relative;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f7fafc;
  color: #4a5568;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #edf2f7;
  transform: rotate(90deg);
}

.modal-content h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #1a202c;
}

.modal-description {
  color: #718096;
  margin: 0 0 24px 0;
  font-size: 14px;
}

.share-url-container {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.share-url-input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
  background: #f7fafc;
}

.share-url-input:focus {
  outline: none;
  border-color: #29275B;
}

.copy-button {
  padding: 12px 20px;
  background: #29275B;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.copy-button:hover {
  background: #1e1b47;
  transform: translateY(-1px);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modal-actions button {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-danger {
  background: #fff;
  color: #e53e3e;
  border: 2px solid #e53e3e !important;
}

.btn-danger:hover {
  background: #fff5f5;
}

.btn-secondary {
  background: #29275B;
  color: white;
}

.btn-secondary:hover {
  background: #1e1b47;
}

@media (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding: 40px 20px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .designs-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .bathroom-preview {
    font-size: 60px;
    margin-top: 20px;
  }
}
</style>