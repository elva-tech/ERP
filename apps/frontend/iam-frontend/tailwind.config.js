/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        elvaDark: '#0A192F',
        elvaBlue: '#2563EB',
      }
    },
  },
  plugins: [],
}