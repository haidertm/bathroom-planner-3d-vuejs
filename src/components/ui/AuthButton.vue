<template>
  <div class="auth-button-container">
    <div v-if="loading" class="auth-loading">
      Loading...
    </div>
    <div v-else-if="isAuthenticated" class="auth-user">
      <div class="user-info">
        <div class="user-avatar">
          {{ userInitial }}
        </div>
        <span class="user-email">{{ user?.email }}</span>
      </div>
      <button @click="handleSignOut" class="sign-out-btn">
        Sign Out
      </button>
    </div>
    <router-link v-else to="/login" class="sign-in-btn">
      Sign In
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

const router = useRouter()
const { user, loading, isAuthenticated, signOut } = useAuth()

const userInitial = computed(() => {
  if (!user.value?.email) return '?'
  return user.value.email.charAt(0).toUpperCase()
})

const handleSignOut = async () => {
  const result = await signOut()
  if (result.success) {
    router.push('/login')
  }
}
</script>

<style scoped>
.auth-button-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.auth-loading {
  color: #718096;
  font-size: 14px;
}

.auth-user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-email {
  font-size: 14px;
  color: #2d3748;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sign-out-btn,
.sign-in-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  border: none;
}

.sign-out-btn {
  background: #f7fafc;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.sign-out-btn:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

.sign-in-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: block;
}

.sign-in-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

@media (max-width: 768px) {
  .user-email {
    display: none;
  }
}
</style>
