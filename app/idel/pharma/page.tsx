"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import {
  pharmaListerPharmacies, pharmaCreerPharmacie,
  pharmaListerCommandes, pharmaCreerCommande, pharmaChangerStatutCommande,
  Pharmacy, PharmaOrder,
} from "@/lib/api";
import { idelGetPatients, idelInsights } from "@/lib/api";
import { IdelPatient } from "@/lib/types";
import InsightStrip from "@/components/InsightStrip";

const STATUT_LABEL: Record<string, string> = {
  brouillon: "Brouillon", envoyee: "Envoyée", en_preparation: "En préparation",
  prete: "Prête", livree: "Livrée", annulee: "Annulée",
};
const STATUT_COULEUR: Record<string, string> = {
  brouillon: "#77778A", envoyee: "#F5A623", en_preparation: "#F5A623",
  prete: "#a89eff", livree: "#00D4AA", annulee: "#EF4444",
};
const ORDRE_STATUTS = ["brouillon", "envoyee", "en_preparation", "prete", "livree", "annulee"];

interface LigneProduit { produit: string; quantite: string; }

export default function PharmaPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [commandes, setCommandes] = useState<PharmaOrder[]>([]);
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const [ongletPharmacies, setOngletPharmacies] = useState(false);

  const [formPharmacie, setFormPharmacie] = useState(false);
  const [pharmForm, setPharmForm] = useState({ name: "", phone: "", ville: "" });
  const [creationPharm, setCreationPharm] = useState(false);

  const [importOuvert, setImportOuvert] = useState(false);
  const [csvTexte, setCsvTexte] = useState("");
  const [importEnCours, setImportEnCours] = useState(false);
  const [importResultat, setImportResultat] = useState<string | null>(null);

  const [formCommande, setFormCommande] = useState(false);
  const [commandePatientId, setCommandePatientId] = useState("");
  const [commandePharmacyId, setCommandePharmacyId] = useState("");
  const [lignesProduits, setLignesProduits] = useState<LigneProduit[]>([{ produit: "", quantite: "1" }]);
  const [creationCommande, setCreationCommande] = useState(false);

  function charger() {
    setLoading(true);
    Promise.all([pharmaListerPharmacies(), pharmaListerCommandes(), idelGetPatients()])
      .then(([p, c, pat]) => { setPharmacies(p); setCommandes(c); setPatients(pat); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleCreerPharmacie(e: React.FormEvent) {
    e.preventDefault();
    setCreationPharm(true);
    setError(null);
    try {
      await pharmaCreerPharmacie(pharmForm);
      setPharmForm({ name: "", phone: "", ville: "" });
      setFormPharmacie(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
    } finally {
      setCreationPharm(false);
    }
  }

  // Import CSV/Excel simplifie : une ligne par pharmacie, format
  // "nom;telephone;ville" (le point-virgule est le separateur standard
  // d'Excel FR ; la virgule fonctionne aussi si pas d'ambiguite).
  async function handleImporterCsv() {
    setImportEnCours(true);
    setImportResultat(null);
    setError(null);
    const lignes = csvTexte.split("\n").map((l) => l.trim()).filter(Boolean);
    let ok = 0, echecs = 0;
    for (const ligne of lignes) {
      const sep = ligne.includes(";") ? ";" : ",";
      const [name, phone, ville] = ligne.split(sep).map((x) => x?.trim() || "");
      if (!name || !phone) { echecs++; continue; }
      try {
        await pharmaCreerPharmacie({ name, phone, ville: ville || undefined });
        ok++;
      } catch {
        echecs++;
      }
    }
    setImportResultat(`${ok} pharmacie(s) importée(s)${echecs > 0 ? `, ${echecs} ligne(s) ignorée(s)` : ""}.`);
    setImportEnCours(false);
    setCsvTexte("");
    charger();
  }

  function ajouterLigneProduit() {
    setLignesProduits([...lignesProduits, { produit: "", quantite: "1" }]);
  }
  function retirerLigneProduit(index: number) {
    setLignesProduits(lignesProduits.filter((_, i) => i !== index));
  }
  function modifierLigneProduit(index: number, champ: keyof LigneProduit, valeur: string) {
    const copie = [...lignesProduits];
    copie[index] = { ...copie[index], [champ]: valeur };
    setLignesProduits(copie);
  }

  async function handleCreerCommande(e: React.FormEvent) {
    e.preventDefault();
    setCreationCommande(true);
    setError(null);
    try {
      const items = lignesProduits
        .filter((l) => l.produit.trim())
        .map((l) => ({ product_name: l.produit.trim(), quantity: parseFloat(l.quantite) || 1 }));
      if (items.length === 0) {
        setError("Ajoute au moins un produit à la commande.");
        setCreationCommande(false);
        return;
      }
      await pharmaCreerCommande({ patient_id: commandePatientId, pharmacy_id: commandePharmacyId, items });
      setCommandePatientId("");
      setCommandePharmacyId("");
      setLignesProduits([{ produit: "", quantite: "1" }]);
      setFormCommande(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
    } finally {
      setCreationCommande(false);
    }
  }

  async function handleChangerStatut(cmd: PharmaOrder, status: string) {
    setError(null);
    setSucces(null);
    try {
      await pharmaChangerStatutCommande(cmd.id, status);
      setSucces(`${cmd.order_number} → ${STATUT_LABEL[status]}`);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du changement de statut.");
    }
  }

  function statutSuivant(statut: string): string | null {
    const i = ORDRE_STATUTS.indexOf(statut);
    if (i === -1 || i >= ORDRE_STATUTS.length - 2) return null;
    return ORDRE_STATUTS[i + 1];
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <InsightStrip fetcher={idelInsights} module="pharma" />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Commandes Pharma</h1>
            <p className="mt-1 text-sm text-textMuted">Pharmacies partenaires et suivi des commandes patients.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOngletPharmacies(!ongletPharmacies)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary"
            >
              {ongletPharmacies ? "← Commandes" : "Pharmacies →"}
            </button>
            {ongletPharmacies && (
              <button
                onClick={() => setImportOuvert(true)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary"
              >
                📥 Importer CSV/Excel
              </button>
            )}
            <button
              onClick={() => ongletPharmacies ? setFormPharmacie(true) : setFormCommande(true)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {ongletPharmacies ? "+ Pharmacie" : "+ Commande"}
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}
        {succes && <p className="mb-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{succes}</p>}

        {importOuvert && (
          <div className="mb-6 rounded-xl border border-line bg-surface p-5">
            <p className="mb-2 text-sm font-medium text-textPrimary">Importer des pharmacies (CSV / Excel)</p>
            <p className="mb-3 text-xs text-textMuted">
              Colle le contenu de ton fichier (une ligne par pharmacie) au format :{" "}
              <code className="rounded bg-surfaceAlt px-1.5 py-0.5 text-[11px]">nom;téléphone;ville</code>{" "}
              — depuis Excel, sélectionne les colonnes puis colle directement ici.
            </p>
            <textarea
              value={csvTexte}
              onChange={(e) => setCsvTexte(e.target.value)}
              rows={6}
              placeholder={"Pharmacie du Centre;0493123456;Nice\nPharmacie des Fleurs;0493654321;Cannes"}
              className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 font-mono text-xs text-textPrimary placeholder:text-textMuted/50"
            />
            {importResultat && <p className="mt-2 text-xs text-teal">{importResultat}</p>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleImporterCsv}
                disabled={importEnCours || !csvTexte.trim()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)" }}
              >
                {importEnCours ? "Import en cours..." : "Importer"}
              </button>
              <button onClick={() => { setImportOuvert(false); setImportResultat(null); }} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">
                Fermer
              </button>
            </div>
          </div>
        )}

        {ongletPharmacies ? (
          <>
            {formPharmacie && (
              <form onSubmit={handleCreerPharmacie} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-3">
                <input required placeholder="Nom" value={pharmForm.name} onChange={(e) => setPharmForm({ ...pharmForm, name: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <input required placeholder="Téléphone" value={pharmForm.phone} onChange={(e) => setPharmForm({ ...pharmForm, phone: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <input placeholder="Ville" value={pharmForm.ville} onChange={(e) => setPharmForm({ ...pharmForm, ville: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <div className="flex gap-2 sm:col-span-3">
                  <button type="submit" disabled={creationPharm} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                    {creationPharm ? "..." : "Créer"}
                  </button>
                  <button type="button" onClick={() => setFormPharmacie(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
                </div>
              </form>
            )}
            {loading ? <p className="text-sm text-textMuted">Chargement...</p> : pharmacies.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">Aucune pharmacie enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {pharmacies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm text-textPrimary">{p.name}</p>
                      <p className="text-xs text-textMuted">{p.ville || "—"} · {p.phone}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {formCommande && (
              <form onSubmit={handleCreerCommande} className="mb-6 rounded-xl border border-line bg-surface p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select required value={commandePatientId} onChange={(e) => setCommandePatientId(e.target.value)}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                    <option value="">— Patient —</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
                  <select required value={commandePharmacyId} onChange={(e) => setCommandePharmacyId(e.target.value)}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                    <option value="">— Pharmacie —</option>
                    {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-textMuted">Produits</p>
                <div className="space-y-2">
                  {lignesProduits.map((ligne, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        placeholder="Nom du produit"
                        value={ligne.produit}
                        onChange={(e) => modifierLigneProduit(i, "produit", e.target.value)}
                        className="flex-1 rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50"
                      />
                      <input
                        type="number" min="1" step="1"
                        value={ligne.quantite}
                        onChange={(e) => modifierLigneProduit(i, "quantite", e.target.value)}
                        className="w-24 rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary"
                      />
                      {lignesProduits.length > 1 && (
                        <button type="button" onClick={() => retirerLigneProduit(i)} className="rounded-lg border border-line px-3 text-sm text-textMuted hover:text-amber">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={ajouterLigneProduit} className="mt-2 text-xs text-textMuted hover:text-textPrimary" style={{ color: "var(--accent)" }}>
                  + Ajouter un produit
                </button>

                <div className="mt-4 flex gap-2">
                  <button type="submit" disabled={creationCommande} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                    {creationCommande ? "..." : "Créer la commande"}
                  </button>
                  <button type="button" onClick={() => setFormCommande(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
                </div>
              </form>
            )}
            {loading ? <p className="text-sm text-textMuted">Chargement...</p> : commandes.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">Aucune commande.</p>
            ) : (
              <div className="space-y-2">
                {commandes.map((c) => {
                  const suivant = statutSuivant(c.status);
                  return (
                    <div key={c.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm text-textPrimary">{c.order_number} — {c.patient_prenom} {c.patient_nom}</p>
                          <p className="text-xs text-textMuted">{c.pharmacy_name} · {c.items.map(i => `${i.product_name} (${i.quantity})`).join(", ")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${STATUT_COULEUR[c.status]}22`, color: STATUT_COULEUR[c.status] }}>
                            {STATUT_LABEL[c.status] || c.status}
                          </span>
                          {suivant && (
                            <button onClick={() => handleChangerStatut(c, suivant)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary">
                              → {STATUT_LABEL[suivant]}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
