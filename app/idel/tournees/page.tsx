"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import {
  tourneesLister, tourneesCreer, tourneesAjouterVisite, tourneesModifierVisite,
  tourneesAjouterItem, tourneesSupprimerItem,
  Tournee, TourneeVisit,
} from "@/lib/api";
import { idelGetPatients, pharmaListerProduits } from "@/lib/api";
import { Product } from "@/lib/api";
import { IdelPatient } from "@/lib/types";

const PRESTATION_LABEL: Record<string, string> = {
  oxygenotherapie: "Oxygénothérapie",
  perfusion: "Perfusion",
  nutrition_enterale: "Nutrition entérale",
  vni: "VNI",
  aerosolotherapie: "Aérosolothérapie",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  delayed: "Retardée",
  cancelled: "Annulée",
};

const STATUS_COULEUR: Record<string, string> = {
  planned: "#77778A",
  in_progress: "#F5A623",
  completed: "#00D4AA",
  delayed: "#EF4444",
  cancelled: "#77778A",
};

function aujourdHui(): string {
  return new Date().toISOString().slice(0, 10);
}

function urlWaze(adresse: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(adresse)}&navigate=yes`;
}
function urlMaps(adresse: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
}
function urlMapsItineraire(adresses: string[]): string {
  const segments = adresses.map((a) => encodeURIComponent(a));
  return `https://www.google.com/maps/dir/${segments.join("/")}`;
}

