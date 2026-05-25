import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/layouts/**/*.{ts,tsx}",
    "./src/modules/**/*.{ts,tsx}",
    "./src/shared/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 18px 70px rgba(15, 23, 42, 0.08)",
        soft: "0 10px 30px rgba(15, 23, 42, 0.06)"
      },
      colors: {
        ink: "#101114",
        graphite: "#1f2329",
        canvas: "#f6f7f9",
        line: "#e8eaee",
        positive: "#16a34a",
        warning: "#d97706",
        danger: "#dc2626",
        brand: "#0f766e",
        accent: "#4f46e5"
      }
    }
  },
  plugins: []
};

export default config;
