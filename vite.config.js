import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // keep "/" unless you deploy under a subfolder
  server: {
    host: true,                // allows external access (Render, LAN, etc.)
    port: 5173,                // local dev port
    allowedHosts: ['toon-nation-814.onrender.com'] // note: plural
  },
  preview: {
    host: true,
    port: 8080
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
})
