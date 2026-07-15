"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import {
  prestationsCatalogueLister, prestationsCatalogueCreer,
  prestationsCatalogueModifier, prestationsCatalogueSupprimer,
  PrestationCatalogue,
} from "@/lib/api";

export default function CataloguePrestationsPage() {
  const [prestations, setPrestations] = useState<PrestationCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [typeFacturation, setTypeFacturation] = useState<"ponctuelle" | "abonnement">("ponctuelle");
  const [prix, setPrix] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  function charger() {
    setLoading(true);
    prestationsCatalogueLister()
      .then(setPrestations)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  function resetForm() {
    setEditId(null);
    setNom("");
    setDescription("");
    setTypeFacturation("ponctuelle");
    setPrix("");
  }

  function ouvrirEdition(p: PrestationCatalogue) {
    setEditId(p.id);
    setNom(p.nom);
    setDescription(p.description || "");
    setTypeFacturation(p.type_facturation);
    setPrix(String(p.prix));
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      const data = { nom, description: description || undefined, type_facturation: typeFacturation, prix: parseFloat(prix) || 0 };
      if (editId) {
        await prestationsCatalogueModifier(editId, data);
      } else {
        await prestationsCatalogueCreer(data);
      }
      resetForm();
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement.");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleToggleActif(p: PrestationCatalogue) {
    setError(null);
    try {
      await prestationsCatalogueModifier(p.id, { actif: !p.actif });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  async function handleSupprimer(p: PrestationCatalogue) {
    if (!confirm(`Supprimer "${p.nom}" du catalogue ?`)) return;
    setError(null);
    try {
      await prestationsCatalogueSupprimer(p.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la suppression.");
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Catalogue</h1>
            <p className="mt-1 text-sm text-textMuted">Tes prestations et services facturables, tarif ponctuel ou abonnement.</p>
          </div>
          <button
            onClick={() => { resetForm(); setFormOuvert(true); }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--accent)" }}
          >
            + Ajouter
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <p className="text-sm font-medium text-textPrimary sm:col-span-2">{editId ? "Modifier" : "Nouvelle prestation"}</p>
            <input required placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <textarea placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <select value={typeFacturation} onChange={(e) => setTypeFacturation(e.target.value as "ponctuelle" | "abonnement")}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
              <option value="ponctuelle">Ponctuel</option>
              <option value="abonnement">Abonnement mensuel</option>
            </select>
            <input required type="number" step="0.01" placeholder={typeFacturation === "abonnement" ? "Prix mensuel (€)" : "Prix (€)"}
              value={prix} onChange={(e) => setPrix(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={enregistrement} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {enregistrement ? "..." : editId ? "Mettre à jour" : "Ajouter"}
              </button>
              <button type="button" onClick={() => { resetForm(); setFormOuvert(false); }} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement...</p>
        ) : prestations.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">
            Aucune prestation dans le catalogue.
          </p>
        ) : (
          <div className="space-y-2">
            {prestations.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div>
                  <p className="text-sm text-textPrimary">
                    {p.nom} {!p.actif && <span className="text-xs text-textMuted">(inactif)</span>}
                  </p>
                  <p className="text-xs text-textMuted">
                    {p.prix.toFixed(2)} €{p.type_facturation === "abonnement" ? " / mois" : ""}
                    {p.description && ` · ${p.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => ouvrirEdition(p)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">Modifier</button>
                  <button onClick={() => handleToggleActif(p)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                    {p.actif ? "Désactiver" : "Réactiver"}
                  </button>
                  <button onClick={() => handleSupprimer(p)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:border-amber/40 hover:text-amber">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
