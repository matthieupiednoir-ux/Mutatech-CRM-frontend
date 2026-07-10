"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { agendaListerEvenements, agendaCreerEvenement, agendaModifierEvenement, agendaSupprimerEvenement, CalendarEvent } from "@/lib/api";

const TYPE_LABEL: Record<string, string> = {
  visite_patient: "Visite patient", rdv_interne: "RDV interne", rdv_externe: "RDV externe",
  livraison: "Livraison", renouvellement_ordo: "Renouvellement ordo", autre: "Autre",
};
const STATUT_LABEL: Record<string, string> = {
  planifie: "Planifié", confirme: "Confirmé", termine: "Terminé", annule: "Annulé",
};
const STATUT_COULEUR: Record<string, string> = {
  planifie: "#77778A", confirme: "#00D4AA", termine: "#a89eff", annule: "#EF4444",
};

function debutSemaine(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1);
  return d.toISOString().slice(0, 10);
}
function finSemaine(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 7);
  return d.toISOString().slice(0, 10);
}

export default function AgendaPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState({
    title: "", event_type: "rdv_interne", date: new Date().toISOString().slice(0, 10),
    heure_debut: "09:00", heure_fin: "10:00", location: "", description: "",
  });
  const [creation, setCreation] = useState(false);

  function charger() {
    setLoading(true);
    agendaListerEvenements(`${debutSemaine()}T00:00:00`, `${finSemaine()}T23:59:59`)
      .then(setEvents)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleCreer(e: React.FormEvent) {
    e.preventDefault();
    setCreation(true);
    setError(null);
    try {
      await agendaCreerEvenement({
        title: form.title,
        event_type: form.event_type,
        start_datetime: `${form.date}T${form.heure_debut}:00`,
        end_datetime: `${form.date}T${form.heure_fin}:00`,
        location: form.location || undefined,
        description: form.description || undefined,
      });
      setForm({ ...form, title: "", location: "", description: "" });
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
    } finally {
      setCreation(false);
    }
  }

  async function handleChangerStatut(ev: CalendarEvent, status: string) {
    setError(null);
    try {
      await agendaModifierEvenement(ev.id, { status });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  async function handleSupprimer(ev: CalendarEvent) {
    if (!confirm(`Supprimer "${ev.title}" ?`)) return;
    setError(null);
    try {
      await agendaSupprimerEvenement(ev.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  const evenementsParJour = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const jour = ev.start_datetime.slice(0, 10);
    (acc[jour] ||= []).push(ev);
    return acc;
  }, {});

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Agenda</h1>
            <p className="mt-1 text-sm text-textMuted">Événements de la semaine en cours.</p>
          </div>
          <button onClick={() => setFormOuvert(true)} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" style={{ backgroundColor: "var(--accent)" }}>
            + Événement
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {formOuvert && (
          <form onSubmit={handleCreer} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <input required placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            <input type="time" required value={form.heure_debut} onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            <input type="time" required value={form.heure_fin} onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            <input placeholder="Lieu (optionnel)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={creation} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {creation ? "..." : "Créer"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
            </div>
          </form>
        )}

        {loading ? <p className="text-sm text-textMuted">Chargement...</p> : events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">Aucun événement cette semaine.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(evenementsParJour).sort().map(([jour, evs]) => (
              <div key={jour}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-textMuted">
                  {new Date(jour).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <div className="space-y-1.5">
                  {evs.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime)).map((ev) => (
                    <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-textMuted">{ev.start_datetime.slice(11, 16)}</span>
                        <span className="text-sm text-textPrimary">{ev.title}</span>
                        <span className="text-xs text-textMuted">{TYPE_LABEL[ev.event_type] || ev.event_type}</span>
                        {ev.location && <span className="text-xs text-textMuted">📍 {ev.location}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <select value={ev.status} onChange={(e) => handleChangerStatut(ev, e.target.value)}
                          className="rounded-full border-0 px-2.5 py-1 text-xs font-medium"
                          style={{ backgroundColor: `${STATUT_COULEUR[ev.status]}22`, color: STATUT_COULEUR[ev.status] }}>
                          {Object.entries(STATUT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                        <button onClick={() => handleSupprimer(ev)} className="text-xs text-textMuted hover:text-amber">Suppr.</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
