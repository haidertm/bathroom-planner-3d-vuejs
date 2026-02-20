import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";

// Inline small entry CSS into HTML to eliminate render-blocking requests
function inlineEntryCSS(): Plugin {
  return {
    name: 'inline-entry-css',
    enforce: 'post',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html;

        for (const [fileName, chunk] of Object.entries(ctx.bundle)) {
          // Only inline entry-level CSS (index-*.css), skip route-level CSS
          if (
            chunk.type === 'asset' &&
            fileName.endsWith('.css') &&
            /index-[^/]+\.css$/.test(fileName)
          ) {
            const css = typeof chunk.source === 'string'
              ? chunk.source
              : new TextDecoder('utf-8').decode(chunk.source);
            // Only inline if under 16 KiB
            if (css.length <= 16384) {
              const linkRegex = new RegExp(
                `<link[^>]*href="[^"]*${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/?>`
              );
              html = html.replace(linkRegex, `<style>${css}</style>`);
              delete ctx.bundle[fileName];
            }
          }
        }
        return html;
      },
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), inlineEntryCSS()],
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Exclude analytics chunks from modulepreload hints
    modulePreload: {
      resolveDependencies: (_filename, deps) => {
        return deps.filter(dep => !dep.includes('gtm') && !dep.includes('openreplay'));
      },
    },
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
          // Analytics/tracking - separate chunks so they load independently
          if (id.includes('node_modules/@gtm-support/')) {
            return 'gtm-vendor';
          }
          if (id.includes('node_modules/@openreplay/')) {
            return 'openreplay-vendor';
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
