import type { Config } from "tailwindcss";

/**
 * Phlare design system. A restrained, professional palette: a cool near-white
 * canvas, hairline borders, near-black ink, and a single confident
 * cobalt-indigo accent. No pure black/white, no default-blue "SaaS template" feel.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neutral ink/surface scale (cool, slightly desaturated).
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#dfe2e8",
          300: "#c7ccd6",
          400: "#9aa1b1",
          500: "#6b7384",
          600: "#4d5462",
          700: "#3a404c",
          800: "#272b34",
          900: "#181b21",
        },
        // Confident cobalt-indigo accent.
        brand: {
          50: "#eef1fb",
          100: "#dde3f6",
          200: "#c0ccee",
          300: "#99ace1",
          400: "#6f86d2",
          500: "#4d63c0",
          600: "#3d50b0",
          700: "#33438f",
          800: "#2d3a73",
          900: "#29345f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.625rem", // 10px
        xl: "0.75rem", // 12px
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(24 27 33 / 0.04), 0 1px 3px 0 rgb(24 27 33 / 0.05)",
        pop: "0 4px 12px -2px rgb(24 27 33 / 0.10), 0 2px 6px -2px rgb(24 27 33 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
