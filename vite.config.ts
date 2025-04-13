import { loadEnv } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineVitestConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const monitoringEnv = loadEnv('monitoring', process.cwd(), '');
  const mergedEnv = { ...env, ...monitoringEnv };

  return {
    // Define env variables to be available in the client-side code
    define: Object.keys(mergedEnv).reduce((acc: Record<string, string>, key) => {
      if (key.startsWith('VITE_')) {
        acc[`import.meta.env.${key}`] = JSON.stringify(mergedEnv[key]);
      }
      return acc;
    }, {}),
    plugins: [react()],
    server: {
      host: true,
      port: 5556
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Vitest configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests-e2e/**',
        '**/.{idea,git,cache,output,temp}/**'
      ],
      // You can add coverage configuration here later if needed
      // coverage: {
      //   provider: 'v8', // or 'istanbul'
      //   reporter: ['text', 'json', 'html'],
      // },
    },
  };
});
