"use client";

import { useEffect, useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { agendaListerEvenements, agendaCreerEvenement, agendaModifierEvenement, agendaSupprimerEvenement, idelInsights, CalendarEvent } from "@/lib/api";
import InsightStrip from "@/components/InsightStrip";
import { idelGetPatients } from "@/lib/api";
import { IdelPatient } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  visite_patient: "Visite patient", rdv_interne: "RDV interne", rdv_externe: "RDV externe",
  livraison: "Livraison", renouvellement_ordo: "Renouvellement ordo", autre: "Autre",
};
const TYPE_COULEUR: Record<string, string> = {
  visite_patient: "#00D4AA", rdv_interne: "#6C63FF", rdv_externe: "#a89eff",
  livraison: "#F5A623", renouvellement_ordo: "#EF4444", autre: "#77778A",
};
const STATUT_LABEL: Record<string, string> = {
  planifie: "Planifié", confirme: "Confirmé", termine: "Terminé", annule: "Annulé",
};

const HEURE_DEBUT = 7;
const HEURE_FIN = 20;
const NB_CRENEAUX = (HEURE_FIN - HEURE_DEBUT) * 2; // demi-heures
const JOURS_LABEL = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function lundiDeSemaine(offsetSemaines = 0): Date {
  const d = new Date();
  const jour = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - jour + offsetSemaines * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function joursDeLaSemaine(lundi: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(d.getDate() + i);
    return d;
  });
}

interface FormEvent {
  id?: string;
  title: string; event_type: string; date: string;
  heure_debut: string; heure_fin: string; location: string; description: string;
  patient_id: string; status: string;
}
const FORM_VIDE: FormEvent = {
  title: "", event_type: "rdv_interne", date: "", heure_debut: "09:00", heure_fin: "10:00",
  location: "", description: "", patient_id: "", status: "planifie",
};

