/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aztks: {
          black: '#0d0d0d',    
          grey: '#1a1a1a',     
          orange: '#f05a28',   
          green: '#2ecc71',    
          white: '#f5f5f5',    
        }
      },
      fontFamily: {
        sans: ['Urbanist', 'sans-serif'],
        display: ['Oswald', 'sans-serif'],
      }
    },
  },
  plugins: [],
}