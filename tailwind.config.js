/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gorb: {
          green: '#7CFFB2',
          'green-dark': '#4be38a',
          'green-light': '#eafff4',
          accent: '#1a1a1a',
          bg: '#f8fff9',
          'bg-dark': '#181f1b',
        },
      },
      fontFamily: {
        gorb: ['Inter', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        gorb: '18px',
      },
    },
  },
  plugins: [],
};
