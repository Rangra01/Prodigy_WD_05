import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the browser talks only to the Vite server; any
    // /api request is forwarded to the Express backend. This keeps
    // everything same-origin, so the HTTP-only auth cookie just works.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
});
