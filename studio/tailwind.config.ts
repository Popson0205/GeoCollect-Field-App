// studio/tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary brand — blue
        primary: {
          DEFAULT: "#2563eb",
          dark:    "#1d4ed8",
          light:   "#eff6ff",
        },
        // Geo palette
        geo: {
          green:  "#16a34a",
          amber:  "#d97706",
          red:    "#dc2626",
          teal:   "#0d9488",
        },
        // Surface / border
        surface: {
          DEFAULT: "#ffffff",
          2:       "#f8fafc",
          border:  "#e2e8f0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl:  "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        sm:  "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        md:  "0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        lg:  "0 10px 24px -4px rgb(0 0 0 / 0.10), 0 4px 8px -4px rgb(0 0 0 / 0.06)",
        xl:  "0 20px 40px -8px rgb(0 0 0 / 0.14)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
