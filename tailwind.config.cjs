module.exports = {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{ts,tsx}",
    "./contexts/**/*.tsx",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f4ef",
        surface: "#ffffff",
        inset: "#efeee8",
        line: "#e0e3db",
        ink: "#24362e",
        body: "#46564d",
        muted: "#65746b",
        quiet: "#738178",
        slate: { 750: "#2d3748", 850: "#1a202c" },
        indigo: {
          50: "#edf5ef",
          100: "#e3eee6",
          200: "#c8dece",
          300: "#81aa90",
          400: "#4d7d60",
          500: "#386b50",
          600: "#315f49",
          700: "#244a38",
          800: "#1c3b2c",
          900: "#172f24",
          950: "#0f2118",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
