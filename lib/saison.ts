// lib/saison.ts
// ----------------
// Calcule la saison courante pour le theme visuel "Saison" (CRM).
// Bornes approximatives des equinoxes/solstices -- suffisant pour un
// theme d'affichage (l'heure exacte varie de quelques heures d'une
// annee sur l'autre, sans impact visuel notable).

export type Saison = "printemps" | "ete" | "automne" | "hiver";

export function saisonActuelle(date: Date = new Date()): Saison {
  const mois = date.getMonth() + 1; // 1-12
  const jour = date.getDate();
  const valeur = mois * 100 + jour; // ex: 15 aout -> 815

  if (valeur < 320) return "hiver";      // 1er janvier -> 19 mars
  if (valeur < 621) return "printemps";  // 20 mars -> 20 juin
  if (valeur < 922) return "ete";        // 21 juin -> 21 septembre
  if (valeur < 1221) return "automne";   // 22 septembre -> 20 decembre
  return "hiver";                         // 21 decembre -> 31 decembre
}

export const NOMS_SAISONS: Record<Saison, string> = {
  printemps: "Printemps",
  ete: "Été",
  automne: "Automne",
  hiver: "Hiver",
};

export const EMOJIS_SAISONS: Record<Saison, string> = {
  printemps: "🌸",
  ete: "☀️",
  automne: "🍂",
  hiver: "❄️",
};
