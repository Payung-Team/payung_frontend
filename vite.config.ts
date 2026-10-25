import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      // PYG-700: กันหลุด — ตอน build ถือว่า console.log/debug/info ไม่มีผลข้างเคียงแล้วตัดทิ้ง
      //   warn/error ยังอยู่ให้ตรวจปัญหาได้ · ตอน dev (vite) ไม่กระทบ
      treeshake: { manualPureFunctions: ['console.log', 'console.debug', 'console.info'] },
    },
  },
  server: {
    allowedHosts: ['mud-shale-onshore.ngrok-free.dev'],
  },
  optimizeDeps: {
    include: ['@apollo/client', 'graphql'],
    exclude: [],
    force: true,
  },
  build: {
    rolldownOptions: {
      // production: console เงียบทั้งหมด (log/warn/error) และตัด debugger — dev ไม่ได้รับผลกระทบ
      output: { minify: { compress: { dropConsole: true, dropDebugger: true } } },
    },
  },
  ssr: {
    noExternal: ['@apollo/client', 'graphql'],
  },
})
