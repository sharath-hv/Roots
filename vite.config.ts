import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // Relative paths in builds, so the site works under any sub-path (GitHub Pages serves it at /Roots/).
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: { port: 5173 },
}));
