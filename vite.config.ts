import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Configuração do Babel para o React
      babel: {
        presets: [
          ['@babel/preset-react', { runtime: 'automatic' }],
          ['@babel/preset-typescript', { isTSX: true, allExtensions: true }]
        ],
        plugins: [
          ['@babel/plugin-transform-typescript', { allowNamespaces: true, isTSX: true }]
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
    rollupOptions: {
      external: [
        // Adicionar o CSS do react-datepicker como externo para evitar erro de build
        'react-datepicker/dist/react-datepicker.css'
      ]
    }
  },
  esbuild: {
    // Ignorar erros de TypeScript durante a compilação
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
}) 