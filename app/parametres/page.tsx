"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { getTenantConfig, updateTenantConfig } from "@/lib/api";

// Doit rester coherent avec ONGLETS_CRM dans NavBar.tsx -- volontairement
// duplique plutot qu'importe, car cette liste decrit des libelles humains
// pour l'ecran de reglages, distincts des routes techniques.
const ONGLETS_CONFIGURABLES = [
  { id: "clients", label: "Clients" },
  { id: "devis", label: "Devis" },
  { id: "factures", label: "Factures" },
  { id: "depenses", label: "Dépenses" },
  { id: "taches", label: "Tâches" },
  { id: "prospects", label: "Prospects" },
  { id: "comptabilite", label: "Comptabilité" },
  { id: "catalogue", label: "Catalogue" },
  { id: "agent", label: "Agent IA" },
];

export default function ParametresPage() {
  const [masques, setMasques] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTenantConfig()
      .then((config) => {
        const liste = (config.onglets_masques || "").split(",").map((s) => s.trim()).filter(Boolean);
        setMasques(new Set(liste));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setMasques((prev) => {
      const copie = new Set(prev);
      if (copie.has(id)) copie.delete(id); else copie.add(id);
      return copie;
    });
    setSucces(null);
  }

  async function handleEnregistrer() {
    setEnregistrement(true);
    setError(null);
    setSucces(null);
    try {
      await updateTenantConfig({ onglets_masques: Array.from(masques).join(",") });
      setSucces("Préférences enregistrées — rafraîchis la page pour voir le menu mis à jour.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl text-textPrimary">Paramètres</h1>
        <p className="mt-1 text-sm text-textMuted">
          Choisis les onglets utiles à ton activité — masque ceux dont tu ne te sers pas (ex. Prospects si tu ne prospectes pas activement). Réversible à tout moment.
        </p>

        {error && <p className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}
        {succes && <p className="mt-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{succes}</p>}

        {loading ? (
          <p className="mt-6 text-sm text-textMuted">Chargement...</p>
        ) : (
          <div className="mt-6 space-y-2">
            {ONGLETS_CONFIGURABLES.map((o) => (
              <label key={o.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 cursor-pointer">
                <span className="text-sm text-textPrimary">{o.label}</span>
                <input
                  type="checkbox"
                  checked={!masques.has(o.id)}
                  onChange={() => toggle(o.id)}
                  className="h-4 w-4 accent-violet"
                />
              </label>
            ))}
          </div>
        )}

        <button
          onClick={handleEnregistrer}
          disabled={enregistrement || loading}
          className="mt-6 rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
        >
          {enregistrement ? "Enregistrement..." : "Enregistrer"}
        </button>
      </main>
    </>
  );
}
