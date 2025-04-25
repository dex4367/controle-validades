/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brmania': {
          'green': '#009A3D', // Verde BR Mania
          'yellow': '#FFCC29', // Amarelo BR Mania
          'dark': '#1F2937', // Cinza escuro para textos
          'light': '#F9FAFB', // Cinza claro para backgrounds
          'accent': '#FF671F', // Laranja para acentos (similar ao usado pela Petrobras)
        },
        'brmania-green': '#14B8A6', // Teal 500
        'brmania-dark': '#0F766E',  // Teal 700
        'brmania-light': '#F0FDFA', // Teal 50
        'brmania-yellow': '#FBBF24', // Amber 400
      },
      keyframes: {
        highlight: {
          '0%': { backgroundColor: 'white', transform: 'scale(1)' },
          '10%': { backgroundColor: '#009A3D', transform: 'scale(1.03)', color: 'white' }, // Verde BR Mania
          '90%': { backgroundColor: '#009A3D', transform: 'scale(1.03)', color: 'white' },
          '100%': { backgroundColor: 'white', transform: 'scale(1)' }
        },
        'highlight-subtle': {
          '0%': { backgroundColor: 'white', transform: 'scale(1)' },
          '10%': { backgroundColor: '#FFCC29', transform: 'scale(1.03)', color: 'black' }, // Amarelo BR Mania
          '90%': { backgroundColor: '#FFCC29', transform: 'scale(1.03)', color: 'black' },
          '100%': { backgroundColor: 'white', transform: 'scale(1)' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' }
        },
        scan: {
          '0%': { top: '0%' },
          '50%': { top: '97%' },
          '100%': { top: '0%' },
        }
      },
      animation: {
        highlight: 'highlight 1.5s ease-in-out',
        'highlight-subtle': 'highlight-subtle 1.5s ease-in-out',
        shake: 'shake 0.5s ease-in-out',
        scan: 'scan 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
} 