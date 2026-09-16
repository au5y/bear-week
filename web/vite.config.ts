import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 so phones on the same wifi can reach `npm run dev`.
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
