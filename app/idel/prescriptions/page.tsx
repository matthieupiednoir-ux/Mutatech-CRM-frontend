"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { prescriptionsLister, prescriptionsCreer, prescriptionsChangerValidite, prescriptionsRenouveler, Prescription } from "@/lib/api";
import { idelGetPatients } from "@/lib/api";
import { IdelPatient } from "@/lib/types";

const VALIDITE_LABEL: Record<string, string> = {
  active: "Active", a_renouveler: "À renouveler", renouvellement_demande: "Renouvellement demandé",
  renouvelee: "Renouvelée", expiree: "Expirée",
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
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
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
            <p className="mt-1 text-sm text-textMuted">Suivi de validité et renouvellement des prescriptions.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filtre} onChange={(e) => setFiltre(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
              <option value="">Tous statuts</option>
              {Object.entries(VALIDITE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button onClick={() => setFormOuvert(true)} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" style={{ backgroundColor: "var(--accent)" }}>
              + Ordonnance
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {formOuvert && (
          <form onSubmit={handleCreer} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary sm:col-span-2">
              <option value="">— Patient —</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </select>
            <input placeholder="Référence (ex: ORDO-Dupont-2026)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
            <input placeholder="Médecin prescripteur" value={form.medecin_prescripteur} onChange={(e) => setForm({ ...form, medecin_prescripteur: e.target.value })}
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
                {creation ? "..." : "Créer"}
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
                    <p className="text-sm text-textPrimary">{p.patient_prenom} {p.patient_nom} {p.reference && <span className="text-textMuted">· {p.reference}</span>}</p>
                    <p className="text-xs text-textMuted">
                      {p.medecin_prescripteur || "—"} · expire le {p.date_expiration ? new Date(p.date_expiration).toLocaleDateString("fr-FR") : "—"}
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
