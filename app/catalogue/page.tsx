"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { catalogueLister, catalogueCreer, catalogueModifier, catalogueSupprimer } from "@/lib/api";
import { ProduitCatalogue, TypeFacturationProduit } from "@/lib/types";

export default function CataloguePage() {
  const [produits, setProduits] = useState<ProduitCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [typeFacturation, setTypeFacturation] = useState<TypeFacturationProduit>("ponctuelle");
  const [prix, setPrix] = useState("");
  const [tauxTva, setTauxTva] = useState("20");
  const [enregistrement, setEnregistrement] = useState(false);

  const [importOuvert, setImportOuvert] = useState(false);
  const [csvTexte, setCsvTexte] = useState("");
  const [importEnCours, setImportEnCours] = useState(false);
  const [importResultat, setImportResultat] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    catalogueLister()
      .then(setProduits)
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
    setTauxTva("20");
  }

  function ouvrirEdition(p: ProduitCatalogue) {
    setEditId(p.id);
    setNom(p.nom);
    setDescription(p.description || "");
    setTypeFacturation(p.type_facturation);
    setPrix(String(p.prix));
    setTauxTva(String(p.taux_tva));
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      const data = {
        nom, description: description || undefined,
        type_facturation: typeFacturation,
        prix: parseFloat(prix) || 0,
        taux_tva: parseFloat(tauxTva) || 20,
      };
      if (editId) {
        await catalogueModifier(editId, data);
      } else {
        await catalogueCreer(data);
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

  // Import CSV/Excel simplifie : une ligne par produit, format
  // "nom;prix;type_facturation;description" -- type_facturation et
  // description optionnels (ponctuelle par defaut). Colle directement
  // depuis Excel (le point-virgule est le separateur standard FR).
  async function handleImporterCsv() {
    setImportEnCours(true);
    setImportResultat(null);
    setError(null);
    const lignes = csvTexte.split("\n").map((l) => l.trim()).filter(Boolean);
    let ok = 0, echecs = 0;
    for (const ligne of lignes) {
      const sep = ligne.includes(";") ? ";" : ",";
      const [nomBrut, prixBrut, typeBrut, descBrut] = ligne.split(sep).map((x) => x?.trim() || "");
      const prixNombre = parseFloat((prixBrut || "").replace(",", "."));
      if (!nomBrut || isNaN(prixNombre)) { echecs++; continue; }
      const type = typeBrut?.toLowerCase().startsWith("abo") ? "abonnement" : "ponctuelle";
      try {
        await catalogueCreer({ nom: nomBrut, prix: prixNombre, type_facturation: type, description: descBrut || undefined });
        ok++;
      } catch {
        echecs++;
      }
    }
    setImportResultat(`${ok} produit(s) importé(s)${echecs > 0 ? `, ${echecs} ligne(s) ignorée(s)` : ""}.`);
    setImportEnCours(false);
    setCsvTexte("");
    charger();
  }

  async function handleToggleActif(p: ProduitCatalogue) {
    setError(null);
    try {
      await catalogueModifier(p.id, { actif: !p.actif });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  async function handleSupprimer(p: ProduitCatalogue) {
    if (!confirm(`Supprimer "${p.nom}" du catalogue ?`)) return;
    setError(null);
    try {
      await catalogueSupprimer(p.id);
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
            <p className="mt-1 text-sm text-textMuted">
              Tes produits, services et prestations réutilisables — piochés directement dans tes devis.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setImportOuvert(true)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary"
            >
              📥 Importer CSV/Excel
            </button>
            <button
              onClick={() => { resetForm(); setFormOuvert(true); }}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {importOuvert && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-5">
            <p className="mb-2 text-sm font-medium text-textPrimary">Importer des produits (CSV / Excel)</p>
            <p className="mb-3 text-xs text-textMuted">
              Colle le contenu (une ligne par produit) au format :{" "}
              <code className="rounded bg-surfaceAlt px-1.5 py-0.5 text-[11px]">nom;prix;type;description</code>{" "}
              — type vaut "ponctuelle" ou "abonnement" (optionnel), description optionnelle.
            </p>
            <textarea
              value={csvTexte}
              onChange={(e) => setCsvTexte(e.target.value)}
              rows={6}
              placeholder={"Diagnostic IA;490;ponctuelle;Audit organisation + rapport\nSuivi Mensuel;290;abonnement;Point visio mensuel"}
              className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 font-mono text-xs text-textPrimary placeholder:text-textMuted/50"
            />
            {importResultat && <p className="mt-2 text-xs text-teal">{importResultat}</p>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleImporterCsv}
                disabled={importEnCours || !csvTexte.trim()}
                className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-violet/90"
              >
                {importEnCours ? "Import en cours..." : "Importer"}
              </button>
              <button onClick={() => { setImportOuvert(false); setImportResultat(null); }} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">
                Fermer
              </button>
            </div>
          </div>
        )}

        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <p className="text-sm font-medium text-textPrimary sm:col-span-2">{editId ? "Modifier" : "Nouveau produit/service"}</p>
            <input required placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <textarea placeholder="Description (optionnel)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <select value={typeFacturation} onChange={(e) => setTypeFacturation(e.target.value as TypeFacturationProduit)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
              <option value="ponctuelle">Ponctuel</option>
              <option value="abonnement">Abonnement mensuel</option>
            </select>
            <input required type="number" step="0.01" placeholder={typeFacturation === "abonnement" ? "Prix mensuel (€ HT)" : "Prix (€ HT)"}
              value={prix} onChange={(e) => setPrix(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
            <input type="number" placeholder="TVA (%)" value={tauxTva} onChange={(e) => setTauxTva(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={enregistrement} className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {enregistrement ? "..." : editId ? "Mettre à jour" : "Ajouter"}
              </button>
              <button type="button" onClick={() => { resetForm(); setFormOuvert(false); }} className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement...</p>
        ) : produits.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">
            Aucun produit/service dans le catalogue — ajoute tes prestations types pour les retrouver directement lors de la création d'un devis.
          </p>
        ) : (
          <div className="space-y-2">
            {produits.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div>
                  <p className="text-sm text-textPrimary">
                    {p.nom} {!p.actif && <span className="text-xs text-textMuted">(inactif)</span>}
                    {p.type_facturation === "abonnement" && (
                      <span className="ml-1.5 rounded-full bg-teal/10 border border-teal/30 px-2 py-0.5 text-[10px] text-teal">Abonnement</span>
                    )}
                  </p>
                  <p className="text-xs text-textMuted">
                    {p.prix.toFixed(2)} € HT{p.type_facturation === "abonnement" ? " / mois" : ""}
                    {p.description && ` · ${p.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => ouvrirEdition(p)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                    Modifier
                  </button>
                  <button onClick={() => handleToggleActif(p)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                    {p.actif ? "Désactiver" : "Réactiver"}
                  </button>
                  <button onClick={() => handleSupprimer(p)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:border-amber/40 hover:text-amber">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
