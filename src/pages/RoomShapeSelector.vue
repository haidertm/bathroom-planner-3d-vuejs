<template>
  <div class="shape-selection-container">
    <!-- Main Content -->
    <div class="content-wrapper">
      <div class="text-section">
        <h1 class="main-title">
          Select a shape<br>
          similar to your bathroom.
        </h1>
        <p class="subtitle">
          Don't worry if it is not identical you can adjust it in the next step.
        </p>

        <!-- Shape Selection Cards -->
        <div class="shapes-grid">
          <div
              class="shape-card"
              @click="selectShape('square')"
              :class="{ active: selectedShape === 'square' }"
          >
            <div class="shape-icon">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <rect x="10" y="10" width="60" height="60" fill="none" stroke="#29275B" stroke-width="3"/>
              </svg>
            </div>
            <h3>Square</h3>
          </div>

          <div
              class="shape-card"
              @click="selectShape('rectangular')"
              :class="{ active: selectedShape === 'rectangular' }"
          >
            <div class="shape-icon">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <rect x="10" y="20" width="60" height="40" fill="none" stroke="#29275B" stroke-width="3"/>
              </svg>
            </div>
            <h3>Rectangular</h3>
          </div>

          <div
              class="shape-card"
              @click="selectShape('l-shape')"
              :class="{ active: selectedShape === 'l-shape' }"
          >
            <div class="shape-icon">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <path d="M10 10 L10 70 L40 70 L40 40 L70 40 L70 10 Z" fill="none" stroke="#29275B" stroke-width="3"/>
              </svg>
            </div>
            <h3>L-Shape</h3>
          </div>
        </div>

        <!-- Continue Button -->
        <button
            class="continue-button"
            @click="goToPlanner"
            :disabled="!selectedShape"
        >
          Continue to Planner
        </button>
      </div>

      <!-- Illustration Section -->
      <div class="illustration-section">
        <div class="floating-elements">
          <!-- Decorative geometric shapes -->
          <div class="geometric-shape plus-1">+</div>
          <div class="geometric-shape plus-2">+</div>
          <div class="geometric-shape plus-3">+</div>
          <div class="geometric-shape circle-1">●</div>
          <div class="geometric-shape circle-2">●</div>
          <div class="geometric-shape circle-3">●</div>
          <div class="geometric-shape circle-4">●</div>

          <!-- Main illustration elements -->
          <div class="main-illustration">
            <!-- Toilet -->
            <div class="toilet-icon">
              <svg width="60" height="80" viewBox="0 0 60 80">
                <rect x="10" y="10" width="40" height="30" rx="5" fill="none" stroke="#29275B" stroke-width="2"/>
                <rect x="15" y="45" width="30" height="25" rx="3" fill="none" stroke="#29275B" stroke-width="2"/>
                <circle cx="30" cy="25" r="3" fill="#29275B"/>
              </svg>
            </div>

            <!-- Sink -->
            <div class="sink-icon">
              <svg width="70" height="60" viewBox="0 0 70 60">
                <rect x="10" y="20" width="50" height="30" rx="5" fill="none" stroke="#29275B" stroke-width="2"/>
                <line x1="35" y1="20" x2="35" y2="10" stroke="#29275B" stroke-width="2"/>
                <circle cx="35" cy="35" r="3" fill="#29275B"/>
              </svg>
            </div>

            <!-- Bathtub -->
            <div class="bathtub-icon">
              <svg width="100" height="50" viewBox="0 0 100 50">
                <path d="M10 15 Q10 10 15 10 L85 10 Q90 10 90 15 L90 35 Q90 40 85 40 L15 40 Q10 40 10 35 Z" fill="none" stroke="#29275B" stroke-width="2"/>
                <circle cx="20" cy="45" r="3" fill="none" stroke="#29275B" stroke-width="2"/>
                <circle cx="80" cy="45" r="3" fill="none" stroke="#29275B" stroke-width="2"/>
              </svg>
            </div>

            <!-- Shower -->
            <div class="shower-icon">
              <svg width="50" height="70" viewBox="0 0 50 70">
                <rect x="10" y="10" width="30" height="50" rx="3" fill="none" stroke="#29275B" stroke-width="2"/>
                <line x1="25" y1="10" x2="25" y2="5" stroke="#29275B" stroke-width="2"/>
                <circle cx="25" cy="5" r="2" fill="#29275B"/>
                <path d="M15 20 L20 20 M15 25 L20 25 M15 30 L20 30" stroke="#29275B" stroke-width="1"/>
              </svg>
            </div>

            <!-- Additional decorative elements -->
            <div class="small-square">
              <svg width="20" height="20" viewBox="0 0 20 20">
                <rect x="2" y="2" width="16" height="16" fill="none" stroke="#29275B" stroke-width="2"/>
              </svg>
            </div>

            <div class="checkmark">✓</div>
            <div class="checkmark-2">✓</div>

            <!-- Lines -->
            <div class="line line-1"></div>
            <div class="line line-2"></div>
            <div class="line line-3"></div>
            <div class="line line-4"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const selectedShape = ref('')

