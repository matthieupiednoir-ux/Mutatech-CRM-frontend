/** @type {import('tailwindcss').Config} */
const c = (v) => `color-mix(in srgb, var(${v}) calc(<alpha-value> * 100%), transparent)`;

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
        // Couleur + opacite : color-mix() laisse fonctionner les variantes
        // Tailwind du type bg-amber/10 ou border-line/60. Avec une simple
        // var() elles etaient ignorees en silence (aucune classe generee).
        ink: c("--color-ink"),
        surface: c("--color-surface"),
        surfaceAlt: c("--color-surface-alt"),
        line: c("--color-line"),
        violet: c("--color-violet"),
        teal: c("--color-teal"),
        amber: c("--color-amber"),
        textPrimary: c("--color-text-primary"),
        textMuted: c("--color-text-muted"),
      },
      fontFamily: {
        // Une seule famille (Inter) pour les titres et le texte : rendu
        // plus sobre et homogene que l'ancien duo Space Grotesk + Inter.
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.18), 0 1px 1px rgb(0 0 0 / 0.08)",
        pop: "0 12px 32px -12px rgb(0 0 0 / 0.45)",
      },
    },
  },
  plugins: [],
};
