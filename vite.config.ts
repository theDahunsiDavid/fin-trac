/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // PouchDB compatibility
  define: {
    global: "globalThis", // PouchDB requires global
    process: { env: {} }, // Some PouchDB modules expect process.env
  },

  optimizeDeps: {
    include: ["pouchdb"],
    exclude: ["pouchdb-find"], // Let pouchdb-find load naturally to avoid constructor issues
  },

  // Resolve configuration for better module handling
  resolve: {
    alias: {
      // Help with module resolution
      stream: "stream-browserify",
      util: "util",
    },
  },

  // Build configuration
  build: {
    commonjsOptions: {
      transformMixedEsModules: true, // Handle mixed ES/CommonJS modules
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
