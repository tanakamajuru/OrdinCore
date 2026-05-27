/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#2F6CB5',
          sky: '#5B9FD4',
          ice: '#A8CDE8',
          steel: '#1A3259',
          soft: '#E2EEF8',
          bg: '#F0F6FC',
          border: '#B8D3EA',
        },
      },
      boxShadow: {
        soft: '0 28px 80px rgba(0, 0, 0, 0.14)',
      },
    },
  },
  plugins: [],
}
