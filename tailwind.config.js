/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: { 'swiss-gray': '#F5F5F7', 'swiss-dark': '#1D1D1F', 'swiss-blue': '#0066CC' },
      fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'] }
    }
  },
  plugins: [],
}