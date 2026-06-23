import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['f52f-2403-6200-88a4-5bc1-d48-30ac-987b-dec6.ngrok-free.app'],
  },
  optimizeDeps: {
    include: ['@apollo/client', 'graphql'],
    exclude: [],
    force: true,
  },
  ssr: {
    noExternal: ['@apollo/client', 'graphql'],
  },
})
