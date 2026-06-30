import { defineConfig } from "vite";

export default defineConfig({
  // Allows PR previews to be served from a sub-path.
  // Set VITE_BASE_PATH=/warvity/pr-preview/pr-<N>/ in the preview workflow;
  // falls back to "/" for local dev and the main GitHub Pages deployment.
  base: process.env["VITE_BASE_PATH"] ?? "/",
});
