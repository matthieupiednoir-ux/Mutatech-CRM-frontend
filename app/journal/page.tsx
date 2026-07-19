"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { getJournal, EntreeJournal, ApiError } from "@/lib/api";

const ICONE_ACTION: Record<string, string> = {
  creation: "✚",
  modification: "✎",
  suppression: "✕",
};
const COULEUR_ACTION: Record<string, string> = {
  creation: "text-teal border-teal/40 bg-teal/10",
  modification: "text-violet border-violet/40 bg-violet/10",
  suppression: "text-amber border-amber/40 bg-amber/10",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function JournalPage() {
  const [entrees, setEntrees] = useState<EntreeJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJournal(100)
      .then((data) => setEntrees(safeArr<EntreeJournal>(data)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-textPrimary">Journal d'activité</h1>
          <p className="mt-1 text-sm text-textMuted">
            Ce que Pixel a créé, modifié ou supprimé pour toi, avec l'horodatage — pour garder un œil sur ce qui se passe même quand tu n'es pas devant l'écran.
          </p>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : entrees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">Aucune action de Pixel enregistrée pour l'instant.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entrees.map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${COULEUR_ACTION[e.type_action] ?? "text-textMuted border-line"}`}>
                  {ICONE_ACTION[e.type_action] ?? "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-textPrimary">
                    <span className="font-medium text-violet">{e.auteur}</span> — {e.description}
                  </p>
                  <p className="mt-0.5 text-xs text-textMuted">
                    {new Date(e.cree_le).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
