import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Pular a verificação TypeScript durante o build
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}) 