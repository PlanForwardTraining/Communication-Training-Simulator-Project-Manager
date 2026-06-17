/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: 'rgb(var(--navy-900) / <alpha-value>)',
          800: 'rgb(var(--navy-800) / <alpha-value>)',
          700: 'rgb(var(--navy-700) / <alpha-value>)',
          600: 'rgb(var(--navy-600) / <alpha-value>)',
          500: 'rgb(var(--navy-500) / <alpha-value>)',
        },
        gold: {
          400: 'rgb(var(--gold-400) / <alpha-value>)',
          500: 'rgb(var(--gold-500) / <alpha-value>)',
          600: 'rgb(var(--gold-600) / <alpha-value>)',
        },
        slate: {
          text: 'rgb(var(--slate-text) / <alpha-value>)',
          muted: 'rgb(var(--slate-muted) / <alpha-value>)',
        },
        disc: {
          D: '#EF4444',
          I: '#F59E0B',
          S: '#22C55E',
          C: '#3B82F6',
        },
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
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
