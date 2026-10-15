import { defineConfig } from 'vite';

// relative paths, so the built game runs from any sub-path (GitHub Pages serves it under /WaterPark/)
export default defineConfig({ base: './' });
