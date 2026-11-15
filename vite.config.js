import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/pogotype/',
  test: {
    environment: 'jsdom',
    silent: 'passed-only',
    include: ['tests/**/*.test.jsx'],
    setupFiles: ['tests/setup.js']
  }
});
