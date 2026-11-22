import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Gladiators Training emblem green (sampled from the logo)
        brand: {
          50: '#eef6f0',
          100: '#d8eadc',
          200: '#b3d5bc',
          300: '#82b893',
          400: '#4f9568',
          500: '#2c7a4b',
          600: '#17663e',
          700: '#125232',
          800: '#0e4228',
          900: '#0b3a21',
          950: '#052111',
        },
        /** Deep court green for headers and dark surfaces */
        pitch: { DEFAULT: '#0b3a21', deep: '#062a17', line: '#2f6a49' },
        /** Optic ball yellow: ONLY for target zones and the live score */
        ball: { DEFAULT: '#d9f04a', soft: '#eef8b0', ink: '#3d4a05' },
        ink: '#12231a',
        paper: '#f4f6f3',
        chalk: '#e6f1e8',
        // Semantic "good / done" (scores ≥ 8, completed, saved)
        ok: colors.emerald,
        court: { green: '#2d6a4f', clay: '#c97d4e', hard: '#1a6b96' },
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Barlow Semi Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
