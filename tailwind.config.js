/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
