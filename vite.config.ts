import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// w-lush web — Vite + React 18 + TS
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
});
