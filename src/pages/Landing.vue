<template>
  <div class="landing-container">
    <!-- Template Selection Modal -->
    <TemplateSelectionModal
      :isVisible="showTemplateModal"
      @close="showTemplateModal = false"
      @select-scratch="handleStartFromScratch"
      @select-template="handleSelectTemplate"
    />

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-overlay">
          <h1 class="hero-title">Build Your Dream<br>Bathroom in<br>Minutes.</h1>
          <div class="hero-buttons">
            <button class="btn-primary" @click="startNewProject">Start New Project</button>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works">
      <h2 class="section-title">How It Works</h2>
      <div class="steps-container">
        <div class="step-card">
          <div class="step-icon">
            <svg width="41" height="43" viewBox="0 0 51 53" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="14.1614" y="7.6245" width="30.5015" height="30.5015" rx="15.2508" fill="#1B84E9" fill-opacity="0.2" stroke="#1D3348" stroke-width="2.17868"/>
              <path d="M37.0376 15.25H30.2595V16.9445H33.6485V18.6391H35.343V22.0281H37.0376V15.25ZM33.6485 18.6391H31.954V20.3336H30.2595V22.0281H31.954V20.3336H33.6485V18.6391ZM26.8704 25.4172H28.5649V23.7226H26.8704V25.4172ZM26.8704 25.4172H25.1759V27.1117H26.8704V25.4172ZM23.4813 23.7226V27.1117H25.1759V28.8062H23.4813H28.5649V30.5008H21.7868V23.7226H23.4813Z" fill="#1D3348"/>
              <path d="M41.3949 52.2879V41.3945L50.1097 46.8412L41.3949 52.2879Z" fill="#1D3348"/>
              <path d="M10.8934 8.71484L0 8.71484L5.4467 0.000121423L10.8934 8.71484Z" fill="#1D3348"/>
              <path d="M41.3949 46.8418H8.71472" stroke="#1D3348" stroke-width="2.17868"/>
              <path d="M5.44668 8.71432L5.44669 41.3945" stroke="#1D3348" stroke-width="2.17868"/>
            </svg>
          </div>
          <h3 class="step-number">1. Measure Space</h3>
        </div>

        <div class="step-card">
          <div class="step-icon">
            <svg width="41" height="43" viewBox="0 0 22 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0.5" y="0.5" width="11" height="11" rx="2.5" stroke="#1D3348"/>
              <rect x="10.5" y="12.5" width="11" height="11" rx="2.5" fill="#1B84E9" fill-opacity="0.2" stroke="#1D3348"/>
              <path d="M14 2C15.1346 2 15.7014 2 16.1491 2.16883C16.4458 2.28093 16.7154 2.44544 16.9425 2.65292C17.1696 2.86041 17.3496 3.10679 17.4723 3.37796C17.657 3.78703 17.657 4.30497 17.657 5.34175L17.657 8.99956M20 7.1323L18.1688 8.80605C18.0275 8.9352 17.8423 9 17.657 9C17.5619 8.99998 17.4678 8.98284 17.38 8.94956C17.2922 8.91628 17.2124 8.86751 17.1452 8.80605L15.314 7.13275" stroke="#1D3348" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M7 21C5.86541 21 5.2986 21 4.85094 20.8312C4.55419 20.7191 4.28456 20.5546 4.0575 20.3471C3.83044 20.1396 3.65042 19.8932 3.52774 19.622C3.34298 19.213 3.34298 18.695 3.34298 17.6582L3.34298 14.0004M1 15.8677L2.83116 14.194C2.9725 14.0648 3.15774 14 3.34298 14C3.43805 14 3.53219 14.0172 3.62001 14.0504C3.70783 14.0837 3.78761 14.1325 3.8548 14.194L5.68596 15.8673" stroke="#4A5F73" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h3 class="step-number">2. Drag & Drop Items</h3>
        </div>

        <div class="step-card">
          <div class="step-icon">
            <svg width="51" height="53" id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 248 204">
              <path fill="#2f2f2f" d="M127.06,0l69.55,40.92c1.19.97,1.29,2.13,1.47,3.53.97,7.43-1.81,32.07.43,36.57,20.39,9.67,43.94,19.57,49.49,43.98v9c-6.22,25.49-33.9,38.56-56.98,45.5-11.71,3.52-40.1,10.04-51.42,8.41-6.29-.91-5.44-7.88-.61-9.46,3.72-1.22,13.43-.85,18.41-1.58,21.73-3.2,46.55-9.36,64.5-22.47,22.67-16.55,21.3-35.69-1.58-51.2-6.13-4.16-15.12-8.92-22.3-10.19v29.5c0,2.45-8.4,6.9-10.69,8.3-20.14,12.35-41.33,23.26-61.76,35.13l-70.73-39.9c-.61-.42-1.74-2.04-1.74-2.54v-32.5c-15.28,5.41-41.74,17.94-43.02,36.46-1.72,25.01,35.4,38.34,54.52,44.51,3.24-.26-.93-21.42,9.52-16.52,10.79,8.83,27.84,16.1,37.85,25.14,5.15,4.65,3.91,7.47-1.92,9.87-13.13,5.4-28.81,7.7-41.97,13.54h-2c-7.9-4.36-.86-15.53-2.09-22.91C38.25,174.67,7.54,162.12.12,134c.27-2.87-.38-6.23,0-9,3.1-22.63,33.31-38.22,52.83-44.14,1.5-7.18-2.05-36.34,1.43-40.58L123.06,0h4ZM182.03,43.01l-57.3-31.79c-18.18,10.48-36.57,20.66-54.66,31.29-1.06.62-2.44-.12-1.98,1.97l56.48,32.14,57.47-33.61ZM119.06,151v-65.5l-55.97-32.5v65.5l8.32,5.67,47.65,26.83ZM188.03,53l-58.97,33v66l58.97-34.5V53ZM99.07,183.01c-3.84-.58-22.2-15.86-23.98-14.01l-1.99,22.99,25.97-8.99Z"/>
            </svg>
          </div>
          <h3 class="step-number">3. Visualize in 3D</h3>
        </div>
      </div>
    </section>

    <!-- Templates Section -->
    <section class="templates-section">
      <h2 class="section-title">Start from a Template</h2>
      <div class="templates-container">
        <div class="template-card" @click="selectTemplate('small-ensuite')">
          <div class="template-image">
            <img src="/assets/ensuite.webp" alt="Small Ensuite" />
          </div>
          <div class="template-info">
            <h3>Small Ensuite</h3>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <div class="template-card" @click="selectTemplate('family-bathroom')">
          <div class="template-image">
            <img src="/assets/family-bathroom.webp" alt="Family Bathroom" />
          </div>
          <div class="template-info">
            <h3>Family Bathroom</h3>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <div class="template-card" @click="selectTemplate('cloak-room')">
          <div class="template-image">
            <img src="/assets/cloakroom.webp" alt="Cloakroom" />
          </div>
          <div class="template-info">
            <h3>Cloakroom</h3>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import TemplateSelectionModal from '../components/ui/TemplateSelectionModal.vue'

