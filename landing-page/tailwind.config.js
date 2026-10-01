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
        // Day-mode "middle blue" palette (Website day mode spec, 29 Sep 2026).
        brand: {
          DEFAULT: '#28536F',  // Deep steel blue — primary buttons
          sky: '#326B94',      // Muted blue — links & secondary details
          ice: '#D4E0EA',
          steel: '#172B3B',    // Deep navy — headings & primary text
          soft: '#E6EDF2',     // Pale blue grey — alternating sections
          bg: '#DDE7EF',       // Slate blue — main page background
          border: '#C6D5E1',
          teal: '#3C9C98',     // Teal — small highlights & selected states
        },
        // Recolour the landing's green accent family onto the day-mode teal so existing emerald-*
        // classes render in-palette (teal highlights) without touching every usage.
        emerald: {
          50: '#EAF5F4', 100: '#D4EBEA', 200: '#AEDAD8', 300: '#86C7C3',
          400: '#5FB8B4', 500: '#3C9C98', 600: '#2F7E7B', 700: '#276966',
          800: '#21534F', 900: '#1B3F3C', 950: '#102523',
        },
      },
      boxShadow: {
        soft: '0 28px 80px rgba(0, 0, 0, 0.14)',
      },
    },
  },
  plugins: [],
}
