"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import LigneEditor from "@/components/LigneEditor";
import { Client, Devis, Facture, FactureInput, Ligne } from "@/lib/types";
import {
  getClients, getDevisListe, getFacturesListe,
  creerFacture, modifierFacture, envoyerFacture,
  marquerFacturePayee, supprimerFacture, ApiError,
} from "@/lib/api";

const STATUT_LABEL: Record<string, string> = {
  brouillon: "Brouillon", envoyee: "Envoyée", payee: "Payée",
};
const STATUT_COULEUR: Record<string, string> = {
  brouillon: "text-textMuted",
  envoyee: "text-amber",
  payee: "text-teal",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [devisListe, setDevisListe] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [factureEnEdition, setFactureEnEdition] = useState<Facture | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  const [paiementEnCours, setPaiementEnCours] = useState<string | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  const [origineDevisId, setOrigineDevisId] = useState<string>("");
  const [clientId, setClientId] = useState("");
  const [objet, setObjet] = useState("");
  const [tauxTva, setTauxTva] = useState(20);
  const [dateEcheance, setDateEcheance] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ description: "", quantite: 1, prix_unitaire: 0 }]);

  function charger() {
    setLoading(true);
    Promise.all([getFacturesListe(), getClients(), getDevisListe()])
      .then(([f, c, d]) => {
        setFactures(safeArr<Facture>(f));
        setClients(safeArr<Client>(c));
        setDevisListe(safeArr<Devis>(d));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  function resetForm() {
    setFactureEnEdition(null);
    setOrigineDevisId("");
    setClientId("");
    setObjet("");
    setTauxTva(20);
    setDateEcheance("");
    setLignes([{ description: "", quantite: 1, prix_unitaire: 0 }]);
  }

  function ouvrirNouveau() {
    resetForm();
    setFormOuvert(true);
    setError(null);
  }

  function ouvrirEdition(facture: Facture) {
    setFactureEnEdition(facture);
    setOrigineDevisId(facture.devis_id ?? "");
    setClientId(facture.client_id ?? "");
    setObjet(facture.objet ?? "");
    setTauxTva(facture.taux_tva ?? 20);
    setDateEcheance(facture.date_echeance ?? "");
    setLignes(safeArr<Ligne>(facture.lignes).map((l) => ({ ...l })));
    setFormOuvert(true);
    setError(null);
  }

  function handleChoixDevis(devisId: string) {
    setOrigineDevisId(devisId);
    if (!devisId) return;
    const devis = devisListe.find((d) => d.id === devisId);
    if (devis) {
      setClientId(devis.client_id ?? "");
      setObjet(devis.objet ?? "");
      setTauxTva(devis.taux_tva ?? 20);
      setLignes(safeArr<Ligne>(devis.lignes).map((l) => ({ ...l })));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    const payload: FactureInput = {
      client_id: clientId || null,
      devis_id: origineDevisId || null,
      objet: objet.trim() || null,
      taux_tva: tauxTva,
      date_echeance: dateEcheance || null,
      lignes: lignes.filter((l) => l.description.trim() !== ""),
    };
    try {
      if (factureEnEdition) {
        await modifierFacture(factureEnEdition.id, payload);
      } else {
        await creerFacture(payload);
      }
      setFormOuvert(false);
      resetForm();
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleEnvoyer(id: string) {
    if (!confirm("Envoyer cette facture par email au client ?")) return;
    setEnvoiEnCours(id);
    setError(null);
    try { await envoyerFacture(id); charger(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur d'envoi"); }
    finally { setEnvoiEnCours(null); }
  }

  async function handleMarquerPayee(id: string) {
    if (!confirm("Marquer cette facture comme payée aujourd'hui ?")) return;
    setPaiementEnCours(id);
    setError(null);
    try { await marquerFacturePayee(id); charger(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur de mise à jour"); }
    finally { setPaiementEnCours(null); }
  }

  async function handleSupprimer(f: Facture) {
    if (!confirm(`Supprimer définitivement la facture ${f.numero} ?`)) return;
    setSuppressionEnCours(f.id);
    setError(null);
    try { await supprimerFacture(f.id); charger(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur de suppression"); }
    finally { setSuppressionEnCours(null); }
  }

  const facturesFiltrees = safeArr<Facture>(factures).filter((f) => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      f.numero?.toLowerCase().includes(q) ||
      f.objet?.toLowerCase().includes(q) ||
      f.client?.nom?.toLowerCase().includes(q) ||
      STATUT_LABEL[f.statut]?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Factures</h1>
            <p className="mt-0.5 text-sm text-textMuted">{factures.length} facture{factures.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={ouvrirNouveau}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
            + Nouvelle facture
          </button>
        </div>

        {error && !formOuvert && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>
        )}

        {/* FORMULAIRE */}
        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-textPrimary">
              {factureEnEdition ? "Modifier la facture" : "Nouvelle facture"}
            </h2>
            {error && <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">{error}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Origine devis */}
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Basé sur un devis (optionnel)</span>
                <select value={origineDevisId} onChange={(e) => handleChoixDevis(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  <option value="">— Aucun devis —</option>
                  {safeArr<Devis>(devisListe)
                    .filter((d) => d.statut === "accepte")
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.numero} — {d.client?.nom ?? "Sans client"} — {d.objet ?? ""}
                      </option>
                    ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Client</span>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  <option value="">— Sans client —</option>
                  {safeArr<Client>(clients).map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Objet</span>
                <input value={objet} onChange={(e) => setObjet(e.target.value)}
                  placeholder="Prestation de conseil IA"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Date d'échéance</span>
                <input type="date" value={dateEcheance} onChange={(e) => setDateEcheance(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
            </div>

            <LigneEditor
              lignes={lignes}
              tauxTva={tauxTva}
              onChange={setLignes}
              onTauxTvaChange={setTauxTva}
            />

            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {enregistrement ? "Enregistrement…" : factureEnEdition ? "Mettre à jour" : "Créer la facture"}
              </button>
              <button type="button" onClick={() => { setFormOuvert(false); resetForm(); }}
                className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
            </div>
          </form>
        )}

        {/* Recherche */}
        {factures.length > 0 && (
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par numéro, objet, client, statut…"
            className="mb-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60" />
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : facturesFiltrees.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">
              {recherche ? "Aucune facture ne correspond." : "Aucune facture encore."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {facturesFiltrees.map((f) => (
              <div key={f.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-sm font-bold text-textPrimary">{f.numero}</span>
                      <span className={`text-xs font-medium ${STATUT_COULEUR[f.statut]}`}>
                        {STATUT_LABEL[f.statut]}
                      </span>
                    </div>
                    {f.objet && <p className="mt-0.5 text-sm text-textMuted">{f.objet}</p>}
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-textMuted">
                      {f.client?.nom && <span>👤 {f.client.nom}</span>}
                      {f.date_echeance && <span>Échéance {new Date(f.date_echeance).toLocaleDateString("fr-FR")}</span>}
                      {f.payee_le && <span className="text-teal">Payée le {new Date(f.payee_le).toLocaleDateString("fr-FR")}</span>}
                      {f.date_creation && <span>{new Date(f.date_creation).toLocaleDateString("fr-FR")}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {f.statut === "brouillon" && (
                      <button onClick={() => handleEnvoyer(f.id)} disabled={envoiEnCours === f.id}
                        className="rounded-lg border border-violet/40 bg-violet/10 px-3 py-1.5 text-xs text-violet hover:bg-violet/20 disabled:opacity-50">
                        {envoiEnCours === f.id ? "…" : "Envoyer"}
                      </button>
                    )}
                    {f.statut === "envoyee" && (
                      <button onClick={() => handleMarquerPayee(f.id)} disabled={paiementEnCours === f.id}
                        className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs text-teal hover:bg-teal/20 disabled:opacity-50">
                        {paiementEnCours === f.id ? "…" : "Marquer payée"}
                      </button>
                    )}
                    <button onClick={() => ouvrirEdition(f)}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                      Modifier
                    </button>
                    <button onClick={() => handleSupprimer(f)} disabled={suppressionEnCours === f.id}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:border-amber/40 hover:text-amber disabled:opacity-50">
                      {suppressionEnCours === f.id ? "…" : "Supprimer"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
