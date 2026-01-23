<script setup lang="ts">
import type { AdminStats } from '../../../types/admin';

defineProps<{
  stats: AdminStats;
  categoriesCount: number;
}>();
</script>

<template>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-icon stat-icon--blue">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        </svg>
      </div>
      <div>
        <p class="stat-label">Total Products</p>
        <p class="stat-value">{{ stats.totalProducts }}</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon stat-icon--green">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </div>
      <div>
        <p class="stat-label">Total Variants</p>
        <p class="stat-value">{{ stats.totalVariants }}</p>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-icon stat-icon--amber">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      </div>
      <div>
        <p class="stat-label">Categories</p>
        <p class="stat-value">{{ categoriesCount }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon--blue {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.stat-icon--green {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.stat-icon--amber {
  background-color: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.stat-label {
  font-size: 13px;
  color: var(--muted-color, #6b7280);
  margin: 0 0 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color, #2d3748);
  margin: 0;
}

/* Mobile styles */
@media (max-width: 767px) {
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }
}
</style>
