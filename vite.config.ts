import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages: https://username.github.io/family-kakeibo/
  base: '/family-kakeibo/',
});
