import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0f1c3f",
          50: "#eef0f6",
          100: "#d6dbe9",
          200: "#adb7d3",
          300: "#8493bd",
          400: "#5b6fa7",
          500: "#3a4c85",
          600: "#243468",
          700: "#17264f",
          800: "#0f1c3f",
          900: "#0a1330"
        },
        estado: {
          pendiente: "#b8860b",
          aprobada: "#1c7c3f",
          rechazada: "#b91c1c",
          surtida: "#0f1c3f"
        }
      },
      fontFamily: {
        sans: ["Segoe UI", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
