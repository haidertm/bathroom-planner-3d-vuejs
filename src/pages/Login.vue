<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>Welcome to Bathroom Planner</h1>
        <p>Sign in to save and share your designs</p>
      </div>

      <div v-if="!emailSent" class="login-form">
        <div class="input-group">
          <label for="email">Email Address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            @keyup.enter="handleSignIn"
            :disabled="loading"
          />
        </div>

        <button
          class="btn-primary"
          @click="handleSignIn"
          :disabled="loading || !isValidEmail"
        >
          {{ loading ? 'Sending...' : 'Send Magic Link' }}
        </button>

        <p class="info-text">
          We'll send you a magic link to sign in without a password
        </p>

        <div class="divider">
          <span>or</span>
        </div>

        <router-link to="/" class="btn-secondary">
          Continue as Guest
        </router-link>
      </div>

      <div v-else class="success-message">
        <div class="success-icon">✉️</div>
        <h2>Check your email!</h2>
        <p>We've sent a magic link to <strong>{{ email }}</strong></p>
        <p class="sub-text">Click the link in the email to sign in.</p>
        <button class="btn-secondary" @click="resetForm">
          Send to a different email
        </button>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>

    <div class="background-pattern"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { signInWithMagicLink, isAuthenticated } = useAuth()

const email = ref('')
const loading = ref(false)
const emailSent = ref(false)
const error = ref('')

const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

// If already authenticated, redirect to planner
if (isAuthenticated.value) {
  router.push('/planner')
}

const handleSignIn = async () => {
  if (!isValidEmail.value) {
    error.value = 'Please enter a valid email address'
    return
  }

  loading.value = true
  error.value = ''

  const result = await signInWithMagicLink(email.value)

  loading.value = false

  if (result.success) {
    emailSent.value = true
  } else {
    error.value = result.message || 'Failed to send magic link'
  }
}

const resetForm = () => {
  emailSent.value = false
  email.value = ''
  error.value = ''
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.background-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
  pointer-events: none;
}

.login-card {
  background: white;
  border-radius: 20px;
  padding: 48px;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  font-size: 32px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.login-header p {
  font-size: 16px;
  color: #718096;
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  font-size: 14px;
  font-weight: 600;
  color: #2d3748;
}

.input-group input {
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.2s;
}

.input-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-group input:disabled {
  background-color: #f7fafc;
  cursor: not-allowed;
}

.btn-primary,
.btn-secondary {
  padding: 14px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  text-decoration: none;
  display: block;
  text-align: center;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #f7fafc;
  transform: translateY(-2px);
}

.info-text {
  text-align: center;
  font-size: 14px;
  color: #718096;
  margin: -8px 0 0 0;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 8px 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e2e8f0;
}

.divider span {
  padding: 0 16px;
  color: #a0aec0;
  font-size: 14px;
}

.success-message {
  text-align: center;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.success-message h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 12px 0;
}

.success-message p {
  font-size: 16px;
  color: #4a5568;
  margin: 8px 0;
}

.success-message .sub-text {
  font-size: 14px;
  color: #718096;
}

.success-message strong {
  color: #667eea;
}

.error-message {
  background: #fff5f5;
  border: 1px solid #fc8181;
  color: #c53030;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .login-card {
    padding: 32px 24px;
  }

  .login-header h1 {
    font-size: 24px;
  }
}
</style>