const selectShape = (shape) => {
  selectedShape.value = shape
}

const goToPlanner = () => {
  if (selectedShape.value) {
    // Store the selected shape for the planner
    localStorage.setItem('selected-room-shape', selectedShape.value)

    // Navigate to the planner page
    router.push('/planner')
  }
}
</script>

<style scoped>
.shape-selection-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding-top: 60px;
  position: relative;
  overflow: hidden;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 60px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: calc(100vh - 60px);
}

.text-section {
  flex: 1;
  max-width: 600px;
  padding-right: 60px;
}

.main-title {
  font-size: 48px;
  font-weight: 700;
  color: #29275B;
  line-height: 1.2;
  margin-bottom: 24px;
}

.subtitle {
  font-size: 18px;
  color: #666;
  margin-bottom: 48px;
  line-height: 1.6;
}

.shapes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 48px;
}

.shape-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.shape-card:hover {
  border-color: #29275B;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(41, 39, 91, 0.15);
}

.shape-card.active {
  border-color: #29275B;
  background: #f8f9ff;
  transform: translateY(-2px);
}

.shape-icon {
  margin-bottom: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80px;
}

.shape-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #29275B;
  margin: 0;
}

.continue-button {
  background: #29275B;
  color: white;
  border: none;
  padding: 16px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 200px;
}

.continue-button:hover:not(:disabled) {
  background: #1e1b47;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(41, 39, 91, 0.3);
}

.continue-button:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

.illustration-section {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.floating-elements {
  position: relative;
  width: 600px;
  height: 500px;
}

.geometric-shape {
  position: absolute;
  font-size: 24px;
  color: #29275B;
  font-weight: bold;
  animation: float 3s ease-in-out infinite;
}

.plus-1 {
  top: 10%;
  left: 20%;
  animation-delay: 0s;
}

.plus-2 {
  top: 60%;
  right: 10%;
  animation-delay: 1s;
}

.plus-3 {
  bottom: 20%;
  left: 10%;
  animation-delay: 2s;
}

.circle-1 {
  top: 20%;
  right: 30%;
  animation-delay: 0.5s;
}

.circle-2 {
  top: 80%;
  left: 40%;
  animation-delay: 1.5s;
}

.circle-3 {
  top: 5%;
  left: 50%;
  animation-delay: 2.5s;
}

.circle-4 {
  bottom: 10%;
  right: 20%;
  animation-delay: 3s;
}

.main-illustration {
  position: relative;
  width: 100%;
  height: 100%;
}

.toilet-icon {
  position: absolute;
  top: 15%;
  left: 10%;
  animation: float 4s ease-in-out infinite;
  animation-delay: 0.5s;
}

.sink-icon {
  position: absolute;
  top: 20%;
  right: 15%;
  animation: float 3.5s ease-in-out infinite;
  animation-delay: 1s;
}

.bathtub-icon {
  position: absolute;
  bottom: 30%;
  left: 15%;
  animation: float 4.5s ease-in-out infinite;
  animation-delay: 1.5s;
}

.shower-icon {
  position: absolute;
  bottom: 15%;
  right: 10%;
  animation: float 3.8s ease-in-out infinite;
  animation-delay: 2s;
}

.small-square {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: float 3s ease-in-out infinite;
  animation-delay: 0.8s;
}

.checkmark {
  position: absolute;
  top: 40%;
  right: 40%;
  font-size: 20px;
  color: #29275B;
  font-weight: bold;
  animation: float 3.2s ease-in-out infinite;
  animation-delay: 1.2s;
}

.checkmark-2 {
  position: absolute;
  bottom: 40%;
  left: 60%;
  font-size: 16px;
  color: #29275B;
  font-weight: bold;
  animation: float 3.7s ease-in-out infinite;
  animation-delay: 2.2s;
}

.line {
  position: absolute;
  background: #29275B;
  animation: float 4s ease-in-out infinite;
}

.line-1 {
  width: 30px;
  height: 2px;
  top: 35%;
  left: 70%;
  animation-delay: 0.3s;
}

.line-2 {
  width: 2px;
  height: 25px;
  top: 25%;
  left: 40%;
  animation-delay: 1.3s;
}

.line-3 {
  width: 20px;
  height: 2px;
  bottom: 50%;
  right: 50%;
  animation-delay: 2.3s;
}

.line-4 {
  width: 2px;
  height: 15px;
  bottom: 25%;
  left: 30%;
  animation-delay: 1.8s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

/* Responsive Design */
@media (max-width: 1200px) {
  .content-wrapper {
    flex-direction: column;
    text-align: center;
  }

  .text-section {
    padding-right: 0;
    margin-bottom: 40px;
  }

  .illustration-section {
    display: none;
  }
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 40px 20px;
  }

  .main-title {
    font-size: 36px;
  }

  .shapes-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .shape-card {
    padding: 24px;
  }

  .continue-button {
    width: 100%;
  }
}
</style>