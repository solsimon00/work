import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build de la web app "¿Con qué pago?" para Vercel: solo la carpeta ahorro/, servida en la raíz del dominio.
export default defineConfig({
  root: 'ahorro',
  base: '/',
  plugins: [react()],
  build: { outDir: '../dist-app', emptyOutDir: true },
})
