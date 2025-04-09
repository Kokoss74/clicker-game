/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vitest/config';
import { defineConfig as defineViteConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
const viteConfig = defineViteConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5556,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

const vitestConfig = defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts', // We'll create this file next
    // You can add coverage configuration here later if needed
    // coverage: {
    //   provider: 'v8', // or 'istanbul'
    //   reporter: ['text', 'json', 'html'],
    // },
  },
});

export default mergeConfig(viteConfig, vitestConfig);
