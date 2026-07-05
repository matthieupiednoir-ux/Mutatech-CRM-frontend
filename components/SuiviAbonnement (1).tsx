"use client";

import { useEffect, useState } from "react";
import { MoisAbonnement } from "@/lib/types";
import { getAbonnementSuivi, genererFactureMois, ApiError } from "@/lib/api";

const STATUT_LABEL: Record<string, string> = {
  a_venir: "À venir",
  a_generer: "À générer",
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
};
const STATUT_COULEUR: Record<string, string> = {
  a_venir: "text-textMuted border-line",
  a_generer: "text-amber border-amber/40 bg-amber/10",
  brouillon: "text-violet border-violet/40 bg-violet/10",
  envoyee: "text-amber border-amber/40 bg-amber/10",
  payee: "text-teal border-teal/40 bg-teal/10",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function SuiviAbonnement({ devisId }: { devisId: string }) {
  const [mois, setMois] = useState<MoisAbonnement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generationEnCours, setGenerationEnCours] = useState(false);

  function charger() {
    setLoading(true);
    getAbonnementSuivi(devisId)
      .then((data) => setMois(safeArr<MoisAbonnement>(data)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devisId]);

  async function handleGenerer() {
    setGenerationEnCours(true);
    setError(null);
    try {
      await genererFactureMois(devisId);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de génération");
    } finally {
      setGenerationEnCours(false);
    }
  }

  if (loading) return <p className="text-xs text-textMuted">Chargement du suivi…</p>;
  if (mois.length === 0) return null;

  const aGenerer = mois.some((m) => m.statut === "a_generer");

  return (
    <div className="mt-3 rounded-lg border border-line bg-surfaceAlt p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-textPrimary">Suivi des mensualités</span>
        {aGenerer && (
          <button onClick={handleGenerer} disabled={generationEnCours}
            className="rounded bg-violet px-3 py-1 text-[11px] font-medium text-white hover:bg-violet/90 disabled:opacity-50">
            {generationEnCours ? "Génération…" : "Générer la facture du mois"}
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-[11px] text-amber">{error}</p>}

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {mois.map((m) => {
          const couleur = m.statut ? (STATUT_COULEUR[m.statut] ?? "text-textMuted border-line") : "text-textMuted border-line";
          const label = m.statut ? (STATUT_LABEL[m.statut] ?? m.statut) : "";
          const datePrevue = m.date_prevue
            ? new Date(m.date_prevue).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
            : m.label ?? `Mois ${m.mois_index}`;
          return (
            <div key={m.mois_index} className={`rounded border px-2 py-1.5 text-[11px] ${couleur}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Mois {m.mois_index}</span>
                <span>{m.montant.toFixed(0)} €</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[10px] opacity-80">
                <span>{datePrevue}</span>
                <span>{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
