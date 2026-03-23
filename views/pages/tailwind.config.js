/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.{ejs,html}",
    "./public/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#172033",
          gray: "#667085",
          border: "#d7dee7",
          green: "#23d5ab",
          blue: "#60a5fa",
          orange: "#f59e0b",
          purple: "#8b5cf6"
        }
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
};