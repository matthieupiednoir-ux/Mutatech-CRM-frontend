"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { idelGetJournal, idelJournalAcces, EntreeJournal, EntreeAcces, ApiError } from "@/lib/api";

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

const RESSOURCE_LABEL: Record<string, string> = {
  patient: "Dossier patient", patient_archive: "Dossier patient (archivage)", ordonnance: "Ordonnance",
  ordonnance_fichier: "Scan d'ordonnance", ordonnance_csv: "Export CSV", fiche_reprise: "Fiche de reprise", cotation: "Cotation",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function JournalIdelPage() {
  const [entrees, setEntrees] = useState<EntreeJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vue, setVue] = useState<"nova" | "acces">("nova");
  const [acces, setAcces] = useState<EntreeAcces[] | null>(null);
  const [accesErreur, setAccesErreur] = useState<string | null>(null);

  function ouvrirAcces() {
    setVue("acces");
    if (acces !== null) return;
    idelJournalAcces()
      .then((d) => setAcces(safeArr<EntreeAcces>(d)))
      .catch((e) => setAccesErreur(e instanceof ApiError ? e.message : "Erreur de chargement"));
  }

  useEffect(() => {
    idelGetJournal(100)
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
            Ce que Nova a créé, modifié ou supprimé pour ton organisation, avec l'horodatage.
          </p>
        </div>

        <div className="mb-4 flex gap-2">
          <button onClick={() => setVue("nova")} className={`rounded-lg border px-3 py-1.5 text-xs ${vue === "nova" ? "border-violet bg-violet/10 text-violet" : "border-line text-textMuted"}`}>Actions de Nova</button>
          <button onClick={ouvrirAcces} className={`rounded-lg border px-3 py-1.5 text-xs ${vue === "acces" ? "border-violet bg-violet/10 text-violet" : "border-line text-textMuted"}`}>Accès aux dossiers</button>
        </div>

        {vue === "acces" && (
          <div className="space-y-2">
            <p className="text-xs text-textMuted">Qui a consulté ou modifié quel dossier, et quand (réservé à la coordination du cabinet).</p>
            {accesErreur && <p className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{accesErreur}</p>}
            {acces === null && !accesErreur && <p className="text-sm text-textMuted">Chargement…</p>}
            {acces?.length === 0 && <p className="text-sm text-textMuted">Aucun accès enregistré.</p>}
            {acces?.map((a) => (
              <div key={a.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-xs">
                <span className="text-textPrimary"><b>{a.utilisateur}</b> · {a.action} · {RESSOURCE_LABEL[a.ressource] ?? a.ressource}</span>
                <span className="text-textMuted">{a.cree_le ? new Date(a.cree_le).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : ""}</span>
              </div>
            ))}
          </div>
        )}

        {vue === "nova" && error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {vue !== "nova" ? null : loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : entrees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">Aucune action de Nova enregistrée pour l'instant.</p>
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
                    <span className="font-medium" style={{ color: "#F0508C" }}>{e.auteur}</span> — {e.description}
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
