import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Disable sourcemaps in production for smaller files
    sourcemap: false,
    // Warn if chunks exceed 1MB
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Three.js is large - separate chunk for caching
          'three': ['three'],
          // Vue core - separate chunk
          'vue-vendor': ['vue', 'vue-router'],
          // Analytics/tracking - separate chunk (lazy loaded anyway)
          'analytics': ['@gtm-support/vue-gtm', '@openreplay/tracker', '@openreplay/tracker-assist'],
        },
      },
    },
    // Minification settings
    minify: 'esbuild',
  },
  // Pre-bundle dependencies for faster dev server
  optimizeDeps: {
    include: ['three', 'vue', 'vue-router'],
  },
});
