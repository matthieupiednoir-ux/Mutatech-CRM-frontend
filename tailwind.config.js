/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Toutes reliees a des variables CSS (definies dans globals.css,
        // par theme via body[data-theme]) plutot qu'a des valeurs fixes --
        // permet de changer completement la palette au runtime (voir
        // /parametres) sans toucher a aucun composant existant : chaque
        // page continue d'utiliser bg-surface, text-textMuted, etc.
        // exactement comme avant, seule la VALEUR resolue change.
        ink: "var(--color-ink)",
        surface: "var(--color-surface)",
        surfaceAlt: "var(--color-surface-alt)",
        line: "var(--color-line)",
        violet: "var(--color-violet)",
        teal: "var(--color-teal)",
        amber: "var(--color-amber)",
        textPrimary: "var(--color-text-primary)",
        textMuted: "var(--color-text-muted)",
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
