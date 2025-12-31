<template>
  <div class="product-edit-page">
    <div class="page-header">
      <button @click="goBack" class="back-button">
        &larr; Back to Dashboard
      </button>
      <h1>Edit Product</h1>
    </div>

    <div v-if="loading" class="loading">
      Loading product...
    </div>

    <div v-else-if="error" class="error">
      {{ error }}
      <button @click="goBack">Go Back</button>
    </div>

    <ProductForm
      v-else-if="product"
      :product="product"
      mode="edit"
      @save="handleSave"
      @cancel="goBack"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ProductForm from './ProductForm.vue';
import { productApi } from '../../services/api';
import type { AdminProduct } from '../../types/admin';

const route = useRoute();
const router = useRouter();

const product = ref<AdminProduct | null>(null);
const loading = ref(true);
const error = ref('');

const goBack = () => {
  router.push('/vadmin/dashboard');
};

const fetchProduct = async () => {
  const productId = route.params.id as string;

  try {
    loading.value = true;
    error.value = '';

    // getProduct already returns transformed AdminProduct
    product.value = await productApi.getProduct(Number(productId));
  } catch (err: any) {
    console.error('Error fetching product:', err);
    error.value = err.message || 'Failed to load product';
  } finally {
    loading.value = false;
  }
};

const handleSave = async (updatedProduct: AdminProduct) => {
  try {
    const productId = route.params.id as string;

    await productApi.updateProduct(Number(productId), updatedProduct);

    // Go back to dashboard
    router.push('/vadmin/dashboard');
  } catch (err: any) {
    console.error('Error saving product:', err);
    error.value = err.message || 'Failed to save product';
  }
};

onMounted(() => {
  fetchProduct();
});
</script>

<style scoped>
.product-edit-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #1a1a1a;
}

.back-button {
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;
}

.back-button:hover {
  background: #e8e8e8;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #666;
  font-size: 16px;
}

.error {
  text-align: center;
  padding: 48px;
  color: #e53935;
  font-size: 16px;
}

.error button {
  margin-top: 16px;
  padding: 8px 16px;
  background: #e53935;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
