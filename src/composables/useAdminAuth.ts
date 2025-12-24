// Admin Authentication Composable
import { ref, computed, readonly } from 'vue';
import type { AdminUser, AdminSession } from '../types/admin';

// Storage keys
const STORAGE_KEY = 'admin_session';
const ADMIN_CREDENTIALS_KEY = 'admin_credentials';

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Simple hash function for password (in production, use bcrypt on backend)
const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + password.length.toString(36);
};

// Generate session token
const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Reactive state
const currentUser = ref<AdminUser | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Initialize default admin if not exists
const initializeDefaultAdmin = (): void => {
  const existingCredentials = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
  if (!existingCredentials) {
    // Default admin credentials (username: admin, password: admin123)
    const defaultCredentials = {
      username: 'admin',
      passwordHash: hashPassword('admin123'),
    };
    localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(defaultCredentials));
  }
};

// Load session from storage
const loadSession = (): AdminSession | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const session: AdminSession = JSON.parse(stored);

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

// Save session to storage
const saveSession = (session: AdminSession): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

// Clear session
const clearSession = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export function useAdminAuth() {
  // Initialize
  initializeDefaultAdmin();

  // Try to restore session on first use
  const existingSession = loadSession();
  if (existingSession) {
    currentUser.value = existingSession.user;
  }

  // Computed properties
  const isAuthenticated = computed(() => currentUser.value?.isAuthenticated ?? false);
  const username = computed(() => currentUser.value?.username ?? '');

  // Login function
  const login = async (inputUsername: string, inputPassword: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      // Simulate network delay for security (prevents brute force timing attacks)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get stored credentials
      const storedCredentials = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
      if (!storedCredentials) {
        error.value = 'Admin credentials not configured';
        return false;
      }

      const credentials = JSON.parse(storedCredentials);
      const inputHash = hashPassword(inputPassword);

      // Validate credentials
      if (credentials.username !== inputUsername || credentials.passwordHash !== inputHash) {
        error.value = 'Invalid username or password';
        return false;
      }

      // Create user object
      const user: AdminUser = {
        username: inputUsername,
        isAuthenticated: true,
        loginTime: Date.now(),
      };

      // Create session
      const session: AdminSession = {
        token: generateToken(),
        expiresAt: Date.now() + SESSION_DURATION,
        user,
      };

      // Save and update state
      saveSession(session);
      currentUser.value = user;

      return true;
    } catch (e) {
      error.value = 'An error occurred during login';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // Logout function
  const logout = (): void => {
    clearSession();
    currentUser.value = null;
    error.value = null;
  };

  // Check if session is valid
  const validateSession = (): boolean => {
    const session = loadSession();
    if (!session) {
      currentUser.value = null;
      return false;
    }
    currentUser.value = session.user;
    return true;
  };

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      const storedCredentials = localStorage.getItem(ADMIN_CREDENTIALS_KEY);
      if (!storedCredentials) {
        error.value = 'Admin credentials not found';
        return false;
      }

      const credentials = JSON.parse(storedCredentials);
      const currentHash = hashPassword(currentPassword);

      // Verify current password
      if (credentials.passwordHash !== currentHash) {
        error.value = 'Current password is incorrect';
        return false;
      }

      // Validate new password
      if (newPassword.length < 6) {
        error.value = 'New password must be at least 6 characters';
        return false;
      }

      // Update password
      credentials.passwordHash = hashPassword(newPassword);
      localStorage.setItem(ADMIN_CREDENTIALS_KEY, JSON.stringify(credentials));

      return true;
    } catch {
      error.value = 'An error occurred while changing password';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  // Clear error
  const clearError = (): void => {
    error.value = null;
  };

  return {
    // State (readonly for external access)
    currentUser: readonly(currentUser),
    isAuthenticated,
    username,
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Methods
    login,
    logout,
    validateSession,
    changePassword,
    clearError,
  };
}
