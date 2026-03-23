/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        ink: "#071019",
        shell: "#0c1520",
        shell2: "#101a28",
        panel: "#162232",
        line: "#243247",
        text: "#eef3fb",
        muted: "#9aa8bd",
        neon: "#30c48d",
        amber: "#d8a94a",
        danger: "#f07178",
        info: "#6da7ff",
        violet: "#93a2ff"
      },
      fontFamily: {
        sans: ["Public Sans", "sans-serif"],
        display: ["Manrope", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      },
      boxShadow: {
        chrome: "0 24px 60px rgba(1, 7, 18, 0.46)"
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top left, rgba(109, 167, 255, 0.16), transparent 28%), radial-gradient(circle at top right, rgba(48, 196, 141, 0.10), transparent 24%), linear-gradient(180deg, #09121c 0%, #071019 46%, #040a11 100%)"
      }
    }
  },
  plugins: []
};
