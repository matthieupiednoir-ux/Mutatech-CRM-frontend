"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { Depense, DepenseInput } from "@/lib/types";
import {
  getDepenses,
  creerDepense,
  modifierDepense,
  supprimerDepense,
  ApiError,
} from "@/lib/api";

const DEPENSE_VIDE: DepenseInput = {
  libelle: "",
  categorie: "",
  montant: 0,
  type: "ponctuelle",
  date_depense: new Date().toISOString().slice(0, 10),
  frequence: "mensuelle",
  date_debut: new Date().toISOString().slice(0, 10),
  date_fin: "",
  actif: true,
  notes: "",
};

const CATEGORIES = [
  "Logiciel / SaaS",
  "Hébergement",
  "Téléphonie / Internet",
  "Assurance",
  "Comptabilité",
  "Matériel",
  "Déplacement",
  "Autre",
];

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [depenseEnEdition, setDepenseEnEdition] = useState<string | null>(null);
  const [form, setForm] = useState<DepenseInput>({ ...DEPENSE_VIDE });
  const [enregistrement, setEnregistrement] = useState(false);

  function charger() {
    setLoading(true);
    getDepenses()
      .then(setDepenses)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function ouvrirNouveau() {
    setForm({ ...DEPENSE_VIDE });
    setDepenseEnEdition(null);
    setFormOuvert(true);
  }

  function ouvrirEdition(d: Depense) {
    setForm({
      libelle: d.libelle,
      categorie: d.categorie || "",
      montant: d.montant,
      type: d.type,
      date_depense: d.date_depense || new Date().toISOString().slice(0, 10),
      frequence: d.frequence || "mensuelle",
      date_debut: d.date_debut || new Date().toISOString().slice(0, 10),
      date_fin: d.date_fin || "",
      actif: d.actif,
      notes: d.notes || "",
    });
    setDepenseEnEdition(d.id);
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      const donnees: DepenseInput = {
        ...form,
        date_fin: form.date_fin || undefined,
        date_depense: form.type === "ponctuelle" ? form.date_depense : undefined,
        frequence: form.type === "recurrente" ? form.frequence : undefined,
        date_debut: form.type === "recurrente" ? form.date_debut : undefined,
      };
      if (depenseEnEdition) {
        await modifierDepense(depenseEnEdition, donnees);
      } else {
        await creerDepense(donnees);
      }
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer cette dépense ?")) return;
    try {
      await supprimerDepense(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    }
  }

  async function handleMettreFin(d: Depense) {
    if (!confirm(`Mettre fin à "${d.libelle}" aujourd'hui ?`)) return;
    try {
      await modifierDepense(d.id, {
        libelle: d.libelle,
        categorie: d.categorie || undefined,
        montant: d.montant,
        type: d.type,
        frequence: d.frequence || undefined,
        date_debut: d.date_debut || undefined,
        date_fin: new Date().toISOString().slice(0, 10),
        actif: false,
        notes: d.notes || undefined,
      });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de mise à jour");
    }
  }

  const recurrentes = depenses.filter((d) => d.type === "recurrente");
  const ponctuelles = depenses.filter((d) => d.type === "ponctuelle");

  const totalMensuelRecurrent = recurrentes
    .filter((d) => d.actif)
    .reduce((s, d) => s + (d.frequence === "annuelle" ? d.montant / 12 : d.montant), 0);

  const anneeEnCours = new Date().getFullYear();
  const totalPonctuelAnnee = ponctuelles
    .filter((d) => d.date_depense && new Date(d.date_depense).getFullYear() === anneeEnCours)
    .reduce((s, d) => s + d.montant, 0);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl text-textPrimary">Dépenses</h1>
          <button
            onClick={ouvrirNouveau}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Nouvelle dépense
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">
              Abonnements actifs / mois
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-amber">
              {totalMensuelRecurrent.toFixed(2)} €
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">
              Ponctuel {anneeEnCours}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-textPrimary">
              {totalPonctuelAnnee.toFixed(2)} €
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">
              Total dépenses
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-textPrimary">
              {depenses.length}
            </p>
          </div>
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
              {depenseEnEdition ? "Modifier la dépense" : "Nouvelle dépense"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Libellé</span>
                <input
                  required
                  value={form.libelle}
                  onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                  placeholder="ex: Abonnement Railway"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/60"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Catégorie</span>
                <select
                  value={form.categorie}
                  onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="">—</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Montant (€)</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={form.montant}
                  onChange={(e) =>
                    setForm({ ...form, montant: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Type</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="ponctuelle">Ponctuelle</option>
                  <option value="recurrente">Récurrente (abonnement)</option>
                </select>
              </label>

              {form.type === "ponctuelle" ? (
                <label className="block">
                  <span className="mb-1 block text-sm text-textMuted">Date</span>
                  <input
                    type="date"
                    value={form.date_depense}
                    onChange={(e) => setForm({ ...form, date_depense: e.target.value })}
                    className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                  />
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-sm text-textMuted">Fréquence</span>
                    <select
                      value={form.frequence}
                      onChange={(e) => setForm({ ...form, frequence: e.target.value })}
                      className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                    >
                      <option value="mensuelle">Mensuelle</option>
                      <option value="annuelle">Annuelle</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-textMuted">
                      Date de début
                    </span>
                    <input
                      type="date"
                      value={form.date_debut}
                      onChange={(e) => setForm({ ...form, date_debut: e.target.value })}
                      className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-textMuted">
                      Date de fin{" "}
                      <span className="text-textMuted/60">
                        (laisser vide si toujours en cours)
                      </span>
                    </span>
                    <input
                      type="date"
                      value={form.date_fin}
                      onChange={(e) => setForm({ ...form, date_fin: e.target.value })}
                      className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                    />
                  </label>
                </>
              )}

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 font-display text-sm font-bold text-textPrimary">
                Récurrentes (abonnements)
              </h2>
              {recurrentes.length === 0 ? (
                <p className="text-sm text-textMuted">Aucune dépense récurrente.</p>
              ) : (
                <div className="space-y-2">
                  {recurrentes.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4"
                    >
                      <div>
                        <p className="font-display text-sm font-bold text-textPrimary">
                          {d.libelle}{" "}
                          {!d.actif && (
                            <span className="ml-2 rounded border border-line px-2 py-0.5 text-xs font-normal text-textMuted">
                              Terminé
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-textMuted">
                          {d.categorie || "—"} · {d.frequence === "annuelle" ? "Annuelle" : "Mensuelle"}
                          {d.date_debut &&
                            ` · depuis le ${new Date(d.date_debut).toLocaleDateString("fr-FR")}`}
                          {d.date_fin &&
                            ` · jusqu'au ${new Date(d.date_fin).toLocaleDateString("fr-FR")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-sm text-amber">
                          {d.montant.toFixed(2)} € / {d.frequence === "annuelle" ? "an" : "mois"}
                        </span>
                        {d.actif && (
                          <button
                            onClick={() => handleMettreFin(d)}
                            className="text-xs text-textMuted hover:text-amber"
                          >
                            Mettre fin
                          </button>
                        )}
                        <button
                          onClick={() => ouvrirEdition(d)}
                          className="text-xs text-violet hover:text-teal"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleSupprimer(d.id)}
                          className="text-xs text-textMuted hover:text-amber"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-display text-sm font-bold text-textPrimary">
                Ponctuelles
              </h2>
              {ponctuelles.length === 0 ? (
                <p className="text-sm text-textMuted">Aucune dépense ponctuelle.</p>
              ) : (
                <div className="space-y-2">
                  {ponctuelles.map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4"
                    >
                      <div>
                        <p className="font-display text-sm font-bold text-textPrimary">
                          {d.libelle}
                        </p>
                        <p className="text-xs text-textMuted">
                          {d.categorie || "—"}
                          {d.date_depense &&
                            ` · ${new Date(d.date_depense).toLocaleDateString("fr-FR")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display text-sm text-textPrimary">
                          {d.montant.toFixed(2)} €
                        </span>
                        <button
                          onClick={() => ouvrirEdition(d)}
                          className="text-xs text-violet hover:text-teal"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleSupprimer(d.id)}
                          className="text-xs text-textMuted hover:text-amber"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </>
  );
}
