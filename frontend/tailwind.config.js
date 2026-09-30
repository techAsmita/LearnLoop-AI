/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",

  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f3ff",
          100: "#ebe9ff",
          200: "#d9d5ff",
          300: "#bcb5ff",
          400: "#988dff",
          500: "#635bff",
          600: "#554ce8",
          700: "#463dcc",
          800: "#3933a5",
          900: "#302d82",
          950: "#201f58",
        },

        violet: {
          500: "#8b5cf6",
          600: "#7c3aed",
        },

        pink: {
          500: "#ec4899",
          600: "#db2777",
        },

        surface: {
          50: "#f7f7fc",
          100: "#f0eff8",
          200: "#e6e5f0",
          800: "#151632",
          900: "#101126",
          950: "#08091b",
        },
      },

      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "sans-serif",
        ],
      },

      boxShadow: {
        card:
          "0 8px 30px rgba(45, 42, 80, 0.055)",

        "card-dark":
          "0 10px 35px rgba(0, 0, 0, 0.22)",

        glow:
          "0 0 30px rgba(99, 91, 255, 0.22)",
      },

      borderRadius: {
        "4xl": "2rem",
      },
    },
  },

  plugins: [],
};