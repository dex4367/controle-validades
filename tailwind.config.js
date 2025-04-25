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
        }
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
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(-100%)' }
        }
      },
      animation: {
        highlight: 'highlight 1.5s ease-in-out',
        'highlight-subtle': 'highlight-subtle 1.5s ease-in-out',
        shake: 'shake 0.5s ease-in-out',
        'scan-line': 'scan-line 2s ease-in-out infinite'
      }
    },
  },
  plugins: [],
} 