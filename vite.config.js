import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    historyApiFallback: true,
    host: '0.0.0.0',
    port: 3000,
    hmr: {
      clientPort: 3000,
    },
    allowedHosts: ['.e2b.app', '.e2b.dev'],
  },
})