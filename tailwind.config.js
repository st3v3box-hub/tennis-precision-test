import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gladiators Training brand red (sampled from the logo, #E10600)
        brand: {
          50: '#fff1f0',
          100: '#ffdfdc',
          200: '#ffc4bf',
          300: '#ff9a92',
          400: '#ff5c50',
          500: '#f52a1d',
          600: '#e10600',
          700: '#b90500',
          800: '#930a05',
          900: '#5e0703',
          950: '#3a0301',
        },
        // Semantic "good / done" colour, kept green on purpose (score ≥ 8, completed, saved…)
        ok: colors.green,
        court: {
          green: '#2d6a4f',
          clay: '#c97d4e',
          hard: '#1a6b96',
        },
      },
    },
  },
  plugins: [],
};