const router = useRouter()
const showTemplateModal = ref(false)

const startNewProject = () => {
  showTemplateModal.value = true
}

const handleStartFromScratch = (shape) => {
  localStorage.setItem('selected-room-shape', shape)
  router.push('/room-dimensions')
}

const handleSelectTemplate = (templateId) => {
  localStorage.setItem('selected-template', templateId)
  router.push('/planner')
}

const selectTemplate = (templateId) => {
  // Map UI template names to actual template IDs from templates.ts
  const templateMap = {
    'small-ensuite': 'compact-ensuite',
    'family-bathroom': 'standard-family',
    'cloak-room': 'cloakroom'
  }

  const actualTemplateId = templateMap[templateId] || templateId
  console.log('Selected template:', templateId, '-> Loading:', actualTemplateId)

  // Store template ID for Planner to load
  localStorage.setItem('selected-template', actualTemplateId)
  router.push('/planner')
}
</script>

<style scoped>
.landing-container {
  min-height: 100vh;
  background: #f5f7fa;
}

/* Hero Section */
.hero-section {
  position: relative;
  height: 340px;
  background: url('/assets/home-banner.webp') center center / cover no-repeat;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0 60px;
  max-width: 1400px;
  top: 70px;
  margin: 0 auto;
}

.hero-content {
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.hero-overlay {
  max-width: 600px;
}

.hero-title {
  font-size: 38px;
  font-weight: 700;
  color: white;
  line-height: 1.1;
  margin-bottom: 24px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.hero-buttons {
  width: 50%;
}

.btn-primary,
.btn-secondary {
  padding: 14px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  width: 100%;
}

.btn-primary {
  background: #2962FF;
  color: white;
  box-shadow: 0 4px 12px rgba(41, 98, 255, 0.3);
}

.btn-primary:hover {
  background: #1e4ed8;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(41, 98, 255, 0.4);
}

.btn-secondary {
  background: white;
  color: #29275B;
  border: 2px solid white;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 255, 255, 0.3);
}

/* How It Works Section */
.how-it-works {
  padding: 30px 40px 20px;
  margin-top: 50px;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #29275B;
  margin: 20px 0;
}

.steps-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.step-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.step-icon {
  width: 60px;
  height: 60px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-icon svg {
  width: 28px;
  height: 28px;
}

.step-number {
  font-size: 16px;
  font-weight: 600;
  color: #29275B;
}

/* Templates Section */
.templates-section {
  padding: 10px 40px 30px;
  text-align: center;
}

.templates-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.template-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.template-image {
  width: 100%;
  height: 190px;
  overflow: hidden;
  position: relative;
}

.template-image img {
  width: 100%;
  height: 100%;
}

.template-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-info {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
}

.template-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #29275B;
  margin: 0;
}

.template-info svg {
  color: #666;
  transition: transform 0.3s ease;
}

.template-card:hover .template-info svg {
  transform: translateX(4px);
  color: #2962FF;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .hero-section {
    padding: 0 40px;
    height: 300px;
  }

  .hero-title {
    font-size: 36px;
  }

  .steps-container,
  .templates-container {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 0 24px;
    height: 280px;
    border-radius: 0;
    top: 60px;
  }

  .hero-title {
    font-size: 28px;
    margin-bottom: 20px;
  }

  .hero-buttons {
    width: 80%;
    margin: 0 auto;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }

  .section-title {
    font-size: 24px;
    margin-bottom: 20px;
  }

  .how-it-works,
  .templates-section {
    padding: 30px 24px;
  }
}
</style>
