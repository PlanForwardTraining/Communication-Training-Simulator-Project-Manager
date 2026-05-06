/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B1426',
          800: '#111D35',
          700: '#1A2B4A',
          600: '#1E3A5F',
          500: '#2A4A75',
        },
        gold: {
          400: '#E8C96A',
          500: '#C9A84C',
          600: '#A8882E',
        },
        slate: {
          text: '#F0EDE8',
          muted: '#8A9BB5',
        },
        disc: {
          D: '#EF4444',
          I: '#F59E0B',
          S: '#22C55E',
          C: '#3B82F6',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        wordmark: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        gold: '0 0 20px rgba(201,168,76,0.3)',
      },
    },
  },
  plugins: [],
};
