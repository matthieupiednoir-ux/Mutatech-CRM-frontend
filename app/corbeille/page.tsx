"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { getCorbeille, restaurerElementCorbeille, supprimerDefinitivement, ElementCorbeille, ApiError } from "@/lib/api";

const LABEL_TYPE: Record<string, string> = {
  client: "Client",
  devis: "Devis",
  facture: "Facture",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function joursRestants(supprimeLe: string): number {
  const supprime = new Date(supprimeLe);
  const limite = new Date(supprime.getTime() + 30 * 24 * 60 * 60 * 1000);
  const diff = Math.ceil((limite.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

export default function CorbeillePage() {
  const [elements, setElements] = useState<ElementCorbeille[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    getCorbeille()
      .then((data) => setElements(safeArr<ElementCorbeille>(data)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleRestaurer(e: ElementCorbeille) {
    setEnCours(`${e.type}-${e.id}`);
    setError(null);
    try {
      await restaurerElementCorbeille(e.type, e.id);
      charger();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la restauration.");
    } finally {
      setEnCours(null);
    }
  }

  async function handleSupprimerDefinitivement(e: ElementCorbeille) {
    if (!confirm(`Supprimer définitivement "${e.libelle}" ? Cette action est cette fois irréversible.`)) return;
    setEnCours(`${e.type}-${e.id}`);
    setError(null);
    try {
      await supprimerDefinitivement(e.type, e.id);
      charger();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la suppression.");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-textPrimary">🗑 Corbeille</h1>
          <p className="mt-1 text-sm text-textMuted">
            Clients, devis et factures supprimés — restaurables pendant 30 jours, puis effacés définitivement et automatiquement.
          </p>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : elements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">La corbeille est vide.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {elements.map((e) => {
              const cle = `${e.type}-${e.id}`;
              const restants = joursRestants(e.supprime_le);
              return (
                <div key={cle} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-textPrimary">
                      <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-textMuted mr-2">
                        {LABEL_TYPE[e.type] ?? e.type}
                      </span>
                      {e.libelle}
                    </p>
                    <p className="mt-1 text-xs text-textMuted">
                      Supprimé le {new Date(e.supprime_le).toLocaleDateString("fr-FR")} — {restants > 0 ? `purge définitive dans ${restants} j` : "purge imminente"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => handleRestaurer(e)}
                      disabled={enCours === cle}
                      className="rounded-lg bg-teal px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {enCours === cle ? "…" : "↩ Restaurer"}
                    </button>
                    <button
                      onClick={() => handleSupprimerDefinitivement(e)}
                      disabled={enCours === cle}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-amber disabled:opacity-50"
                    >
                      Supprimer définitivement
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
