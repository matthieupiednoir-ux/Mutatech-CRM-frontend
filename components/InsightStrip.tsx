"use client";

import { useEffect, useState } from "react";
import { relancerFacture, envoyerDevisPourSignature, modifierProspect } from "@/lib/api";

export interface InsightItem {
  id: string;
  label: string;
}

export interface Insight {
  module: string;
  texte: string;
  urgence: "info" | "attention" | "important";
  action_type?: "relancer_facture" | "renvoyer_devis" | "marquer_prospect_contacte";
  items?: InsightItem[];
}

const COULEUR: Record<string, string> = {
  info: "#77778A",
  attention: "#F5A623",
  important: "#EF4444",
};

const LABEL_ACTION: Record<string, string> = {
  relancer_facture: "Relancer",
  renvoyer_devis: "Renvoyer",
  marquer_prospect_contacte: "Marquer contacté",
};

async function executerAction(actionType: string, id: string): Promise<void> {
  if (actionType === "relancer_facture") await relancerFacture(id);
  else if (actionType === "renvoyer_devis") await envoyerDevisPourSignature(id);
  else if (actionType === "marquer_prospect_contacte") await modifierProspect(id, { statut: "contacte" } as never);
}

/**
 * Bandeau discret de suggestions passives -- pas un chat. Affiche ce qui
 * merite l'attention, calcule silencieusement cote serveur. Quand un
 * insight porte une action concrete (action_type + items), un petit
 * bouton par element permet d'agir en un clic (relancer une facture,
 * renvoyer un devis, marquer un prospect contacte) sans quitter la page
 * -- jamais d'action irreversible, toujours les memes endpoints que les
 * boutons habituels des pages concernees.
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
  const [enCours, setEnCours] = useState<string | null>(null);
  const [faits, setFaits] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetcher().then(setInsights).catch(() => setInsights([]));
  }, []);

  async function handleAction(actionType: string, item: InsightItem) {
    const cle = `${actionType}:${item.id}`;
    setEnCours(cle);
    try {
      await executerAction(actionType, item.id);
      setFaits((prev) => new Set(prev).add(cle));
    } catch {
      // Echec silencieux ici -- l'utilisateur peut toujours agir depuis
      // la page dediee (Factures/Devis/Prospects) si l'action rapide echoue.
    } finally {
      setEnCours(null);
    }
  }

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
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ backgroundColor: `${COULEUR[ins.urgence]}15`, color: COULEUR[ins.urgence] }}
        >
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <span>💡 {ins.texte}</span>
            {ins.action_type && Array.isArray(ins.items) && ins.items.length > 0 && (
              <span className="flex flex-wrap gap-1.5">
                {ins.items.map((item) => {
                  const cle = `${ins.action_type}:${item.id}`;
                  const fait = faits.has(cle);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleAction(ins.action_type as string, item)}
                      disabled={enCours === cle || fait}
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium transition disabled:opacity-50"
                      style={{ borderColor: COULEUR[ins.urgence], color: fait ? "#00D4AA" : COULEUR[ins.urgence] }}
                    >
                      {fait ? `✓ ${item.label}` : enCours === cle ? "..." : `${LABEL_ACTION[ins.action_type as string]} ${item.label}`}
                    </button>
                  );
                })}
              </span>
            )}
          </div>
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
