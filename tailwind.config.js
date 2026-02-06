/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        slate: "#1f2937",
        mist: "#f5f5f4",
        ocean: "#0f172a",
        tide: "#0ea5e9",
        sand: "#fef3c7"
      }
    }
  },
  plugins: []
};
