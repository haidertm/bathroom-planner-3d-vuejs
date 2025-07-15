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
                  <span class="room-size">{{ design.roomWidth }}m × {{ design.roomHeight }}m</span>
                  <span class="item-count">{{ design.itemCount }} items</span>
                </div>
              </div>
            </div>
            <div class="design-menu">
              <button @click="toggleMenu(design.id)" class="menu-trigger">⋮</button>
              <div v-if="activeMenu === design.id" class="menu-dropdown">
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
              <span class="meta-item">Modified {{ formatDate(design.createdAt) }}</span>
              <span class="meta-item expiry">Available for 86 days</span>
            </div>
          </div>

          <div class="card-actions">
            <button @click="loadDesign(design)" class="action-button primary">OPEN DESIGN</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" v-if="designs.length === 0">
        <div class="empty-content">
          <div class="empty-icon">🎨</div>
          <h3>No designs saved yet</h3>
          <p>Start creating your first bathroom design and save it to access later</p>
          <router-link to="/" class="cta-button">Begin Designing</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const activeMenu = ref(null)

// Sample designs data (in real app, this would come from localStorage or API)
const designs = ref([
  {
    id: 1,
    name: 'Modern Ensuite',
    description: 'A contemporary bathroom with clean lines and premium finishes',
    roomWidth: 6,
    roomHeight: 8,
    itemCount: 5,
    createdAt: new Date('2025-01-14'),
    items: [
      { id: 1, type: 'Toilet', position: [2, 0, 3], rotation: 0, scale: 1 },
      { id: 2, type: 'Sink', position: [-2, 0, 3], rotation: 0, scale: 1 },
      { id: 3, type: 'Bath', position: [0, 0, -3], rotation: 0, scale: 1 },
      { id: 4, type: 'Mirror', position: [-2, 1.2, 3], rotation: 0, scale: 1 },
      { id: 5, type: 'Radiator', position: [3, 0, 0], rotation: Math.PI/2, scale: 1 }
    ]
  },
  {
    id: 2,
    name: 'Compact Family Bathroom',
    description: 'Space-efficient design perfect for family use',
    roomWidth: 4,
    roomHeight: 6,
    itemCount: 4,
    createdAt: new Date('2025-01-11'),
    items: [
      { id: 1, type: 'Toilet', position: [1, 0, 2], rotation: 0, scale: 0.8 },
      { id: 2, type: 'Sink', position: [-1, 0, 2], rotation: 0, scale: 0.8 },
      { id: 3, type: 'Shower', position: [0, 0, -2], rotation: 0, scale: 1 },
      { id: 4, type: 'Mirror', position: [-1, 1.2, 2], rotation: 0, scale: 0.8 }
    ]
  },
  {
    id: 3,
    name: 'Luxury Master Suite',
    description: 'Spacious master bathroom with premium fixtures',
    roomWidth: 8,
    roomHeight: 10,
    itemCount: 7,
    createdAt: new Date('2025-01-10'),
    items: [
      { id: 1, type: 'Toilet', position: [3, 0, 4], rotation: 0, scale: 1 },
      { id: 2, type: 'Sink', position: [-3, 0, 4], rotation: 0, scale: 1.2 },
      { id: 3, type: 'Bath', position: [0, 0, -4], rotation: 0, scale: 1.3 },
      { id: 4, type: 'Shower', position: [3, 0, -2], rotation: 0, scale: 1.1 },
      { id: 5, type: 'Mirror', position: [-3, 1.2, 4], rotation: 0, scale: 1.2 },
      { id: 6, type: 'Radiator', position: [4, 0, 0], rotation: Math.PI/2, scale: 1 },
      { id: 7, type: 'Radiator', position: [-4, 0, 0], rotation: Math.PI/2, scale: 1 }
    ]
  }
])

onMounted(() => {
  // Load designs from localStorage if available
  const savedDesigns = localStorage.getItem('bathroom-designs')
  if (savedDesigns) {
    designs.value = JSON.parse(savedDesigns)
  }
})

const formatDate = (date) => {
  const now = new Date()
  const designDate = new Date(date)
  const diffTime = Math.abs(now - designDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return 'today'
  if (diffDays === 2) return 'yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`

  return designDate.toLocaleDateString()
}

const toggleMenu = (designId) => {
  activeMenu.value = activeMenu.value === designId ? null : designId
}

const loadDesign = (design) => {
  // Store the design to load in localStorage
  localStorage.setItem('design-to-load', JSON.stringify(design))

  // Navigate back to planner
  router.push('/')
}

const duplicateDesign = (design) => {
  const duplicatedDesign = {
    ...design,
    id: Date.now(),
    name: `${design.name} (Copy)`,
    createdAt: new Date()
  }

  designs.value.push(duplicatedDesign)
  localStorage.setItem('bathroom-designs', JSON.stringify(designs.value))
  activeMenu.value = null
}

const renameDesign = (design) => {
  const newName = prompt('Enter new name for the design:', design.name)
  if (newName && newName.trim()) {
    design.name = newName.trim()
    localStorage.setItem('bathroom-designs', JSON.stringify(designs.value))
  }
  activeMenu.value = null
}

const deleteDesign = (designId) => {
  if (confirm('Are you sure you want to delete this design? This action cannot be undone.')) {
    designs.value = designs.value.filter(d => d.id !== designId)
    localStorage.setItem('bathroom-designs', JSON.stringify(designs.value))
  }
  activeMenu.value = null
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