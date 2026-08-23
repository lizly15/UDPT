/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1f4e79", 600: "#2c6598" },
        accent: "#0ea5e9",
      },
    },
  },
  plugins: [],
};
