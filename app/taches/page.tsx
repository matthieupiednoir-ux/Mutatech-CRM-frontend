"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { Tache, TacheInput, StatutTache } from "@/lib/types";
import {
  getTaches, creerTache, modifierTache, supprimerTache,
  getPiliers, creerPilier, modifierPilier, supprimerPilier, Pilier,
  ApiError,
} from "@/lib/api";

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
  const [piliers, setPiliers] = useState<Pilier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [form, setForm] = useState<TacheInput>({ pilier: 0, titre: "", description: "", statut: "todo" });
  const [enregistrement, setEnregistrement] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [pilierFiltre, setPilierFiltre] = useState<number | null>(null);

  // Gestion des piliers
  const [panneauPiliersOuvert, setPanneauPiliersOuvert] = useState(false);
  const [nouveauPilierNom, setNouveauPilierNom] = useState("");
  const [pilierEnEdition, setPilierEnEdition] = useState<string | null>(null);
  const [pilierEditionNom, setPilierEditionNom] = useState("");
  const [erreurPiliers, setErreurPiliers] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    Promise.all([getTaches(), getPiliers()])
      .then(([t, p]) => {
        setTaches(safeArr<Tache>(t));
        setPiliers(safeArr<Pilier>(p));
        if (safeArr<Pilier>(p).length > 0 && form.pilier === 0) {
          setForm((f) => ({ ...f, pilier: p[0].numero }));
        }
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function nomPilier(numero: number): string {
    return piliers.find((p) => p.numero === numero)?.nom ?? `Pilier ${numero}`;
  }

  function ouvrirCreation() {
    setEditionId(null);
    setForm({ pilier: piliers[0]?.numero ?? 1, titre: "", description: "", statut: "todo" });
    setFormOuvert(true);
  }

  function ouvrirEdition(t: Tache) {
    setEditionId(t.id);
    setForm({ pilier: t.pilier, titre: t.titre, description: t.description ?? "", statut: t.statut });
    setFormOuvert(true);
  }

  function fermerForm() {
    setFormOuvert(false);
    setEditionId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      const payload: TacheInput = {
        pilier: form.pilier,
        titre: form.titre.trim(),
        description: form.description?.trim() || null,
        statut: form.statut ?? "todo",
      };
      if (editionId) {
        await modifierTache(editionId, payload);
      } else {
        await creerTache(payload);
      }
      fermerForm();
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleChangerStatut(tache: Tache, nouveauStatut: StatutTache) {
    if (nouveauStatut === tache.statut) return;
    setError(null);
    try {
      await modifierTache(tache.id, {
        pilier: tache.pilier, titre: tache.titre, description: tache.description ?? null, statut: nouveauStatut,
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

  // --- Gestion des piliers ---
  async function handleCreerPilier() {
    if (!nouveauPilierNom.trim()) return;
    setErreurPiliers(null);
    try {
      await creerPilier(nouveauPilierNom.trim());
      setNouveauPilierNom("");
      charger();
    } catch (e) {
      setErreurPiliers(e instanceof ApiError ? e.message : "Erreur lors de la création du pilier.");
    }
  }

  function commencerEditionPilier(p: Pilier) {
    setPilierEnEdition(p.id);
    setPilierEditionNom(p.nom);
  }

  async function handleRenommerPilier(id: string) {
    if (!pilierEditionNom.trim()) return;
    setErreurPiliers(null);
    try {
      await modifierPilier(id, pilierEditionNom.trim());
      setPilierEnEdition(null);
      charger();
    } catch (e) {
      setErreurPiliers(e instanceof ApiError ? e.message : "Erreur lors du renommage.");
    }
  }

  async function handleSupprimerPilier(p: Pilier) {
    if (!confirm(`Supprimer le pilier "${p.nom}" ? Impossible s'il contient encore des tâches.`)) return;
    setErreurPiliers(null);
    try {
      await supprimerPilier(p.id);
      charger();
    } catch (e) {
      setErreurPiliers(e instanceof ApiError ? e.message : "Erreur lors de la suppression.");
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

  const numerosPresents = Array.from(new Set(safeArr<Tache>(taches).map((t) => t.pilier))).sort((a, b) => a - b);
  const piliersOrdonnes = [...piliers].sort((a, b) => a.ordre - b.ordre || a.numero - b.numero);
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
            <button onClick={() => setPanneauPiliersOuvert((v) => !v)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary">
              ⚙ Piliers
            </button>
            <button onClick={ouvrirCreation}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
              + Nouvelle tâche
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {/* Panneau de gestion des piliers */}
        {panneauPiliersOuvert && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-4">
            <h2 className="mb-3 font-display text-sm text-textPrimary">Gérer les piliers</h2>
            {erreurPiliers && <p className="mb-3 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">{erreurPiliers}</p>}
            <div className="space-y-1.5">
              {piliersOrdonnes.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                  {pilierEnEdition === p.id ? (
                    <>
                      <input
                        value={pilierEditionNom}
                        onChange={(e) => setPilierEditionNom(e.target.value)}
                        className="flex-1 rounded border border-line bg-surfaceAlt px-2 py-1 text-sm text-textPrimary"
                        autoFocus
                      />
                      <button onClick={() => handleRenommerPilier(p.id)} className="text-xs text-teal">✓</button>
                      <button onClick={() => setPilierEnEdition(null)} className="text-xs text-textMuted">✕</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-textPrimary">{p.numero}. {p.nom}</span>
                      <button onClick={() => commencerEditionPilier(p)} className="text-xs text-textMuted hover:text-textPrimary">Renommer</button>
                      <button onClick={() => handleSupprimerPilier(p)} className="text-xs text-textMuted hover:text-amber">Supprimer</button>
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={nouveauPilierNom}
                onChange={(e) => setNouveauPilierNom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreerPilier()}
                placeholder="Nom du nouveau pilier"
                className="flex-1 rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60"
              />
              <button onClick={handleCreerPilier}
                className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
                + Ajouter
              </button>
            </div>
          </div>
        )}

        {/* Formulaire tâche */}
        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-6 space-y-3 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-display text-base text-textPrimary">{editionId ? "Modifier la tâche" : "Nouvelle tâche"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Pilier</span>
                <select value={form.pilier} onChange={(e) => setForm({ ...form, pilier: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                  {piliersOrdonnes.map((p) => (
                    <option key={p.id} value={p.numero}>{p.numero}. {p.nom}</option>
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
                <span className="mb-1 block text-sm text-textMuted">Description / notes d'avancement</span>
                <textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder="Détails, points bloquants, avancement…"
                  className="w-full resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary text-sm" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {enregistrement ? "…" : editionId ? "Enregistrer" : "Créer"}
              </button>
              <button type="button" onClick={fermerForm} className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
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
          {numerosPresents.map((n) => (
            <button key={n} onClick={() => setPilierFiltre(pilierFiltre === n ? null : n)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${pilierFiltre === n ? "border-violet bg-violet/10 text-violet" : "border-line text-textMuted"}`}>
              {nomPilier(n)}
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
            {(pilierFiltre !== null ? [pilierFiltre] : numerosPresents).map((numero) => {
              const items = tachesFiltrees.filter((t) => t.pilier === numero);
              if (items.length === 0) return null;
              const doneP = items.filter((t) => t.statut === "done").length;
              return (
                <div key={numero}>
                  <div className="mb-2 flex items-center gap-3">
                    <h2 className="font-display text-sm font-bold text-textPrimary">{nomPilier(numero)}</h2>
                    <span className="text-[11px] text-textMuted">{doneP}/{items.length}</span>
                    <div className="flex-1 h-1 rounded-full bg-surfaceAlt overflow-hidden">
                      <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${items.length > 0 ? (doneP/items.length)*100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((t) => (
                      <div key={t.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <select
                            value={t.statut}
                            onChange={(e) => handleChangerStatut(t, e.target.value as StatutTache)}
                            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUT_COULEUR[t.statut]}`}
                          >
                            <option value="todo">À faire</option>
                            <option value="prog">En cours</option>
                            <option value="done">Fait</option>
                          </select>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${t.statut === "done" ? "line-through text-textMuted" : "text-textPrimary"}`}>
                              {t.titre}
                            </p>
                            {t.description && <p className="text-xs text-textMuted whitespace-pre-wrap">{t.description}</p>}
                          </div>
                          <button onClick={() => ouvrirEdition(t)}
                            className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary">
                            Modifier
                          </button>
                          <button onClick={() => handleSupprimer(t.id)}
                            className="shrink-0 text-textMuted hover:text-amber text-xs px-1.5">✕</button>
                        </div>
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
