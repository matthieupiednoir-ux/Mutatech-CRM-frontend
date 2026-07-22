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
export interface EvenementPlanningModifierInput extends EvenementPlanningInput {
  event_id: string;
}

interface PlanningViewProps {
  fetchMembres: () => Promise<MembrePlanning[]>;
  fetchEvenements: (debut: string, fin: string) => Promise<EvenementPlanning[]>;
  creerEvenement: (data: EvenementPlanningInput) => Promise<EvenementPlanning>;
  fetchLoginUrl: () => Promise<{ url: string }>;
  fetchStatutPersonnel: () => Promise<{ connecte: boolean; email_google?: string | null }>;
  deconnexionPersonnelle: () => Promise<unknown>;
  // Optionnels : sans eux, les evenements existants restent en lecture
  // seule (pas de risque de casser un appelant qui ne les fournit pas
  // encore, ex: la page IDEL qui n'a pas encore ete mise a jour).
  modifierEvenement?: (data: EvenementPlanningModifierInput) => Promise<EvenementPlanning>;
  supprimerEvenement?: (eventId: string, assigneAContexte: string) => Promise<unknown>;
  accentColor?: string; // ex "#6C63FF" (CRM) ou "#FF2E9A" (IDEL)
}

const PALETTE = ["#6C63FF", "#00D4AA", "#F5A623", "#a89eff", "#EF4444", "#FF2E9A", "#5fe0c0"];
const NOMS_JOURS_COURTS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Formate une date en "YYYY-MM-DD" a partir de SES COMPOSANTES LOCALES
// (annee/mois/jour tels qu'affiches a l'ecran) -- jamais via
// toISOString(), qui convertit d'abord en UTC et decale donc la date
// d'un jour des que l'heure locale est proche de minuit (systematique
// en France, UTC+1/+2 : minuit local = la veille en UTC).
function dateLocaleISO(d: Date): string {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

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

// Premier jour visible dans la grille du mois (le lundi de la semaine
// contenant le 1er du mois) -- la grille remonte parfois dans le mois
// precedent pour completer la premiere ligne.
function premierJourGrilleMois(moisRef: Date): Date {
  const premier = new Date(moisRef.getFullYear(), moisRef.getMonth(), 1);
  const jour = (premier.getDay() + 6) % 7;
  premier.setDate(premier.getDate() - jour);
  premier.setHours(0, 0, 0, 0);
  return premier;
}
// 6 lignes x 7 colonnes = 42 jours, largeur fixe qui couvre tous les cas
// (un mois peut chevaucher jusqu'a 6 semaines civiles).
function joursDeLaGrilleMois(premierJour: Date): Date[] {
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(premierJour);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toISODateTime(jour: Date, heure: string): string {
  return `${dateLocaleISO(jour)}T${heure}:00`;
}

const NOMS_MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export default function PlanningView({
  fetchMembres, fetchEvenements, creerEvenement,
  fetchLoginUrl, fetchStatutPersonnel, deconnexionPersonnelle,
  modifierEvenement, supprimerEvenement,
  accentColor = "#6C63FF",
}: PlanningViewProps) {
  const [vue, setVue] = useState<"mois" | "semaine">("mois");
  const [offsetSemaine, setOffsetSemaine] = useState(0);
  const [offsetMois, setOffsetMois] = useState(0);
  const [membres, setMembres] = useState<MembrePlanning[]>([]);
  const [evenements, setEvenements] = useState<EvenementPlanning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statutMoi, setStatutMoi] = useState<{ connecte: boolean; email_google?: string | null } | null>(null);
  const [connexionEnCours, setConnexionEnCours] = useState(false);

  const [formOuvert, setFormOuvert] = useState(false);
  const [modeForm, setModeForm] = useState<"creation" | "edition">("creation");
  const [eventIdEdition, setEventIdEdition] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [assigneA, setAssigneA] = useState("");
  const [jourForm, setJourForm] = useState("");
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("10:00");
  const [lieu, setLieu] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState(false);

  const peutEditer = Boolean(modifierEvenement && supprimerEvenement);

  const lundi = useMemo(() => lundiDeSemaine(offsetSemaine), [offsetSemaine]);
  const joursSemaine = useMemo(() => joursDeLaSemaine(lundi), [lundi]);

  const moisRef = useMemo(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth() + offsetMois, 1);
  }, [offsetMois]);
  const premierJourGrille = useMemo(() => premierJourGrilleMois(moisRef), [moisRef]);
  const joursGrilleMois = useMemo(() => joursDeLaGrilleMois(premierJourGrille), [premierJourGrille]);

  // Plage a charger depuis l'API selon la vue active -- le mois demande
  // 42 jours (grille complete), la semaine seulement 7.
  const { plageDebut, plageFin } = useMemo(() => {
    if (vue === "mois") {
      const dernier = joursGrilleMois[joursGrilleMois.length - 1];
      return { plageDebut: premierJourGrille, plageFin: dernier };
    }
    return { plageDebut: joursSemaine[0], plageFin: joursSemaine[6] };
  }, [vue, joursGrilleMois, premierJourGrille, joursSemaine]);

  const couleurParContexte = useMemo(() => {
    const map: Record<string, string> = {};
    membres.forEach((m, i) => { map[m.contexte] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [membres]);

  function charger() {
    setLoading(true);
    setError(null);
    // Bornes en heure LOCALE (pas UTC) -- decalage de l'offset local
    // ajoute manuellement pour que "00:00 France" et "23:59 France"
    // restent les vraies bornes demandees a Google Calendar, quelle que
    // soit la saison (UTC+1 ou UTC+2).
    const offsetMin = new Date().getTimezoneOffset();
    const signe = offsetMin > 0 ? "-" : "+";
    const abs = Math.abs(offsetMin);
    const decalage = `${signe}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
    const debut = `${dateLocaleISO(plageDebut)}T00:00:00${decalage}`;
    const fin = `${dateLocaleISO(plageFin)}T23:59:59${decalage}`;
    Promise.all([fetchMembres(), fetchEvenements(debut, fin)])
      .then(([m, e]) => { setMembres(m); setEvenements(e); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, [vue, offsetSemaine, offsetMois]); // eslint-disable-line react-hooks/exhaustive-deps
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

  function resetForm() {
    setTitre("");
    setLieu("");
    setAssigneA(membres.find((m) => m.connecte)?.contexte || "");
    setHeureDebut("09:00");
    setHeureFin("10:00");
    setEventIdEdition(null);
  }

  function ouvrirNouveau(jour: Date) {
    resetForm();
    setJourForm(dateLocaleISO(jour));
    setModeForm("creation");
    setFormOuvert(true);
    setError(null);
  }

  function ouvrirEdition(e: EvenementPlanning) {
    if (!peutEditer) return;
    setModeForm("edition");
    setEventIdEdition(e.id);
    setTitre(e.titre);
    setLieu(e.lieu || "");
    setAssigneA(e.proprietaire_contexte);
    if (e.debut) {
      setJourForm(e.debut.slice(0, 10));
      setHeureDebut(e.debut.slice(11, 16));
    }
    if (e.fin) {
      setHeureFin(e.fin.slice(11, 16));
    }
    setFormOuvert(true);
    setError(null);
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
      if (modeForm === "edition" && eventIdEdition && modifierEvenement) {
        await modifierEvenement({
          event_id: eventIdEdition,
          titre,
          debut: toISODateTime(new Date(jourForm), heureDebut),
          fin: toISODateTime(new Date(jourForm), heureFin),
          lieu: lieu || undefined,
          assigne_a_contexte: assigneA,
        });
      } else {
        await creerEvenement({
          titre,
          debut: toISODateTime(new Date(jourForm), heureDebut),
          fin: toISODateTime(new Date(jourForm), heureFin),
          lieu: lieu || undefined,
          assigne_a_contexte: assigneA,
        });
      }
      setFormOuvert(false);
      resetForm();
      charger();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleSupprimerEvenement() {
    if (!eventIdEdition || !supprimerEvenement) return;
    if (!confirm("Supprimer définitivement cet événement du Google Calendar ?")) return;
    setSuppression(true);
    setError(null);
    try {
      await supprimerEvenement(eventIdEdition, assigneA);
      setFormOuvert(false);
      resetForm();
      charger();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la suppression.");
    } finally {
      setSuppression(false);
    }
  }

  function evenementsDuJour(jour: Date): EvenementPlanning[] {
    const iso = dateLocaleISO(jour);
    return evenements.filter((e) => e.debut?.slice(0, 10) === iso);
  }

  function ChipEvenement({ e, compact = false }: { e: EvenementPlanning; compact?: boolean }) {
    const couleur = couleurParContexte[e.proprietaire_contexte] || "#77778A";
    const contenu = (
      <>
        <p className={compact ? "truncate font-medium" : "font-medium"}>{e.titre}</p>
        {!compact && <p className="opacity-80">{e.debut?.slice(11, 16)} · {e.proprietaire_nom}</p>}
        {!compact && e.lieu && <p className="opacity-70">📍 {e.lieu}</p>}
      </>
    );
    const style = { backgroundColor: `${couleur}22`, color: couleur };
    if (peutEditer) {
      return (
        <button
          onClick={() => ouvrirEdition(e)}
          className={`block w-full rounded-lg px-2 py-1.5 text-left ${compact ? "text-[10px]" : "text-[11px]"} hover:brightness-110 transition`}
          style={style}
          title="Cliquer pour modifier"
        >
          {compact ? `${e.debut?.slice(11, 16)} ${e.titre}` : contenu}
        </button>
      );
    }
    return (
      <div className={`rounded-lg px-2 py-1.5 ${compact ? "text-[10px]" : "text-[11px]"}`} style={style}>
        {compact ? `${e.debut?.slice(11, 16)} ${e.titre}` : contenu}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Bascule Mois / Semaine */}
          <div className="flex rounded-lg border border-line p-0.5">
            <button
              onClick={() => setVue("mois")}
              className="rounded-md px-3 py-1 text-xs font-medium transition"
              style={vue === "mois" ? { backgroundColor: accentColor, color: "#fff" } : { color: "var(--color-text-muted)" }}
            >
              Mois
            </button>
            <button
              onClick={() => setVue("semaine")}
              className="rounded-md px-3 py-1 text-xs font-medium transition"
              style={vue === "semaine" ? { backgroundColor: accentColor, color: "#fff" } : { color: "var(--color-text-muted)" }}
            >
              Semaine
            </button>
          </div>

          {vue === "mois" ? (
            <>
              <button onClick={() => setOffsetMois((o) => o - 1)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">←</button>
              <button onClick={() => setOffsetMois(0)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">Aujourd'hui</button>
              <button onClick={() => setOffsetMois((o) => o + 1)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">→</button>
              <span className="ml-2 text-sm text-textMuted capitalize">
                {NOMS_MOIS[moisRef.getMonth()]} {moisRef.getFullYear()}
              </span>
            </>
          ) : (
            <>
              <button onClick={() => setOffsetSemaine((o) => o - 1)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">←</button>
              <button onClick={() => setOffsetSemaine(0)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">Aujourd'hui</button>
              <button onClick={() => setOffsetSemaine((o) => o + 1)} className="rounded-lg border border-line px-3 py-1.5 text-sm text-textMuted hover:text-textPrimary">→</button>
              <span className="ml-2 text-sm text-textMuted">
                Semaine du {lundi.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
              </span>
            </>
          )}
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

      {error && !formOuvert && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

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
          <p className="text-sm font-medium text-textPrimary sm:col-span-2">
            {modeForm === "edition" ? "Modifier l'événement" : "Nouvel événement"} — {jourForm && new Date(jourForm).toLocaleDateString("fr-FR")}
          </p>
          {error && <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber sm:col-span-2">{error}</p>}
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
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button type="submit" disabled={enregistrement || suppression || membres.filter((m) => m.connecte).length === 0}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: accentColor }}>
              {enregistrement ? "..." : modeForm === "edition" ? "Enregistrer" : "Créer"}
            </button>
            {modeForm === "edition" && supprimerEvenement && (
              <button type="button" onClick={handleSupprimerEvenement} disabled={enregistrement || suppression}
                className="rounded-lg border border-amber/40 px-4 py-2 text-sm text-amber hover:bg-amber/10 disabled:opacity-50">
                {suppression ? "..." : "Supprimer"}
              </button>
            )}
            <button type="button" onClick={() => { setFormOuvert(false); resetForm(); }}
              className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-textMuted">Chargement…</p>
      ) : vue === "mois" ? (
        <div>
          <div className="mb-1 grid grid-cols-7 gap-1.5">
            {NOMS_JOURS_COURTS.map((j) => (
              <div key={j} className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-textMuted">{j}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {joursGrilleMois.map((jour, i) => {
              const dansLeMois = jour.getMonth() === moisRef.getMonth();
              const estAujourdhui = dateLocaleISO(jour) === dateLocaleISO(new Date());
              const evts = evenementsDuJour(jour);
              const evtsAffiches = evts.slice(0, 3);
              return (
                <div key={i}
                  className="min-h-[92px] rounded-lg border p-1.5 transition"
                  style={{
                    borderColor: "var(--color-line)",
                    backgroundColor: dansLeMois ? "var(--color-surface)" : "transparent",
                    opacity: dansLeMois ? 1 : 0.4,
                  }}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium" style={estAujourdhui ? { color: accentColor, fontWeight: 700 } : { color: "var(--color-text-muted)" }}>
                      {jour.getDate()}
                    </span>
                    <button onClick={() => ouvrirNouveau(jour)} className="text-[11px] text-textMuted hover:text-textPrimary">+</button>
                  </div>
                  <div className="space-y-1">
                    {evtsAffiches.map((e) => <ChipEvenement key={e.id} e={e} compact />)}
                    {evts.length > 3 && (
                      <p className="text-[10px] text-textMuted">+{evts.length - 3} autre(s)</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {joursSemaine.map((jour, i) => {
            const estAujourdhui = dateLocaleISO(jour) === dateLocaleISO(new Date());
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
                    {evtsJour.map((e) => <ChipEvenement key={e.id} e={e} />)}
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
