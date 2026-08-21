/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  optimizeDeps: {
    include: ["react", "react-dom"],
  },

  // Build configuration
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react")) {
            return "react-vendor";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
      },
    },
  },

  // Server configuration for development
  server: {
    fs: {
      // Allow serving files from one level up
      allow: [".."],
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
