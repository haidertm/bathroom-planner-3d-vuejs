<script setup lang="ts">
// @ts-nocheck - Disable strict type checking for inline styles
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminAuth } from '../../composables/useAdminAuth';

const router = useRouter();
const { login, isLoading, error, clearError, validateSession } = useAdminAuth();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const showCredentialsHint = ref(false);

// Redirect if already authenticated
onMounted(() => {
  if (validateSession()) {
    router.push('/vadmin/dashboard');
  }
});

const handleSubmit = async () => {
  clearError();

  if (!username.value.trim() || !password.value.trim()) {
    return;
  }

  const success = await login(username.value.trim(), password.value);
  if (success) {
    router.push('/vadmin/dashboard');
  }
};

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value;
};
</script>

<template>
  <div :style="containerStyle">
    <div :style="loginBoxStyle">
      <!-- Logo/Header -->
      <div :style="headerStyle">
        <div :style="logoStyle">
          <img src="/assets/logo.svg" alt="Logo" :style="logoImageStyle" />
        </div>
        <h1 :style="titleStyle">Admin Panel</h1>
        <p :style="subtitleStyle">Bathroom Planner Management</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleSubmit" :style="formStyle">
        <!-- Error Message -->
        <div v-if="error" :style="errorStyle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{{ error }}</span>
        </div>

        <!-- Username Field -->
        <div :style="inputGroupStyle">
          <label :style="labelStyle" for="username">Username</label>
          <div :style="inputWrapperStyle">
            <svg :style="inputIconStyle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <input
              id="username"
              v-model="username"
              type="text"
              placeholder="Enter username"
              :style="inputStyle"
              autocomplete="username"
              required
            />
          </div>
        </div>

        <!-- Password Field -->
        <div :style="inputGroupStyle">
          <label :style="labelStyle" for="password">Password</label>
          <div :style="inputWrapperStyle">
            <svg :style="inputIconStyle" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Enter password"
              :style="inputStyle"
              autocomplete="current-password"
              required
            />
            <button
              type="button"
              @click="togglePasswordVisibility"
              :style="toggleButtonStyle"
            >
              <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading || !username.trim() || !password.trim()"
          :style="submitButtonStyle"
        >
          <span v-if="isLoading" :style="spinnerStyle"></span>
          <span v-else>Sign In</span>
        </button>
      </form>

      <!-- Credentials Hint -->
      <div :style="hintContainerStyle">
        <button
          type="button"
          @click="showCredentialsHint = !showCredentialsHint"
          :style="hintToggleStyle"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>Need help signing in?</span>
        </button>
        <div v-if="showCredentialsHint" :style="hintBoxStyle">
          <p><strong>Default credentials:</strong></p>
          <p>Username: <code>admin</code></p>
          <p>Password: <code>admin123</code></p>
        </div>
      </div>

      <!-- Back to Home -->
      <router-link to="/" :style="backLinkStyle">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        <span>Back to Home</span>
      </router-link>
    </div>
  </div>
</template>

<script lang="ts">
// @ts-nocheck - Disable strict type checking for inline styles
// Styles defined separately for cleaner template
const primaryColor = '#29275B';
const errorColor = '#dc2626';
const borderColor = '#e2e8f0';
const textColor = '#2d3748';
const mutedColor = '#6b7280';

export default {
  computed: {
    containerStyle() {
      return {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${primaryColor} 0%, #1e1c44 50%, #0f0e24 100%)`,
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      };
    },
    loginBoxStyle() {
      return {
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        padding: '40px',
        animation: 'fadeInUp 0.5s ease-out',
      };
    },
    headerStyle() {
      return {
        textAlign: 'center',
        marginBottom: '32px',
      };
    },
    logoStyle() {
      return {
        width: '160px',
        height: '60px',
        margin: '0 auto 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    },
    logoImageStyle() {
      return {
        width: '100%',
        height: 'auto',
        objectFit: 'contain',
      };
    },
    titleStyle() {
      return {
        fontSize: '28px',
        fontWeight: '700',
        color: textColor,
        margin: '0 0 8px',
      };
    },
    subtitleStyle() {
      return {
        fontSize: '14px',
        color: mutedColor,
        margin: '0',
      };
    },
    formStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      };
    },
    errorStyle() {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        border: `1px solid ${errorColor}`,
        borderRadius: '8px',
        color: errorColor,
        fontSize: '14px',
      };
    },
    inputGroupStyle() {
      return {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      };
    },
    labelStyle() {
      return {
        fontSize: '14px',
        fontWeight: '500',
        color: textColor,
      };
    },
    inputWrapperStyle() {
      return {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      };
    },
    inputIconStyle() {
      return {
        position: 'absolute',
        left: '14px',
        color: mutedColor,
        pointerEvents: 'none',
      };
    },
    inputStyle() {
      return {
        width: '100%',
        padding: '14px 44px',
        fontSize: '15px',
        border: `1px solid ${borderColor}`,
        borderRadius: '10px',
        outline: 'none',
        transition: 'all 0.2s ease',
        backgroundColor: '#f8fafc',
      };
    },
    toggleButtonStyle() {
      return {
        position: 'absolute',
        right: '12px',
        padding: '4px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: mutedColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      };
    },
    submitButtonStyle() {
      return {
        width: '100%',
        padding: '14px 24px',
        fontSize: '16px',
        fontWeight: '600',
        color: '#ffffff',
        backgroundColor: primaryColor,
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '8px',
      };
    },
    spinnerStyle() {
      return {
        width: '20px',
        height: '20px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#ffffff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      };
    },
    hintContainerStyle() {
      return {
        marginTop: '24px',
        textAlign: 'center',
      };
    },
    hintToggleStyle() {
      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        fontSize: '13px',
        color: mutedColor,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderRadius: '6px',
        transition: 'all 0.2s ease',
      };
    },
    hintBoxStyle() {
      return {
        marginTop: '12px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        fontSize: '13px',
        color: textColor,
        textAlign: 'left',
        lineHeight: '1.8',
      };
    },
    backLinkStyle() {
      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '24px',
        fontSize: '14px',
        color: primaryColor,
        textDecoration: 'none',
        transition: 'opacity 0.2s ease',
      };
    },
  },
};
</script>

<style scoped>
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

input:focus {
  border-color: #29275B !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(41, 39, 91, 0.1);
}

button[type="submit"]:hover:not(:disabled) {
  background-color: #1e1c44 !important;
  transform: translateY(-1px);
}

button[type="submit"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

code {
  background-color: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}
</style>
