"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import {
  tourneesLister, tourneesCreer, tourneesAjouterVisite, tourneesModifierVisite,
  Tournee, TourneeVisit,
} from "@/lib/api";
import { idelGetPatients } from "@/lib/api";
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
            {tournees.map((t) => (
              <div key={t.id} className="rounded-xl border border-line bg-surface p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg text-textPrimary">{t.technicien_name}</h2>
                  <button
                    onClick={() => setVisiteTourneeId(visiteTourneeId === t.id ? null : t.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-surfaceAlt"
                  >
                    + Ajouter une visite
                  </button>
                </div>

                {t.visits.length === 0 ? (
                  <p className="text-xs text-textMuted">Aucune visite planifiée.</p>
                ) : (
                  <div className="space-y-1.5">
                    {t.visits.map((v) => (
                      <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surfaceAlt px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-textMuted">{v.scheduled_time}</span>
                          <span className="text-sm text-textPrimary">{v.patient_prenom} {v.patient_nom}</span>
                          <span className="text-xs text-textMuted">{PRESTATION_LABEL[v.prestation] || v.prestation}</span>
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
                          <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
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
            ))}
          </div>
        )}
      </main>
    </>
  );
}
