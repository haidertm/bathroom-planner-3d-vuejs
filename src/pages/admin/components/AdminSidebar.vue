<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  collapsed: boolean;
  username: string;
  isMobile: boolean;
  showMobileSidebar: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-collapse'): void;
  (e: 'close-mobile'): void;
  (e: 'logout'): void;
}>();

const userInitial = computed(() => props.username.charAt(0).toUpperCase());
</script>

<template>
  <aside
    class="admin-sidebar"
    :class="{
      'collapsed': collapsed && !isMobile,
      'mobile-open': showMobileSidebar
    }"
  >
    <div class="sidebar-header">
      <div class="logo">
        <img src="/assets/logo.svg" alt="Logo" class="logo-image" />
      </div>
      <span v-if="!collapsed || isMobile" class="logo-text">Admin Panel</span>
      <button v-if="isMobile" @click="emit('close-mobile')" class="mobile-close-btn" aria-label="Close sidebar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <nav class="sidebar-nav">
      <button class="nav-item active">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
        <span v-if="!collapsed || isMobile">Products</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="avatar">{{ userInitial }}</div>
        <span v-if="!collapsed || isMobile" class="username">{{ username }}</span>
      </div>
      <button @click="emit('logout')" class="logout-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span v-if="!collapsed || isMobile">Logout</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.admin-sidebar {
  width: 240px;
  background-color: var(--primary-color, #29275B);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 100;
}

.admin-sidebar.collapsed {
  width: 72px;
}

.sidebar-header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo {
  width: 100px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: #ffffff;
  border-radius: 6px;
  padding: 4px 8px;
}

.collapsed .logo {
  width: 40px;
  padding: 4px;
}

.logo-image {
  width: 100%;
  height: auto;
  object-fit: contain;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
  flex: 1;
}

.mobile-close-btn {
  background: none;
  border: none;
  color: #ffffff;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-left: auto;
}

.mobile-close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.nav-item.active {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.username {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.logout-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* Mobile styles */
@media (max-width: 767px) {
  .admin-sidebar {
    display: none !important;
    width: 260px !important;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3) !important;
  }

  .admin-sidebar.mobile-open {
    display: flex !important;
  }

  .admin-sidebar.collapsed {
    width: 260px;
  }
}
</style>
