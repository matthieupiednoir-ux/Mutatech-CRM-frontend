"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { Tache, TacheInput, StatutTache } from "@/lib/types";
import {
  getTaches, creerTache, modifierTache, supprimerTache,
  importerTachesLot, ApiError,
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
};

const STATUTS_CYCLE: StatutTache[] = ["todo", "prog", "done"];
const STATUT_LABEL: Record<string, string> = {
  todo: "À faire", prog: "En cours", done: "Fait",
};
const STATUT_COULEUR: Record<string, string> = {
  todo: "text-textMuted border-line",
  prog: "text-amber border-amber/40 bg-amber/10",
  done: "text-teal border-teal/40 bg-teal/10",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function TachesPage() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState<TacheInput>({ ...TACHE_VIDE });
  const [enregistrement, setEnregistrement] = useState(false);
  const [importEnCours, setImportEnCours] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [pilierFiltre, setPilierFiltre] = useState<number | null>(null);

  function charger() {
    setLoading(true);
    getTaches()
      .then((data) => setTaches(safeArr<Tache>(data)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      await creerTache({
        pilier: form.pilier,
        titre: form.titre.trim(),
        description: form.description?.trim() || null,
        statut: form.statut ?? "todo",
      });
      setForm({ ...TACHE_VIDE });
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleCycleStatut(tache: Tache) {
    const indexActuel = STATUTS_CYCLE.indexOf(tache.statut as StatutTache);
    const nouveauStatut = STATUTS_CYCLE[(indexActuel + 1) % STATUTS_CYCLE.length];
    try {
      await modifierTache(tache.id, {
        pilier: tache.pilier,
        titre: tache.titre,
        description: tache.description ?? null,
        statut: nouveauStatut,
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

  async function handleImporter() {
    // Tentative d'import depuis seed-taches si le fichier existe
    try {
      const { TACHES_SEED } = await import("@/lib/seed-taches");
      if (!confirm(`Importer les ${TACHES_SEED.length} tâches ? Les tâches existantes ne seront pas supprimées.`)) return;
      setImportEnCours(true);
      setError(null);
      await importerTachesLot(TACHES_SEED);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'import");
    } finally {
      setImportEnCours(false);
    }
  }

  const tachesFiltrees = safeArr<Tache>(taches).filter((t) => {
    if (pilierFiltre !== null && t.pilier !== pilierFiltre) return false;
    if (recherche) {
      const q = recherche.toLowerCase();
      return t.titre?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const piliersPresents = Array.from(new Set(safeArr<Tache>(taches).map((t) => t.pilier).filter((p): p is number => p != null))).sort((a, b) => a - b);
  const total = taches.length;
  const done = safeArr<Tache>(taches).filter((t) => t.statut === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Tâches</h1>
            {total > 0 && (
              <p className="mt-1 text-xs text-textMuted">{pct}% accompli — {done}/{total} terminées</p>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleImporter} disabled={importEnCours}
              className="rounded-lg border border-violet/40 px-4 py-2 text-sm font-medium text-violet hover:bg-violet/10 disabled:opacity-50">
              {importEnCours ? "Import…" : "Importer seed"}
            </button>
            <button onClick={() => { setForm({ ...TACHE_VIDE }); setFormOuvert(true); }}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
              + Nouvelle tâche
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {/* Formulaire */}
        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-display text-base text-textPrimary">Nouvelle tâche</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Pilier</span>
                <select value={form.pilier ?? 9} onChange={(e) => setForm({ ...form, pilier: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                  {Object.entries(PILIERS).map(([k, v]) => (
                    <option key={k} value={k}>{k}. {v}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Statut</span>
                <select value={form.statut ?? "todo"} onChange={(e) => setForm({ ...form, statut: e.target.value as StatutTache })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                  <option value="todo">À faire</option>
                  <option value="prog">En cours</option>
                  <option value="done">Fait</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Titre *</span>
                <input required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })}
                  placeholder="Titre de la tâche"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Description</span>
                <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Détails optionnels…"
                  className="w-full resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary text-sm" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {enregistrement ? "…" : "Créer"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)}
                className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
            </div>
          </form>
        )}

        {/* Filtres */}
        <div className="mb-4 flex flex-wrap gap-2">
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher…"
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-textPrimary placeholder:text-textMuted/60 flex-1 min-w-40" />
          <button onClick={() => setPilierFiltre(null)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${pilierFiltre === null ? "border-violet bg-violet/10 text-violet" : "border-line text-textMuted"}`}>
            Tous
          </button>
          {piliersPresents.map((p) => (
            <button key={p} onClick={() => setPilierFiltre(pilierFiltre === p ? null : p)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${pilierFiltre === p ? "border-violet bg-violet/10 text-violet" : "border-line text-textMuted"}`}>
              P{p}
            </button>
          ))}
        </div>

        {/* Liste groupée par pilier */}
        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : tachesFiltrees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">Aucune tâche{recherche ? " ne correspond" : " encore"}.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(pilierFiltre !== null ? [pilierFiltre] : piliersPresents).map((pilier) => {
              const items = tachesFiltrees.filter((t) => t.pilier === pilier);
              if (items.length === 0) return null;
              const doneP = items.filter((t) => t.statut === "done").length;
              return (
                <div key={pilier}>
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="font-display text-sm font-bold text-textPrimary">
                      {pilier}. {PILIERS[pilier] ?? `Pilier ${pilier}`}
                    </h2>
                    <span className="text-[11px] text-textMuted">{doneP}/{items.length}</span>
                    <div className="flex-1 h-1 rounded-full bg-surfaceAlt overflow-hidden">
                      <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${items.length > 0 ? (doneP/items.length)*100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
                        <button onClick={() => handleCycleStatut(t)}
                          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition hover:opacity-80 ${STATUT_COULEUR[t.statut]}`}>
                          {STATUT_LABEL[t.statut]}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${t.statut === "done" ? "line-through text-textMuted" : "text-textPrimary"}`}>
                            {t.titre}
                          </p>
                          {t.description && <p className="text-xs text-textMuted truncate">{t.description}</p>}
                        </div>
                        <button onClick={() => handleSupprimer(t.id)}
                          className="shrink-0 text-textMuted hover:text-amber text-xs px-1.5">✕</button>
                      </div>
                    ))}
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
