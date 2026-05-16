import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // IMPORTANT: tells Vite where your real source code is
  root: path.resolve(__dirname, "../.."), // adjust if needed

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../src"),
    },
  },

  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
