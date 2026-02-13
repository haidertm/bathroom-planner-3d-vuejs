import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Warn if chunks exceed 1MB
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Function-based manual chunk splitting to avoid runtime conflicts
        manualChunks(id: string): string | undefined {
          // Three.js is large - separate chunk for caching
          if (id.includes('node_modules/three/')) {
            return 'three';
          }
          // Vue core - separate chunk
          if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/')) {
            return 'vue-vendor';
          }
          // Analytics/tracking - separate chunk (lazy loaded anyway)
          if (
            id.includes('node_modules/@gtm-support/')
          ) {
            return 'analytics';
          }
          // Let Rollup handle other modules with default splitting
          return undefined;
        },
      },
    },
  },
  // Pre-bundle dependencies for faster dev server
  optimizeDeps: {
    include: ['three', 'vue', 'vue-router'],
  },
});
