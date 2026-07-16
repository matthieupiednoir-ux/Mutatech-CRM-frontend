"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api";

export interface MembrePlanning {
  contexte: string;
  nom: string;
  connecte: boolean;
  email_google?: string | null;
}
export interface EvenementPlanning {
  id: string;
  titre: string;
  debut?: string | null;
  fin?: string | null;
  lieu?: string | null;
  proprietaire_contexte: string;
  proprietaire_nom: string;
}
export interface EvenementPlanningInput {
  titre: string;
  debut: string;
  fin: string;
  description?: string;
  lieu?: string;
  assigne_a_contexte: string;
}

interface PlanningViewProps {
  fetchMembres: () => Promise<MembrePlanning[]>;
  fetchEvenements: (debut: string, fin: string) => Promise<EvenementPlanning[]>;
  creerEvenement: (data: EvenementPlanningInput) => Promise<EvenementPlanning>;
  fetchLoginUrl: () => Promise<{ url: string }>;
  fetchStatutPersonnel: () => Promise<{ connecte: boolean; email_google?: string | null }>;
  deconnexionPersonnelle: () => Promise<unknown>;
  accentColor?: string; // ex "#6C63FF" (CRM) ou "#FF2E9A" (IDEL)
}

const PALETTE = ["#6C63FF", "#00D4AA", "#F5A623", "#a89eff", "#EF4444", "#FF2E9A", "#5fe0c0"];

function lundiDeSemaine(offsetSemaines = 0): Date {
  const d = new Date();
  const jour = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - jour + offsetSemaines * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}
function joursDeLaSemaine(lundi: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(d.getDate() + i);
    return d;
  });
}
function toISODateTime(jour: Date, heure: string): string {
  return `${jour.toISOString().slice(0, 10)}T${heure}:00`;
}

