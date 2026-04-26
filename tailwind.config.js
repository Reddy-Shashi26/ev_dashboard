/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      }
      ,
      colors: {
        'accent-pink': '#ff0066',
        'accent-pink-strong': '#ff2a7a',
        'accent-cyan': '#00d8ff',
        'accent-green': '#00ff9d',
      }
    },
  },
  plugins: [],
};
