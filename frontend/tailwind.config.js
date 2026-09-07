/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        farm: {
          50: '#f4f8f0',
          100: '#e5efdc',
          200: '#cbe0ba',
          300: '#a6ca85',
          400: '#7faf57',
          500: '#5f9439',
          600: '#47762a',
          700: '#375d22',
          800: '#2e4c1f',
          900: '#26401c',
        },
        harvest: {
          50: '#fdf9ef',
          100: '#f8efd4',
          200: '#f0dda6',
          300: '#e6c46e',
          400: '#dcaa40',
          500: '#cb9025',
          600: '#b0701c',
        },
      },
      boxShadow: {
        soft: '0 2px 12px rgba(38, 64, 28, 0.08)',
      },
    },
  },
  plugins: [],
}