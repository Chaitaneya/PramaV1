/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FDFCF0',
        slate: '#34495E',
        charcoal: '#111827',
        primary: '#1D4ED8',
        'primary-light': '#EFF6FF',
        'primary-dark': '#1E3A8A',
        conflict: '#E67E22',
        border: 'rgba(52,73,94,0.12)',
        'card-bg': '#FFFFFF',
        muted: '#7A8FA6',
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
        sans: ['"Outfit"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      }
    },
  },
  plugins: [],
}
