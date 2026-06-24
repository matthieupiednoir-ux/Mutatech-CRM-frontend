/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F0F1E",
        surface: "#16162C",
        surfaceAlt: "#1E1E38",
        line: "#2A2A4A",
        violet: "#6C63FF",
        teal: "#00D4AA",
        amber: "#F5A623",
        textPrimary: "#F4F4FA",
        textMuted: "#9999B5",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
