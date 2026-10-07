import type { Config } from "tailwindcss";

// Palette "Ruhig": Petrol + Sand. Ampel-Farben (good/caution/bad) sind nur für die Bewertung reserviert;
// *-text sind dunklere Töne für Schrift auf hellem Grund (AA-Kontrast), die Grundtöne für Balken und Flächen.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#0F766E", dark: "#0B5A53", soft: "#E3EFEC" },
        accent: { DEFAULT: "#F4A261", dark: "#E08F4E", soft: "#FCEBD9", text: "#9A5516" },
        ink: "#17302E",
        surface: "#F7F5F0",
        good: { DEFAULT: "#2E9E6B", text: "#1F7A52", dark: "#186143", soft: "#E6F4EC" },
        caution: { DEFAULT: "#E8A317", text: "#A8680B", soft: "#FBF1D9" },
        bad: { DEFAULT: "#D64545", text: "#B03636", dark: "#8F2A2A", soft: "#FBE9E9" },
        // Grautöne leicht Richtung Petrol/Sand getönt
        gray: {
          50: "#F6F5F1", 100: "#EDEBE4", 200: "#DEDCD2", 300: "#C3C5BD", 400: "#8A9894",
          500: "#5F706D", 600: "#485957", 700: "#334644", 800: "#223A38", 900: "#17302E",
        },
      },
    },
  },
  plugins: [],
};
export default config;
