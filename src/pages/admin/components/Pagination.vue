<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}>();

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void;
  (e: 'update:itemsPerPage', count: number): void;
}>();

const startItem = computed(() => ((props.currentPage - 1) * props.itemsPerPage) + 1);
const endItem = computed(() => Math.min(props.currentPage * props.itemsPerPage, props.totalItems));

const pageNumbers = computed(() => {
  const pages: number[] = [];
  const total = props.totalPages;
  const current = props.currentPage;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 3) {
      pages.push(1, 2, 3, 4, -1, total);
    } else if (current >= total - 2) {
      pages.push(1, -1, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, -1, current - 1, current, current + 1, -1, total);
    }
  }

  return pages;
});

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages) {
    emit('update:currentPage', page);
  }
};

const handleItemsPerPageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement;
  emit('update:itemsPerPage', Number(target.value));
};

// Keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowLeft' && props.currentPage > 1) {
    goToPage(props.currentPage - 1);
  } else if (event.key === 'ArrowRight' && props.currentPage < props.totalPages) {
    goToPage(props.currentPage + 1);
  } else if (event.key === 'Home') {
    goToPage(1);
  } else if (event.key === 'End') {
    goToPage(props.totalPages);
  }
};
</script>

<template>
  <div
    v-if="totalPages > 1 && totalItems > 0"
    class="pagination"
    role="navigation"
    aria-label="Pagination"
    @keydown="handleKeydown"
    tabindex="0"
  >
    <div class="pagination-info">
      Showing {{ startItem }} to {{ endItem }} of {{ totalItems }}
    </div>

    <div class="pagination-buttons">
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="pagination-btn"
        aria-label="Previous page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      <template v-for="page in pageNumbers" :key="page">
        <span v-if="page === -1" class="pagination-ellipsis" aria-hidden="true">...</span>
        <button
          v-else
          @click="goToPage(page)"
          class="pagination-btn"
          :class="{ 'active': page === currentPage }"
          :aria-current="page === currentPage ? 'page' : undefined"
          :aria-label="`Page ${page}`"
        >
          {{ page }}
        </button>
      </template>

      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="pagination-btn"
        aria-label="Next page"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>

    <select
      :value="itemsPerPage"
      @change="handleItemsPerPageChange"
      class="items-per-page-select"
      aria-label="Items per page"
    >
      <option :value="12">12 per page</option>
      <option :value="24">24 per page</option>
      <option :value="48">48 per page</option>
    </select>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding: 16px 20px;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.pagination:focus {
  outline: 2px solid var(--primary-color, #29275B);
  outline-offset: 2px;
}

.pagination-info {
  font-size: 13px;
  color: var(--muted-color, #6b7280);
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  background-color: #ffffff;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-color, #2d3748);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #f8fafc;
  border-color: #cbd5e1;
}

.pagination-btn:focus {
  outline: 2px solid var(--primary-color, #29275B);
  outline-offset: 2px;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-btn.active {
  background-color: var(--primary-color, #29275B);
  border-color: var(--primary-color, #29275B);
  color: #ffffff;
}

.pagination-ellipsis {
  padding: 0 8px;
  color: var(--muted-color, #6b7280);
}

.items-per-page-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 8px;
  font-size: 13px;
  background-color: #ffffff;
  cursor: pointer;
}

.items-per-page-select:focus {
  outline: none;
  border-color: var(--primary-color, #29275B);
  box-shadow: 0 0 0 3px rgba(41, 39, 91, 0.1);
}

/* Mobile styles */
@media (max-width: 767px) {
  .pagination {
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
  }

  .pagination-info {
    display: none;
  }

  .pagination-btn {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    font-size: 12px;
  }
}
</style>
