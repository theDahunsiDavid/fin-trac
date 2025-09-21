/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // PouchDB compatibility (commented out until npm packages are installed)
  // define: {
  //   global: "globalThis", // PouchDB requires global
  // },

  // optimizeDeps: {
  //   include: ["pouchdb", "pouchdb-find"],
  //   exclude: ["pouchdb-find"], // Let Vite handle the find plugin properly
  // },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
