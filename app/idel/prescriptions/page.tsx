"use client";

import { useEffect, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import {
  prescriptionsLister, prescriptionsCreer, prescriptionsUploader,
  prescriptionsChangerValidite, prescriptionsRenouveler, Prescription,
} from "@/lib/api";
import { idelGetPatients } from "@/lib/api";
import { IdelPatient } from "@/lib/types";

const VALIDITE_LABEL: Record<string, string> = {
  active: "Active",
  a_renouveler: "A renouveler",
  renouvellement_demande: "Renouvellement demande",
  renouvelee: "Renouvelee",
  expiree: "Expiree",
};
const VALIDITE_COULEUR: Record<string, string> = {
  active: "#00D4AA", a_renouveler: "#F5A623", renouvellement_demande: "#a89eff",
  renouvelee: "#77778A", expiree: "#EF4444",
};

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<string>("");

  const [depotOuvert, setDepotOuvert] = useState(false);
  const [depotPatientId, setDepotPatientId] = useState("");
  const [depotFichier, setDepotFichier] = useState<File | null>(null);
  const [depotEnCours, setDepotEnCours] = useState(false);
  const [dernierDepot, setDernierDepot] = useState<Prescription | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState({
    patient_id: "", reference: "", medecin_prescripteur: "", date_prescription: "", date_expiration: "",
  });
  const [creation, setCreation] = useState(false);

  function charger() {
    setLoading(true);
    Promise.all([prescriptionsLister(filtre || undefined), idelGetPatients()])
      .then(([p, pat]) => { setPrescriptions(p); setPatients(pat); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, [filtre]);

  async function handleDeposer(e: React.FormEvent) {
    e.preventDefault();
    if (!depotPatientId || !depotFichier) {
      setError("Selectionne un patient et une photo/PDF de l'ordonnance.");
      return;
    }
    setDepotEnCours(true);
    setError(null);
    setDernierDepot(null);
    try {
      const resultat = await prescriptionsUploader(depotPatientId, depotFichier);
      setDernierDepot(resultat);
      setDepotFichier(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du depot.");
    } finally {
      setDepotEnCours(false);
    }
  }

  async function handleCreer(e: React.FormEvent) {
    e.preventDefault();
    setCreation(true);
    setError(null);
    try {
      await prescriptionsCreer(form);
      setForm({ patient_id: "", reference: "", medecin_prescripteur: "", date_prescription: "", date_expiration: "" });
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de creation.");
    } finally {
      setCreation(false);
    }
  }

  async function handleChangerValidite(p: Prescription, statut: string) {
    setError(null);
    try {
      await prescriptionsChangerValidite(p.id, statut);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  async function handleRenouveler(p: Prescription) {
    if (!p.patient_id) return;
    setError(null);
    try {
      await prescriptionsRenouveler(p.id, { patient_id: p.patient_id, reference: p.reference || undefined });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du renouvellement.");
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Ordonnances</h1>
            <p className="mt-1 text-sm text-textMuted">Depot, extraction automatique et suivi de validite.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filtre} onChange={(e) => setFiltre(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
              <option value="">Tous statuts</option>
              {Object.entries(VALIDITE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button onClick={() => { setDepotOuvert(true); setFormOuvert(false); }} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" style={{ backgroundColor: "var(--accent)" }}>
              Deposer une ordonnance
            </button>
            <button onClick={() => { setFormOuvert(true); setDepotOuvert(false); }} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary">
              Saisie manuelle
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {depotOuvert && (
          <form onSubmit={handleDeposer} className="mb-6 rounded-xl border border-line bg-surface p-5">
            <p className="mb-3 text-sm font-medium text-textPrimary">Deposer une photo ou un PDF</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select required value={depotPatientId} onChange={(e) => setDepotPatientId(e.target.value)}
                className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                <option value="">Patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                required
                onChange={(e) => setDepotFichier(e.target.files?.[0] || null)}
                className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary file:mr-3 file:rounded file:border-0 file:bg-surface file:px-2 file:py-1 file:text-xs"
              />
            </div>
            <p className="mt-2 text-[11px] text-textMuted">
              L'extraction automatique (medecin, date, acte prescrit) fonctionne pour les photos/scans (JPEG, PNG). Pour un PDF, depose-le quand meme, l'extraction sera a completer manuellement si elle ne se declenche pas.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={depotEnCours} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {depotEnCours ? "Analyse en cours..." : "Deposer et analyser"}
              </button>
              <button type="button" onClick={() => setDepotOuvert(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
            </div>
          </form>
        )}

        {dernierDepot && (
          <div className="mb-6 rounded-xl border border-teal/40 bg-teal/10 p-5">
            <p className="mb-2 text-sm font-medium text-teal">Ordonnance deposee, extraction automatique :</p>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-textPrimary sm:grid-cols-2">
              <p><span className="text-textMuted">Medecin :</span> {dernierDepot.medecin_prescripteur || "non detecte"}</p>
              <p><span className="text-textMuted">Date :</span> {dernierDepot.date_prescription || "non detectee"}</p>
              <p className="sm:col-span-2"><span className="text-textMuted">Acte prescrit :</span> {dernierDepot.acte_prescrit_texte || "non detecte"}</p>
              <p><span className="text-textMuted">Duree :</span> {dernierDepot.duree_traitement || "-"}</p>
              {dernierDepot.confiance_ocr != null && (
                <p><span className="text-textMuted">Confiance :</span> {Math.round(dernierDepot.confiance_ocr * 100)}%</p>
              )}
            </div>
            <p className="mt-2 text-[11px] text-textMuted">
              Verifie et complete ces informations si besoin, l'extraction automatique n'est jamais garantie a 100%.
            </p>
            <button onClick={() => setDernierDepot(null)} className="mt-2 text-xs text-teal hover:underline">Masquer</button>
          </div>
        )}

        {formOuvert && (
          <form onSubmit={handleCreer} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary sm:col-span-2">
              <option value="">Patient</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </select>
            <input placeholder="Reference (ex: ORDO-Dupont-2026)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
            <input placeholder="Medecin prescripteur" value={form.medecin_prescripteur} onChange={(e) => setForm({ ...form, medecin_prescripteur: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
            <div>
              <label className="mb-1 block text-xs text-textMuted">Date prescription</label>
              <input type="date" value={form.date_prescription} onChange={(e) => setForm({ ...form, date_prescription: e.target.value })}
                className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-textMuted">Date expiration</label>
              <input type="date" value={form.date_expiration} onChange={(e) => setForm({ ...form, date_expiration: e.target.value })}
                className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={creation} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {creation ? "..." : "Creer"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
            </div>
          </form>
        )}

        {loading ? <p className="text-sm text-textMuted">Chargement...</p> : prescriptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">Aucune ordonnance.</p>
        ) : (
          <div className="space-y-2">
            {prescriptions.map((p) => (
              <div key={p.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-textPrimary">
                      {p.patient_prenom} {p.patient_nom} {p.reference && <span className="text-textMuted">- {p.reference}</span>}
                      {p.fichier_nom_original && <span className="ml-1.5 text-[10px] text-textMuted">[fichier]</span>}
                    </p>
                    <p className="text-xs text-textMuted">
                      {p.medecin_prescripteur || "-"}
                      {p.acte_prescrit_texte && ` - ${p.acte_prescrit_texte}`}
                      {" - expire le "}{p.date_expiration ? new Date(p.date_expiration).toLocaleDateString("fr-FR") : "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={p.statut_validite || "active"}
                      onChange={(e) => handleChangerValidite(p, e.target.value)}
                      className="rounded-full border-0 px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${VALIDITE_COULEUR[p.statut_validite || "active"]}22`, color: VALIDITE_COULEUR[p.statut_validite || "active"] }}
                    >
                      {Object.entries(VALIDITE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {(p.statut_validite === "a_renouveler" || p.statut_validite === "expiree") && !p.renewed_by_id && (
                      <button onClick={() => handleRenouveler(p)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary">
                        Renouveler
                      </button>
                    )}
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
