import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)"],
        serif: ["var(--font-playfair)"],
      },
      colors: {
        // Brand color system - inspired by IntiMate luxury style
        brand: {
          bg: "var(--background)",
          text: "var(--foreground)",
          primary: "var(--primary)",
          "primary-foreground": "var(--primary-foreground)",
          secondary: "var(--secondary)",
          "secondary-foreground": "var(--secondary-foreground)",
          accent: "var(--accent)",
          "accent-foreground": "var(--accent-foreground)",
          muted: "var(--muted)",
          "muted-text": "var(--muted-foreground)",
          border: "var(--border)",
        },
        // Dynamic primary color - uses CSS variables from SSR
        primary: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
          950: "var(--primary-950)",
          DEFAULT: "var(--primary-500)",
        },
        // Rose palette - mapped to primary CSS variables for dynamic theming
        rose: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
          950: "var(--primary-950)",
        },
      },
      spacing: {
        "128": "32rem",
        "160": "40rem",
      },
    },
  },
  plugins: [],
};
export default config;
