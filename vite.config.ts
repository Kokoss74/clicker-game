import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
  };
});
