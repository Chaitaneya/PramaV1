/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F9F8F6', // App background
        'card-bg': '#FCFBF9', // Card/Surface background
        primary: '#7A8B7D', // Sage green accent
        'primary-dark': '#68776B', // Muted green hover
        'primary-light': '#F0EEE9', // Muted input/accent light
        slate: '#2C2B2A', // Primary soft charcoal text
        charcoal: '#2C2B2A',
        muted: '#847E76', // Warm taupe secondary text
        border: '#E6E2D8', // Warm borders
        conflict: '#D97706',
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        'slide-in-right': 'slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-33.33%)' }
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 }
        }
      },
      fontFamily: {
        sans: ['"Inter"', 'sans-serif'], // Utilitarian for data/forms
        serif: ['"Outfit"', 'sans-serif'], // Elegant/soothing for headers/vibe (Outfit is sans-serif but we can use it as our header font)
      }
    },
  },
  plugins: [],
}