export default function PlanningView({
  fetchMembres, fetchEvenements, creerEvenement,
  fetchLoginUrl, fetchStatutPersonnel, deconnexionPersonnelle,
  accentColor = "#6C63FF",
}: PlanningViewProps) {
  const [offsetSemaine, setOffsetSemaine] = useState(0);
  const [membres, setMembres] = useState<MembrePlanning[]>([]);
  const [evenements, setEvenements] = useState<EvenementPlanning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statutMoi, setStatutMoi] = useState<{ connecte: boolean; email_google?: string | null } | null>(null);
  const [connexionEnCours, setConnexionEnCours] = useState(false);

  const [formOuvert, setFormOuvert] = useState(false);
  const [titre, setTitre] = useState("");
  const [assigneA, setAssigneA] = useState("");
  const [jourForm, setJourForm] = useState("");
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("10:00");
  const [lieu, setLieu] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  const lundi = useMemo(() => lundiDeSemaine(offsetSemaine), [offsetSemaine]);
  const jours = useMemo(() => joursDeLaSemaine(lundi), [lundi]);

  const couleurParContexte = useMemo(() => {
    const map: Record<string, string> = {};
    membres.forEach((m, i) => { map[m.contexte] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [membres]);

  function charger() {
    setLoading(true);
    setError(null);
    const debut = `${jours[0].toISOString().slice(0, 10)}T00:00:00Z`;
    const fin = `${jours[6].toISOString().slice(0, 10)}T23:59:59Z`;
    Promise.all([fetchMembres(), fetchEvenements(debut, fin)])
      .then(([m, e]) => { setMembres(m); setEvenements(e); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, [offsetSemaine]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchStatutPersonnel().then(setStatutMoi).catch(() => setStatutMoi({ connecte: false }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConnecter() {
    setConnexionEnCours(true);
    try {
      const { url } = await fetchLoginUrl();
      window.location.href = url;
    } catch {
      setError("Impossible de générer le lien de connexion Google.");
      setConnexionEnCours(false);
    }
  }

  async function handleDeconnecter() {
    if (!confirm("Déconnecter ton Google Calendar du planning ?")) return;
    try {
      await deconnexionPersonnelle();
      setStatutMoi({ connecte: false });
    } catch {
      setError("Erreur lors de la déconnexion.");
    }
  }

  function ouvrirNouveau(jour: Date) {
    setJourForm(jour.toISOString().slice(0, 10));
    setTitre("");
    setLieu("");
    setAssigneA(membres.find((m) => m.connecte)?.contexte || "");
    setFormOuvert(true);
  }

  async function handleCreer(e: React.FormEvent) {
    e.preventDefault();
    if (!assigneA) {
      setError("Choisis à qui assigner cet événement.");
      return;
    }
    setEnregistrement(true);
    setError(null);
    try {
      await creerEvenement({
        titre,
        debut: toISODateTime(new Date(jourForm), heureDebut),
        fin: toISODateTime(new Date(jourForm), heureFin),
        lieu: lieu || undefined,
        assigne_a_contexte: assigneA,
      });
      setFormOuvert(false);
      charger();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la création.");
    } finally {
      setEnregistrement(false);
    }
  }

  function evenementsDuJour(jour: Date): EvenementPlanning[] {
    const iso = jour.toISOString().slice(0, 10);
    return evenements.filter((e) => e.debut?.slice(0, 10) === iso);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setOffsetSemaine((o) => o - 1)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">←</button>
          <button onClick={() => setOffsetSemaine(0)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">Aujourd'hui</button>
          <button onClick={() => setOffsetSemaine((o) => o + 1)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">→</button>
          <span className="ml-2 text-sm text-textMuted">
            Semaine du {lundi.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {statutMoi?.connecte ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs text-teal">
              ✓ {statutMoi.email_google || "Connecté"}
              <button onClick={handleDeconnecter} className="ml-1 text-teal/70 hover:text-teal">✕</button>
            </span>
          ) : (
            <button onClick={handleConnecter} disabled={connexionEnCours}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: accentColor }}>
              {connexionEnCours ? "…" : "Connecter mon Google Calendar"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

      {/* Legende couleur */}
      {membres.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {membres.map((m) => (
            <span key={m.contexte} className="flex items-center gap-1.5 text-xs text-textMuted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: couleurParContexte[m.contexte] }} />
              {m.nom}{!m.connecte && " (non connecté)"}
            </span>
          ))}
        </div>
      )}

      {formOuvert && (
        <form onSubmit={handleCreer} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
          <p className="text-sm font-medium text-textPrimary sm:col-span-2">Nouvel événement — {new Date(jourForm).toLocaleDateString("fr-FR")}</p>
          <input required placeholder="Titre" value={titre} onChange={(e) => setTitre(e.target.value)}
            className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
          <select required value={assigneA} onChange={(e) => setAssigneA(e.target.value)}
            className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
            <option value="">— Assigner à —</option>
            {membres.filter((m) => m.connecte).map((m) => <option key={m.contexte} value={m.contexte}>{m.nom}</option>)}
          </select>
          <input placeholder="Lieu (optionnel)" value={lieu} onChange={(e) => setLieu(e.target.value)}
            className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
          <input type="time" required value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)}
            className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
          <input type="time" required value={heureFin} onChange={(e) => setHeureFin(e.target.value)}
            className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
          {membres.filter((m) => m.connecte).length === 0 && (
            <p className="text-xs text-amber sm:col-span-2">
              Personne n'a encore connecté son Google Calendar — connecte le tien ci-dessus pour pouvoir t'assigner un événement.
            </p>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={enregistrement || membres.filter((m) => m.connecte).length === 0}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: accentColor }}>
              {enregistrement ? "..." : "Créer"}
            </button>
            <button type="button" onClick={() => setFormOuvert(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-textMuted">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {jours.map((jour, i) => {
            const estAujourdhui = jour.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
            const evtsJour = evenementsDuJour(jour);
            return (
              <div key={i} className="rounded-xl border border-line bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium" style={estAujourdhui ? { color: accentColor } : { color: "#9999B5" }}>
                    {jour.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <button onClick={() => ouvrirNouveau(jour)} className="text-xs text-textMuted hover:text-textPrimary">+</button>
                </div>
                {evtsJour.length === 0 ? (
                  <p className="text-[11px] text-textMuted/60">—</p>
                ) : (
                  <div className="space-y-1.5">
                    {evtsJour.map((e) => (
                      <div key={e.id} className="rounded-lg px-2 py-1.5 text-[11px]"
                        style={{ backgroundColor: `${couleurParContexte[e.proprietaire_contexte] || "#77778A"}22`, color: couleurParContexte[e.proprietaire_contexte] || "#77778A" }}>
                        <p className="font-medium">{e.titre}</p>
                        <p className="opacity-80">{e.debut?.slice(11, 16)} · {e.proprietaire_nom}</p>
                        {e.lieu && <p className="opacity-70">📍 {e.lieu}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