export default function AgendaPage() {
  const [offsetSemaine, setOffsetSemaine] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormEvent | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);

  const lundi = useMemo(() => lundiDeSemaine(offsetSemaine), [offsetSemaine]);
  const jours = useMemo(() => joursDeLaSemaine(lundi), [lundi]);

  function charger() {
    setLoading(true);
    const debut = toISODate(jours[0]);
    const fin = toISODate(jours[6]);
    agendaListerEvenements(`${debut}T00:00:00`, `${fin}T23:59:59`)
      .then(setEvents)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, [offsetSemaine]);
  useEffect(() => { idelGetPatients().then(setPatients).catch(() => {}); }, []);

  function ouvrirNouveau(date: Date, heure?: string) {
    setForm({ ...FORM_VIDE, date: toISODate(date), heure_debut: heure || "09:00", heure_fin: heure || "10:00" });
  }
  function ouvrirEdition(ev: CalendarEvent) {
    setForm({
      id: ev.id, title: ev.title, event_type: ev.event_type,
      date: ev.start_datetime.slice(0, 10),
      heure_debut: ev.start_datetime.slice(11, 16), heure_fin: ev.end_datetime.slice(11, 16),
      location: ev.location || "", description: ev.description || "",
      patient_id: ev.patient_id || "", status: ev.status,
    });
  }

  function handlePatientChange(patientId: string) {
    if (!form) return;
    const patient = patients.find((p) => p.id === patientId);
    setForm({
      ...form,
      patient_id: patientId,
      location: patient?.adresse || form.location,
      title: form.title || (patient ? `Visite — ${patient.prenom} ${patient.nom}` : form.title),
    });
  }

  async function handleEnregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setEnregistrement(true);
    setError(null);
    try {
      if (form.id) {
        await agendaModifierEvenement(form.id, {
          title: form.title,
          start_datetime: `${form.date}T${form.heure_debut}:00`,
          end_datetime: `${form.date}T${form.heure_fin}:00`,
          location: form.location || undefined,
          description: form.description || undefined,
          status: form.status,
        });
      } else {
        await agendaCreerEvenement({
          title: form.title,
          event_type: form.event_type,
          start_datetime: `${form.date}T${form.heure_debut}:00`,
          end_datetime: `${form.date}T${form.heure_fin}:00`,
          location: form.location || undefined,
          description: form.description || undefined,
          patient_id: form.patient_id || undefined,
        });
      }
      setForm(null);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleSupprimer() {
    if (!form?.id) return;
    if (!confirm(`Supprimer "${form.title}" ?`)) return;
    setError(null);
    try {
      await agendaSupprimerEvenement(form.id);
      setForm(null);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  function evenementsDuJour(jour: Date): CalendarEvent[] {
    const iso = toISODate(jour);
    return events.filter((ev) => ev.start_datetime.slice(0, 10) === iso);
  }

  function positionCreneau(ev: CalendarEvent): { rowStart: number; rowSpan: number } | null {
    const [hDeb, mDeb] = ev.start_datetime.slice(11, 16).split(":").map(Number);
    const [hFin, mFin] = ev.end_datetime.slice(11, 16).split(":").map(Number);
    if (hDeb < HEURE_DEBUT || hDeb >= HEURE_FIN) return null;
    const rowStart = 1 + (hDeb - HEURE_DEBUT) * 2 + (mDeb >= 30 ? 1 : 0);
    const finCreneau = (hFin - HEURE_DEBUT) * 2 + (mFin >= 30 ? 1 : 0);
    const rowSpan = Math.max(1, finCreneau - (rowStart - 1));
    return { rowStart, rowSpan };
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <InsightStrip fetcher={idelInsights} module="agenda" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Agenda</h1>
            <p className="mt-1 text-sm text-textMuted">
              Semaine du {lundi.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setOffsetSemaine((o) => o - 1)} className="rounded-lg border border-line px-3 py-2 text-sm text-textMuted hover:text-textPrimary">←</button>
            <button onClick={() => setOffsetSemaine(0)} className="rounded-lg border border-line px-3 py-2 text-sm text-textMuted hover:text-textPrimary">Aujourd'hui</button>
            <button onClick={() => setOffsetSemaine((o) => o + 1)} className="rounded-lg border border-line px-3 py-2 text-sm text-textMuted hover:text-textPrimary">→</button>
            <button onClick={() => ouvrirNouveau(new Date())} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" style={{ backgroundColor: "var(--accent)" }}>
              + Événement
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {form && (
          <form onSubmit={handleEnregistrer} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <p className="text-sm font-medium text-textPrimary sm:col-span-2">{form.id ? "Modifier l'événement" : "Nouvel événement"}</p>
            <select value={form.patient_id} onChange={(e) => handlePatientChange(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary sm:col-span-2">
              <option value="">— Lier un patient (optionnel, remplit l'adresse) —</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </select>
            <input required placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            {!form.id && (
              <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            {form.id && (
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                {Object.entries(STATUT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            )}
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            <input type="time" required value={form.heure_debut} onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            <input type="time" required value={form.heure_fin} onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            <input placeholder="Lieu / adresse" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <textarea placeholder="Description (optionnel)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button type="submit" disabled={enregistrement} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {enregistrement ? "..." : form.id ? "Enregistrer" : "Créer"}
              </button>
              <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
              {form.id && (
                <button type="button" onClick={handleSupprimer} className="ml-auto rounded-lg border border-amber/40 px-4 py-2 text-sm text-amber hover:bg-amber/10">
                  Supprimer
                </button>
              )}
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <div className="grid min-w-[860px]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              {/* En-tetes jours */}
              <div className="border-b border-line" />
              {jours.map((jour, i) => {
                const estAujourdhui = toISODate(jour) === toISODate(new Date());
                return (
                  <button
                    key={i}
                    onClick={() => ouvrirNouveau(jour)}
                    className="border-b border-l border-line px-2 py-2 text-center text-xs hover:bg-surfaceAlt"
                  >
                    <div className="text-textMuted">{JOURS_LABEL[i]}</div>
                    <div
                      className="mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full font-medium"
                      style={estAujourdhui ? { backgroundColor: "var(--accent)", color: "white" } : { color: "var(--text-primary, #F4F4FA)" }}
                    >
                      {jour.getDate()}
                    </div>
                  </button>
                );
              })}

              {/* Grille horaire */}
              <div className="relative" style={{ gridColumn: "1", gridRow: `2 / span ${NB_CRENEAUX}` }}>
                {Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => (
                  <div key={i} className="flex h-12 items-start justify-end border-t border-line/50 pr-1.5 text-[10px] text-textMuted">
                    {HEURE_DEBUT + i}h
                  </div>
                ))}
              </div>

              {jours.map((jour, colIndex) => (
                <div
                  key={colIndex}
                  className="relative grid border-l border-line"
                  style={{ gridTemplateRows: `repeat(${NB_CRENEAUX}, 24px)` }}
                >
                  {Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => (
                    <div
                      key={i}
                      onClick={() => ouvrirNouveau(jour, `${HEURE_DEBUT + i}:00`)}
                      className="col-start-1 row-span-2 cursor-pointer border-t border-line/50 hover:bg-surfaceAlt/40"
                      style={{ gridRow: `${i * 2 + 1} / span 2` }}
                    />
                  ))}
                  {evenementsDuJour(jour).map((ev) => {
                    const pos = positionCreneau(ev);
                    if (!pos) return null;
                    return (
                      <button
                        key={ev.id}
                        onClick={(e) => { e.stopPropagation(); ouvrirEdition(ev); }}
                        className="col-start-1 z-10 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight text-white shadow-sm"
                        style={{
                          gridRow: `${pos.rowStart} / span ${pos.rowSpan}`,
                          backgroundColor: TYPE_COULEUR[ev.event_type] || "#77778A",
                          opacity: ev.status === "annule" ? 0.4 : 1,
                        }}
                      >
                        <div className="font-medium">{ev.title}</div>
                        <div className="opacity-80">{ev.start_datetime.slice(11, 16)}</div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
