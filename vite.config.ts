/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // PouchDB compatibility
  define: {
    global: "globalThis", // PouchDB requires global
    process: { env: {} }, // Some PouchDB modules expect process.env
  },

  optimizeDeps: {
    include: ["react", "react-dom", "uuid", "js-md5"],
    exclude: ["spark-md5", "immediate", "vuvuzela", "events"],
    force: true, // Force re-optimization
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },

  // Resolve configuration for better module handling
  resolve: {
    alias: {
      // Help with module resolution
      stream: "stream-browserify",
      util: "util",
      // Fix events import issue by using our shim
      events: path.resolve(__dirname, "src/events-shim.js"),
      // Fix spark-md5 import issue by using our shim
      "spark-md5": path.resolve(__dirname, "src/spark-md5-shim.js"),
      // Fix immediate import issue
      immediate: path.resolve(__dirname, "src/immediate-shim.js"),
      // Fix vuvuzela import issue
      vuvuzela: path.resolve(__dirname, "src/vuvuzela-shim.js"),
    },
  },

  // Build configuration
  build: {
    target: "esnext",
    commonjsOptions: {
      transformMixedEsModules: true, // Handle mixed ES/CommonJS modules
      include: [
        /pouchdb/,
        /spark-md5/,
        /immediate/,
        /vuvuzela/,
        /events/,
        /node_modules/,
      ], // Include problematic modules
      ignoreDynamicRequires: true,
    },
    rollupOptions: {
      external: [],
      output: {
        manualChunks: (id) => {
          if (
            id.includes("pouchdb") ||
            id.includes("spark-md5") ||
            id.includes("immediate") ||
            id.includes("vuvuzela") ||
            id.includes("events")
          ) {
            return "pouchdb";
          }
          if (id.includes("react") && !id.includes("recharts")) {
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
