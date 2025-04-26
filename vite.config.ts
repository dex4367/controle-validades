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
    }),
    {
      name: 'disable-browser-alert',
      transform(code) {
        // Interceptar alertas do browser e desabilitá-los
        if (code.includes('window.alert') || code.includes('alert(')) {
          return code.replace(
            /(window\.)?alert\(/g, 
            'console.log('
          );
        }
        return code;
      },
    },
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