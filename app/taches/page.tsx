"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { Tache, TacheInput } from "@/lib/types";
import {
  getTaches,
  creerTache,
  modifierTache,
  supprimerTache,
  ApiError,
} from "@/lib/api";

const PILIERS: Record<number, string> = {
  1: "Structure juridique & administrative",
  2: "Identité de marque & site web",
  3: "Documents commerciaux",
  4: "Présentations client",
  5: "Documents juridiques & conformité",
  6: "Prospection & acquisition clients",
  7: "Partenariats & financement client",
  8: "Outil Orchestrateur IA & Audit",
  9: "CRM Mutatech",
};

const TACHE_VIDE: TacheInput = {
  pilier: 9,
  titre: "",
  description: "",
  statut: "todo",
  ordre: 0,
};

const STATUTS_CYCLE = ["todo", "prog", "done"];
const STATUT_LABEL: Record<string, string> = {
  todo: "À faire",
  prog: "En cours",
  done: "Fait",
};
const STATUT_COULEUR: Record<string, string> = {
  todo: "text-textMuted border-line",
  prog: "text-amber border-amber/40 bg-amber/10",
  done: "text-teal border-teal/40 bg-teal/10",
};

export default function TachesPage() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState<TacheInput>({ ...TACHE_VIDE });
  const [enregistrement, setEnregistrement] = useState(false);
  const [pilierActif, setPilierActif] = useState<number | null>(null);

  function charger() {
    setLoading(true);
    getTaches()
      .then(setTaches)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function ouvrirNouveau() {
    setForm({ ...TACHE_VIDE });
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      await creerTache(form);
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleCycleStatut(tache: Tache) {
    const indexActuel = STATUTS_CYCLE.indexOf(tache.statut);
    const nouveauStatut = STATUTS_CYCLE[(indexActuel + 1) % STATUTS_CYCLE.length];
    try {
      await modifierTache(tache.id, {
        pilier: tache.pilier,
        titre: tache.titre,
        description: tache.description || "",
        statut: nouveauStatut,
        ordre: tache.ordre,
      });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de mise à jour");
    }
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer cette tâche ?")) return;
    try {
      await supprimerTache(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    }
  }

  const piliersPresents = Array.from(
    new Set(taches.map((t) => t.pilier))
  ).sort((a, b) => a - b);

  const total = taches.length;
  const done = taches.filter((t) => t.statut === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Tâches</h1>
            {total > 0 && (
              <p className="mt-1 text-xs text-textMuted">
                {pct}% accompli — {done}/{total} terminées
              </p>
            )}
          </div>
          <button
            onClick={ouvrirNouveau}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Nouvelle tâche
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        {formOuvert && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-display text-lg text-textPrimary">
              Nouvelle tâche
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Pilier
                </span>
                <select
                  value={form.pilier}
                  onChange={(e) =>
                    setForm({ ...form, pilier: parseInt(e.target.value) })
                  }
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  {Object.entries(PILIERS).map(([num, nom]) => (
                    <option key={num} value={num}>
                      {num} — {nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Statut
                </span>
                <select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="todo">À faire</option>
                  <option value="prog">En cours</option>
                  <option value="done">Fait</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">
                  Titre
                </span>
                <input
                  required
                  value={form.titre}
                  onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="text-sm text-textMuted hover:text-textPrimary"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : taches.length === 0 ? (
          <p className="text-sm text-textMuted">
            Aucune tâche pour l'instant — clique sur "+ Nouvelle tâche" pour
            commencer (sans redéploiement !).
          </p>
        ) : (
          <div className="space-y-8">
            {piliersPresents.map((pilier) => (
              <section key={pilier}>
                <h2 className="mb-3 font-display text-sm font-bold text-textPrimary">
                  Pilier {pilier} — {PILIERS[pilier] || "Autre"}
                </h2>
                <div className="space-y-2">
                  {taches
                    .filter((t) => t.pilier === pilier)
                    .map((tache) => (
                      <div
                        key={tache.id}
                        className="flex items-start justify-between gap-4 rounded-lg border border-line bg-surface p-4"
                      >
                        <div className="flex-1">
                          <p
                            className={`font-display text-sm font-bold ${
                              tache.statut === "done"
                                ? "text-teal line-through"
                                : "text-textPrimary"
                            }`}
                          >
                            {tache.titre}
                          </p>
                          {tache.description && (
                            <p className="mt-1 text-xs text-textMuted">
                              {tache.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCycleStatut(tache)}
                            className={`rounded border px-2 py-1 text-xs font-medium ${STATUT_COULEUR[tache.statut]}`}
                          >
                            {STATUT_LABEL[tache.statut]}
                          </button>
                          <button
                            onClick={() => handleSupprimer(tache.id)}
                            className="text-xs text-textMuted hover:text-amber"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
