import { defineConfig, loadEnv } from 'vite'; // Import loadEnv
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => { 
  const env = loadEnv(mode, process.cwd(), '');
  const monitoringEnv = loadEnv('monitoring', process.cwd(), '');
  const mergedEnv = { ...env, ...monitoringEnv };

  return {
    define: {
      'import.meta.env.VITE_DATADOG_CLIENT_TOKEN': JSON.stringify(mergedEnv.VITE_DATADOG_CLIENT_TOKEN),
    },
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
