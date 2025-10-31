import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
 plugins:[react()],
 server:{
    allowedHost:
    ['toon-nation-814.onrender.com']
 },
})