<script setup lang="ts">
defineProps<{
  title: string;
  isMobile: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-sidebar'): void;
}>();
</script>

<template>
  <header class="admin-header">
    <div class="header-left">
      <button @click="emit('toggle-sidebar')" class="menu-btn" aria-label="Toggle sidebar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <h1 class="page-title">{{ title }}</h1>
    </div>
    <router-link to="/planner" class="view-site-link" title="View Site">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
      <span class="view-site-text">View Site</span>
    </router-link>
  </header>
</template>

<style scoped>
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 12px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-btn {
  padding: 8px;
  border: none;
  border-radius: 8px;
  background-color: transparent;
  cursor: pointer;
  color: var(--text-color, #2d3748);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.menu-btn:hover {
  background-color: #f1f5f9;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color, #2d3748);
  margin: 0;
}

.view-site-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  background-color: #f1f5f9;
  color: var(--text-color, #2d3748);
  font-size: 14px;
  text-decoration: none;
  transition: background-color 0.2s ease;
  flex-shrink: 0;
}

.view-site-link:hover {
  background-color: #e2e8f0;
}

/* Mobile styles */
@media (max-width: 767px) {
  .admin-header {
    padding: 12px 16px;
  }

  .page-title {
    font-size: 16px;
  }

  .view-site-text {
    display: none;
  }
}
</style>
