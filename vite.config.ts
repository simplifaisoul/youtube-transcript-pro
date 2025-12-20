import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Exclude API directory from Vite build - Vercel handles it separately
  publicDir: 'public',
  build: {
    rollupOptions: {
      external: ['api/**'],
    },
  },
})
