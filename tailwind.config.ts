import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          500: "#3b6cff",
          600: "#2d54e0",
          700: "#2342b8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
