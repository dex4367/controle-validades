import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Desativar checagem de tipos TypeScript
      babel: {
        plugins: [
          ['@babel/plugin-transform-typescript', { allowNamespaces: true }]
        ]
      }
    })
  ],
  build: {
    // Pular a verificação TypeScript durante o build
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  esbuild: {
    // Ignorar erros de TypeScript durante a compilação
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
}) 