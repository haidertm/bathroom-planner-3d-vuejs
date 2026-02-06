import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@components": fileURLToPath(new URL("./src/components", import.meta.url)),
      "@services": fileURLToPath(new URL("./src/services", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
      "@composables": fileURLToPath(new URL("./src/composables", import.meta.url)),
      "@constants": fileURLToPath(new URL("./src/constants", import.meta.url)),
      "@debug": fileURLToPath(new URL("./src/debug", import.meta.url)),
      "@models": fileURLToPath(new URL("./src/models", import.meta.url)),
      "@pages": fileURLToPath(new URL("./src/pages", import.meta.url)),
    },
  },
});
