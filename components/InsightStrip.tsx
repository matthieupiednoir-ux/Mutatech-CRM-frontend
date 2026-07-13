"use client";

import { useEffect, useState } from "react";

export interface Insight {
  module: string;
  texte: string;
  urgence: "info" | "attention" | "important";
}

const COULEUR: Record<string, string> = {
  info: "#77778A",
  attention: "#F5A623",
  important: "#EF4444",
};

/**
 * Bandeau discret de suggestions passives -- pas un chat, pas un bouton a
 * cliquer pour "demander" quelque chose. Se contente d'afficher ce qui
 * merite l'attention sur CE module precis, calcule silencieusement cote
 * serveur a partir des vraies donnees. Se ferme d'un clic, se re-affiche
 * au prochain chargement de page (pas de persistance de la fermeture --
 * volontairement simple).
 */
export default function InsightStrip({
  fetcher,
  module,
}: {
  fetcher: () => Promise<Insight[]>;
  module?: string;
}) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [masques, setMasques] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetcher().then(setInsights).catch(() => setInsights([]));
  }, []);

  const visibles = insights
    .map((ins, i) => ({ ins, i }))
    .filter(({ i }) => !masques.has(i))
    .filter(({ ins }) => !module || ins.module === module);

  if (visibles.length === 0) return null;

  return (
    <div className="mb-4 space-y-1.5">
      {visibles.map(({ ins, i }) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: `${COULEUR[ins.urgence]}15`, color: COULEUR[ins.urgence] }}
        >
          <span>💡 {ins.texte}</span>
          <button
            onClick={() => setMasques((s) => new Set(s).add(i))}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
