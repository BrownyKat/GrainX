/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        ink: "#08101a",
        shell: "#0f1724",
        shell2: "#131d2b",
        panel: "#1a2637",
        line: "#26364d",
        text: "#edf2fb",
        muted: "#91a0b8",
        neon: "#23c28d",
        amber: "#d39a2f",
        danger: "#f06565",
        info: "#68a4ff",
        violet: "#8f7cf7"
      },
      fontFamily: {
        sans: ["Public Sans", "sans-serif"],
        display: ["Manrope", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      },
      boxShadow: {
        chrome: "0 18px 40px rgba(2, 8, 18, 0.34)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top left, rgba(104, 164, 255, 0.10), transparent 30%), radial-gradient(circle at top right, rgba(35, 194, 141, 0.12), transparent 26%), linear-gradient(180deg, #0a121d, #08101a)"
      }
    }
  },
  plugins: []
};
