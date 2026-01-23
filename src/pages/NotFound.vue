<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
  router.push('/');
};

const goBack = () => {
  router.back();
};
</script>

<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1 class="error-title">Page Not Found</h1>
      <p class="error-message">
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>
      <div class="action-buttons">
        <button @click="goHome" class="btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          Go Home
        </button>
        <button @click="goBack" class="btn-secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #29275B 0%, #1e1c44 50%, #0f0e24 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.not-found-content {
  text-align: center;
  color: #ffffff;
  max-width: 500px;
}

.error-code {
  font-size: 150px;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #ffffff 0%, #a5a3c9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
  text-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.error-title {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #ffffff;
}

.error-message {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 32px;
  line-height: 1.6;
}

.action-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background-color: #ffffff;
  color: #29275B;
}

.btn-primary:hover {
  background-color: #f1f5f9;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.btn-secondary {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

@media (max-width: 480px) {
  .error-code {
    font-size: 100px;
  }

  .error-title {
    font-size: 24px;
  }

  .error-message {
    font-size: 14px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    justify-content: center;
  }
}
</style>
