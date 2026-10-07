/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        scada: { bg: '#0b1220', panel: '#111a2e', line: '#22304d', accent: '#22d3ee' },
      },
    },
  },
  plugins: [],
};
