/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        grey900: '#1A1A1A',
        grey600: '#666666',
        light200: '#D6D9DC',
        canvas: '#F9FAFB',
        brand: '#5057EA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Denton', 'Georgia', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