export default function TourneesPage() {
  const [date, setDate] = useState(aujourdHui());
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [technicien, setTechnicien] = useState("");
  const [creation, setCreation] = useState(false);

  const [visiteTourneeId, setVisiteTourneeId] = useState<string | null>(null);
  const [visiteForm, setVisiteForm] = useState({
    patient_id: "", scheduled_time: "09:00", prestation: "oxygenotherapie", notes: "",
  });
  const [ajoutVisite, setAjoutVisite] = useState(false);

  // Produits pharma (PSDM) disponibles pour lier aux items de visite --
  // si le module pharma n'est pas actif pour cette organisation, la liste
  // reste simplement vide et on retombe sur la saisie en texte libre
  // (utile aussi bien pour livrer du materiel que decrire un soin IDEL).
  const [produits, setProduits] = useState<Product[]>([]);
  const [itemVisiteOuvert, setItemVisiteOuvert] = useState<{ tourneeId: string; visitId: string } | null>(null);
  const [itemForm, setItemForm] = useState({ label: "", quantite: "1", product_id: "" });
  const [ajoutItem, setAjoutItem] = useState(false);

  function charger() {
    setLoading(true);
    setError(null);
    tourneesLister(date)
      .then(setTournees)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, [date]);
  useEffect(() => {
    idelGetPatients().then(setPatients).catch(() => {});
    pharmaListerProduits().then(setProduits).catch(() => setProduits([]));
  }, []);

  async function handleCreerTournee(e: React.FormEvent) {
    e.preventDefault();
    setCreation(true);
    setError(null);
    try {
      await tourneesCreer({ date, technicien_name: technicien });
      setTechnicien("");
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
    } finally {
      setCreation(false);
    }
  }

  async function handleAjouterVisite(e: React.FormEvent, tourneeId: string) {
    e.preventDefault();
    setAjoutVisite(true);
    setError(null);
    try {
      await tourneesAjouterVisite(tourneeId, {
        patient_id: visiteForm.patient_id,
        scheduled_time: visiteForm.scheduled_time,
        prestation: visiteForm.prestation,
        notes: visiteForm.notes || undefined,
      });
      setVisiteForm({ patient_id: "", scheduled_time: "09:00", prestation: "oxygenotherapie", notes: "" });
      setVisiteTourneeId(null);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'ajout de la visite.");
    } finally {
      setAjoutVisite(false);
    }
  }

  async function handleChangerStatutVisite(tourneeId: string, visit: TourneeVisit, status: string) {
    setError(null);
    try {
      await tourneesModifierVisite(tourneeId, visit.id, { status });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du changement de statut.");
    }
  }

  async function handleAjouterItem(e: React.FormEvent, tourneeId: string, visitId: string) {
    e.preventDefault();
    setAjoutItem(true);
    setError(null);
    try {
      await tourneesAjouterItem(tourneeId, visitId, {
        label: itemForm.label,
        quantity: parseFloat(itemForm.quantite) || 1,
        product_id: itemForm.product_id || undefined,
      });
      setItemForm({ label: "", quantite: "1", product_id: "" });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'ajout.");
    } finally {
      setAjoutItem(false);
    }
  }

  async function handleSupprimerItem(tourneeId: string, visitId: string, itemId: string) {
    setError(null);
    try {
      await tourneesSupprimerItem(tourneeId, visitId, itemId);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la suppression.");
    }
  }

  function handleChoisirProduit(produitId: string) {
    const produit = produits.find((p) => p.id === produitId);
    setItemForm({
      label: produit ? produit.name : itemForm.label,
      quantite: itemForm.quantite,
      product_id: produitId,
    });
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Tournées</h1>
            <p className="mt-1 text-sm text-textMuted">
              Organise les visites patients par technicien et par jour.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary"
            />
            <button
              onClick={() => setFormOuvert(true)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--accent)" }}
            >
              + Nouvelle tournée
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>
        )}

        {formOuvert && (
          <form
            onSubmit={handleCreerTournee}
            className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-5"
          >
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-textPrimary">Technicien / IDEC</label>
              <input
                required
                value={technicien}
                onChange={(e) => setTechnicien(e.target.value)}
                placeholder="ex: Julie Martin"
                className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50"
              />
            </div>
            <button
              type="submit"
              disabled={creation}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {creation ? "Création..." : "Créer"}
            </button>
            <button
              type="button"
              onClick={() => setFormOuvert(false)}
              className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary"
            >
              Annuler
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement...</p>
        ) : tournees.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">
            Aucune tournée pour le {new Date(date).toLocaleDateString("fr-FR")}.
          </p>
        ) : (
          <div className="space-y-4">
            {tournees.map((t) => {
              const adressesOrdonnees = t.visits
                .filter((v) => v.patient_adresse)
                .map((v) => v.patient_adresse as string);
              return (
                <div key={t.id} className="rounded-xl border border-line bg-surface p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-lg text-textPrimary">{t.technicien_name}</h2>
                    <div className="flex gap-2">
                      {adressesOrdonnees.length > 1 && (
                        <a
                          href={urlMapsItineraire(adressesOrdonnees)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          🗺️ Itinéraire complet ({adressesOrdonnees.length} arrêts)
                        </a>
                      )}
                      <button
                        onClick={() => setVisiteTourneeId(visiteTourneeId === t.id ? null : t.id)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-surfaceAlt"
                      >
                        + Ajouter une visite
                      </button>
                    </div>
                  </div>

                  {t.visits.length === 0 ? (
                    <p className="text-xs text-textMuted">Aucune visite planifiée.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {t.visits.map((v) => (
                        <div key={v.id} className="rounded-lg bg-surfaceAlt px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="font-mono text-xs text-textMuted">{v.scheduled_time}</span>
                              <span className="text-sm text-textPrimary">{v.patient_prenom} {v.patient_nom}</span>
                              <span className="text-xs text-textMuted">{PRESTATION_LABEL[v.prestation] || v.prestation}</span>
                              {v.patient_adresse ? (
                                <span className="flex gap-1.5">
                                  <a href={urlWaze(v.patient_adresse)} target="_blank" rel="noopener noreferrer"
                                    className="rounded border border-line px-1.5 py-0.5 text-[10px] text-textMuted hover:text-textPrimary" title={v.patient_adresse}>
                                    🧭 Waze
                                  </a>
                                  <a href={urlMaps(v.patient_adresse)} target="_blank" rel="noopener noreferrer"
                                    className="rounded border border-line px-1.5 py-0.5 text-[10px] text-textMuted hover:text-textPrimary" title={v.patient_adresse}>
                                    📍 Maps
                                  </a>
                                </span>
                              ) : (
                                <span className="text-[10px] text-textMuted/60">— pas d'adresse renseignée —</span>
                              )}
                            </div>
                            <select
                              value={v.status}
                              onChange={(e) => handleChangerStatutVisite(t.id, v, e.target.value)}
                              className="rounded-full border-0 px-2.5 py-1 text-xs font-medium"
                              style={{
                                backgroundColor: `${STATUS_COULEUR[v.status]}22`,
                                color: STATUS_COULEUR[v.status],
                              }}
                            >
                              {Object.entries(STATUS_LABEL).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Produits a livrer / soins effectues */}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
                            {v.items.map((item) => (
                              <span key={item.id} className="flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] text-textPrimary">
                                {item.label}{item.quantity !== 1 && ` ×${item.quantity}`}
                                <button onClick={() => handleSupprimerItem(t.id, v.id, item.id)} className="text-textMuted hover:text-amber">✕</button>
                              </span>
                            ))}
                            <button
                              onClick={() => setItemVisiteOuvert(itemVisiteOuvert?.visitId === v.id ? null : { tourneeId: t.id, visitId: v.id })}
                              className="rounded-full border border-dashed border-line px-2 py-0.5 text-[10px] text-textMuted hover:text-textPrimary"
                            >
                              + Produit / soin
                            </button>
                          </div>

                          {itemVisiteOuvert?.visitId === v.id && (
                            <form onSubmit={(e) => handleAjouterItem(e, t.id, v.id)} className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-surface p-2">
                              {produits.length > 0 && (
                                <select
                                  value={itemForm.product_id}
                                  onChange={(e) => handleChoisirProduit(e.target.value)}
                                  className="rounded border border-line bg-surfaceAlt px-2 py-1 text-xs text-textPrimary"
                                >
                                  <option value="">— Produit pharma (optionnel) —</option>
                                  {produits.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              )}
                              <input
                                required
                                placeholder="Libellé (produit ou soin)"
                                value={itemForm.label}
                                onChange={(e) => setItemForm({ ...itemForm, label: e.target.value, product_id: "" })}
                                className="flex-1 rounded border border-line bg-surfaceAlt px-2 py-1 text-xs text-textPrimary placeholder:text-textMuted/50"
                              />
                              <input
                                type="number" min="0.5" step="0.5"
                                value={itemForm.quantite}
                                onChange={(e) => setItemForm({ ...itemForm, quantite: e.target.value })}
                                className="w-16 rounded border border-line bg-surfaceAlt px-2 py-1 text-xs text-textPrimary"
                              />
                              <button type="submit" disabled={ajoutItem} className="rounded px-3 py-1 text-xs font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                                {ajoutItem ? "..." : "Ajouter"}
                              </button>
                              <button type="button" onClick={() => setItemVisiteOuvert(null)} className="text-xs text-textMuted hover:text-textPrimary">
                                Fermer
                              </button>
                            </form>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {visiteTourneeId === t.id && (
                    <form
                      onSubmit={(e) => handleAjouterVisite(e, t.id)}
                      className="mt-4 rounded-lg bg-surfaceAlt p-4"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <select
                          required
                          value={visiteForm.patient_id}
                          onChange={(e) => setVisiteForm({ ...visiteForm, patient_id: e.target.value })}
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary sm:col-span-2"
                        >
                          <option value="">— Sélectionner un patient —</option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id}>{p.prenom} {p.nom}{p.adresse ? "" : " (pas d'adresse)"}</option>
                          ))}
                        </select>
                        <input
                          type="time"
                          required
                          value={visiteForm.scheduled_time}
                          onChange={(e) => setVisiteForm({ ...visiteForm, scheduled_time: e.target.value })}
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary"
                        />
                        <select
                          value={visiteForm.prestation}
                          onChange={(e) => setVisiteForm({ ...visiteForm, prestation: e.target.value })}
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary"
                        >
                          {Object.entries(PRESTATION_LABEL).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                        <input
                          value={visiteForm.notes}
                          onChange={(e) => setVisiteForm({ ...visiteForm, notes: e.target.value })}
                          placeholder="Notes (optionnel)"
                          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2"
                        />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="submit"
                          disabled={ajoutVisite}
                          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                          style={{ backgroundColor: "var(--accent)" }}
                        >
                          {ajoutVisite ? "Ajout..." : "Ajouter la visite"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setVisiteTourneeId(null)}
                          className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
