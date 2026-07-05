"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import ChatAgentPanel from "@/components/ChatAgentPanel";
import {
  getClients,
  getDevisListe,
  getFacturesListe,
  getTaches,
  getProspects,
  getEcheances,
  relancerFacture,
  genererFactureMois,
  calculerTotaux,
  ApiError,
} from "@/lib/api";
import { Client, Devis, Facture, Tache, Prospect, RecapEcheances } from "@/lib/types";

const COULEUR_BARRE: Record<string, string> = {
  brouillon: "#77778A",
  envoye: "#F0B429",
  accepte: "#5fe0c0",
  refuse: "#EF4444",
  envoyee: "#F0B429",
  payee: "#5fe0c0",
  a_contacter: "#77778A",
  contacte: "#a89eff",
  rdv_planifie: "#F0B429",
  converti: "#5fe0c0",
  perdu: "#EF4444",
  todo: "#77778A",
  prog: "#F0B429",
  done: "#5fe0c0",
};

const LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  envoyee: "Envoyée",
  payee: "Payée",
  a_contacter: "À contacter",
  contacte: "Contacté",
  rdv_planifie: "RDV planifié",
  converti: "Converti",
  perdu: "Perdu",
  todo: "À faire",
  prog: "En cours",
  done: "Fait",
};

function toArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : [];
}

function repartir(items: string[]): { statut: string; count: number }[] {
  const map: Record<string, number> = {};
  toArray<string>(items).forEach((s) => {
    map[s] = (map[s] || 0) + 1;
  });
  return Object.entries(map)
    .map(([statut, count]) => ({ statut, count }))
    .sort((a, b) => b.count - a.count);
}

type Taille = "small" | "normal" | "large";

const ORDRE_PAR_DEFAUT = [
  "kpi-clients", "kpi-ca-signe", "kpi-en-attente", "kpi-facture",
  "kpi-taches", "kpi-prospects", "echeances",
  "apercu-devis", "apercu-prospects", "apercu-factures", "apercu-taches",
  "graph-devis", "graph-prospects", "graph-factures", "graph-taches",
];

const TAILLE_PAR_DEFAUT: Record<string, Taille> = {
  "kpi-clients": "small", "kpi-ca-signe": "small", "kpi-en-attente": "small",
  "kpi-facture": "small", "kpi-taches": "small", "kpi-prospects": "small",
  echeances: "large",
  "apercu-devis": "normal", "apercu-prospects": "normal",
  "apercu-factures": "normal", "apercu-taches": "normal",
  "graph-devis": "normal", "graph-prospects": "normal",
  "graph-factures": "normal", "graph-taches": "normal",
};

const TITRES_CARTES: Record<string, string> = {
  "kpi-clients": "KPI · Clients", "kpi-ca-signe": "KPI · CA signé",
  "kpi-en-attente": "KPI · En attente signature", "kpi-facture": "KPI · Facturé",
  "kpi-taches": "KPI · Tâches accomplies", "kpi-prospects": "KPI · Prospects actifs",
  echeances: "Échéances & Relances",
  "apercu-devis": "Aperçu · Devis", "apercu-prospects": "Aperçu · Prospects",
  "apercu-factures": "Aperçu · Factures", "apercu-taches": "Aperçu · Tâches",
  "graph-devis": "Graphique · Devis par statut",
  "graph-prospects": "Graphique · Prospects par statut",
  "graph-factures": "Graphique · Factures par statut",
  "graph-taches": "Graphique · Tâches par statut",
};

const SPAN_CLASSE: Record<Taille, string> = {
  small: "col-span-6 sm:col-span-3 lg:col-span-2",
  normal: "col-span-6 lg:col-span-3",
  large: "col-span-6",
};

const TAILLE_LABEL: Record<Taille, string> = {
  small: "Petite", normal: "Normale", large: "Large",
};

const STORAGE_KEY = "mutatech-dashboard-cartes-v2";

interface ConfigDashboard {
  ordre: string[];
  masquees: string[];
  tailles: Record<string, Taille>;
}

function chargerConfig(): ConfigDashboard {
  if (typeof window === "undefined") {
    return { ordre: ORDRE_PAR_DEFAUT, masquees: [], tailles: TAILLE_PAR_DEFAUT };
  }
  try {
    const brut = localStorage.getItem(STORAGE_KEY);
    if (!brut) return { ordre: ORDRE_PAR_DEFAUT, masquees: [], tailles: TAILLE_PAR_DEFAUT };
    const parsed = JSON.parse(brut);
    const ordreSource = Array.isArray(parsed.ordre) ? parsed.ordre : [];
    const ordreComplet = [
      ...ordreSource.filter((id: string) => ORDRE_PAR_DEFAUT.includes(id)),
      ...ORDRE_PAR_DEFAUT.filter((id) => !ordreSource.includes(id)),
    ];
    return {
      ordre: ordreComplet,
      masquees: Array.isArray(parsed.masquees) ? parsed.masquees : [],
      tailles: { ...TAILLE_PAR_DEFAUT, ...(parsed.tailles || {}) },
    };
  } catch {
    return { ordre: ORDRE_PAR_DEFAUT, masquees: [], tailles: TAILLE_PAR_DEFAUT };
  }
}

function MiniBarChart({ titre, donnees }: { titre: string; donnees: { statut: string; count: number }[] }) {
  const items = toArray<{ statut: string; count: number }>(donnees);
  const total = items.reduce((s, d) => s + (d.count ?? 0), 0);
  if (total === 0) {
    return (
      <div>
        <h3 className="mb-3 font-display text-sm text-textPrimary">{titre}</h3>
        <p className="text-xs text-textMuted">Aucune donnée pour l'instant.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="mb-3 font-display text-sm text-textPrimary">{titre}</h3>
      <div className="space-y-2">
        {items.map((d) => (
          <div key={d.statut} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] text-textMuted">
              {LABEL[d.statut] || d.statut}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-surfaceAlt">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${Math.max(((d.count ?? 0) / total) * 100, 4)}%`,
                  background: COULEUR_BARRE[d.statut] || "#77778A",
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-[11px] text-textMuted">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({ label, valeur, sousLabel, couleur = "text-textPrimary" }: {
  label: string; valeur: string; sousLabel?: string; couleur?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-textMuted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${couleur}`}>{valeur}</p>
      {sousLabel && <p className="mt-0.5 text-[11px] text-textMuted">{sousLabel}</p>}
    </div>
  );
}

function AperculCard({ titre, lien, items, modePerso }: {
  titre: string; lien: string;
  items: { texte: string; sousTexte?: string; couleur?: string }[];
  modePerso: boolean;
}) {
  const safeItems = toArray<{ texte: string; sousTexte?: string; couleur?: string }>(items);
  const contenu = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm text-textPrimary">{titre}</h3>
        {!modePerso && <span className="text-xs text-violet">Voir tout →</span>}
      </div>
      {safeItems.length === 0 ? (
        <p className="text-xs text-textMuted">Rien pour l'instant.</p>
      ) : (
        <div className="space-y-1.5">
          {safeItems.map((it, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-surfaceAlt px-2.5 py-1.5">
              <span className="truncate text-xs text-textPrimary">{it.texte}</span>
              {it.sousTexte && (
                <span className="ml-2 shrink-0 text-[11px]" style={{ color: it.couleur || "#77778A" }}>
                  {it.sousTexte}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
  if (modePerso) return <div>{contenu}</div>;
  return <Link href={lien} className="-m-4 block rounded-xl p-4 transition hover:bg-surfaceAlt/40">{contenu}</Link>;
}

function EcheancesCard({ modePerso }: { modePerso: boolean }) {
  const [recap, setRecap] = useState<RecapEcheances | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  function charger() {
    getEcheances()
      .then((data) => setRecap(data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleRelancer(factureId: string) {
    setActionEnCours(factureId);
    try { await relancerFacture(factureId); charger(); } catch { }
    finally { setActionEnCours(null); }
  }

  async function handleGenererMois(devisId: string) {
    setActionEnCours(devisId);
    try { await genererFactureMois(devisId); charger(); } catch { }
    finally { setActionEnCours(null); }
  }

  const enRetard = toArray(recap?.en_retard);
  const aVenir = toArray(recap?.a_venir);
  const abonnements = toArray(recap?.abonnements_a_facturer);
  const total = enRetard.length + aVenir.length + abonnements.length;

  return (
    <div>
      <h3 className="mb-3 font-display text-sm text-textPrimary">Échéances & Relances</h3>
      {loading ? (
        <p className="text-xs text-textMuted">Chargement…</p>
      ) : total === 0 ? (
        <p className="text-xs text-textMuted">Tout est à jour — rien à signaler.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {enRetard.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-amber">En retard</p>
              <div className="space-y-1.5">
                {enRetard.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg bg-amber/10 px-2.5 py-1.5">
                    <span className="truncate text-xs text-textPrimary">
                      {f.numero} — {f.client_nom}{" "}
                      <span className="text-textMuted">({f.jours} j) · {(f.montant_ttc ?? 0).toFixed(0)} €</span>
                    </span>
                    {!modePerso && (
                      <button
                        onClick={() => handleRelancer(f.id)}
                        disabled={actionEnCours === f.id}
                        className="ml-2 shrink-0 rounded bg-amber px-2 py-0.5 text-[10px] font-medium text-ink hover:opacity-90 disabled:opacity-50"
                      >
                        {actionEnCours === f.id ? "…" : "Relancer"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {aVenir.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-textMuted">À venir (14 jours)</p>
              <div className="space-y-1.5">
                {aVenir.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg bg-surfaceAlt px-2.5 py-1.5">
                    <span className="truncate text-xs text-textPrimary">{f.numero} — {f.client_nom}</span>
                    <span className="ml-2 shrink-0 text-[11px] text-textMuted">
                      dans {-(f.jours ?? 0)} j · {(f.montant_ttc ?? 0).toFixed(0)} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {abonnements.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-violet">Abonnements à facturer</p>
              <div className="space-y-1.5">
                {abonnements.map((a) => (
                  <div key={a.devis_id} className="flex items-center justify-between rounded-lg bg-violet/10 px-2.5 py-1.5">
                    <span className="truncate text-xs text-textPrimary">
                      {a.devis_numero} — {a.client_nom}{" "}
                      <span className="text-textMuted">(mois {a.mois_index}) · {(a.montant ?? 0).toFixed(0)} €</span>
                    </span>
                    {!modePerso && (
                      <button
                        onClick={() => handleGenererMois(a.devis_id)}
                        disabled={actionEnCours === a.devis_id}
                        className="ml-2 shrink-0 rounded bg-violet px-2 py-0.5 text-[10px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                      >
                        {actionEnCours === a.devis_id ? "…" : "Générer"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CarteEditable({
  id, taille, draggedId, dropCibleId, peutMonter, peutDescendre,
  onDragStart, onDragOver, onDragEnd, onDrop,
  onMasquer, onChangerTaille, onMonter, onDescendre, children,
}: {
  id: string; taille: Taille;
  draggedId: string | null; dropCibleId: string | null;
  peutMonter: boolean; peutDescendre: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onMasquer: (id: string) => void;
  onChangerTaille: (id: string) => void;
  onMonter: (id: string) => void;
  onDescendre: (id: string) => void;
  children: React.ReactNode;
}) {
  const enTrain = draggedId === id;
  const survole = dropCibleId === id && draggedId !== id;
  return (
    <div className={`${SPAN_CLASSE[taille]} rounded-xl border-2 border-dashed bg-surface/60 p-3 transition ${enTrain ? "opacity-30" : survole ? "border-violet bg-violet/5" : "border-line/60"}`}>
      <div
        draggable
        onDragStart={(e) => onDragStart(e, id)}
        onDragOver={(e) => onDragOver(e, id)}
        onDragEnd={onDragEnd}
        onDrop={(e) => onDrop(e, id)}
        className="mb-2 flex cursor-grab items-center justify-between gap-1 rounded-lg bg-surfaceAlt px-2 py-1.5 active:cursor-grabbing"
      >
        <span className="flex items-center gap-1.5 text-[11px] text-textMuted">
          <span className="text-sm leading-none">⠿</span> Glisser
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => onMonter(id)} disabled={!peutMonter} className="rounded px-1.5 py-0.5 text-[11px] text-textMuted hover:text-textPrimary disabled:opacity-20">↑</button>
          <button onClick={() => onDescendre(id)} disabled={!peutDescendre} className="rounded px-1.5 py-0.5 text-[11px] text-textMuted hover:text-textPrimary disabled:opacity-20">↓</button>
          <button onClick={() => onChangerTaille(id)} className="rounded border border-line px-2 py-0.5 text-[10px] text-textMuted hover:text-textPrimary">{TAILLE_LABEL[taille]}</button>
          <button onClick={() => onMasquer(id)} className="rounded px-1.5 py-0.5 text-[11px] text-amber hover:bg-amber/10">✕</button>
        </div>
      </div>
      <div className="rounded-xl border border-line bg-surface p-4">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ordre, setOrdre] = useState<string[]>(ORDRE_PAR_DEFAUT);
  const [masquees, setMasquees] = useState<string[]>([]);
  const [tailles, setTailles] = useState<Record<string, Taille>>(TAILLE_PAR_DEFAUT);
  const [modePerso, setModePerso] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropCibleId, setDropCibleId] = useState<string | null>(null);

  useEffect(() => {
    const config = chargerConfig();
    setOrdre(config.ordre);
    setMasquees(config.masquees);
    setTailles(config.tailles);
  }, []);

  function sauvegarder(nouvelOrdre: string[], nouvellesMasquees: string[], nouvellesTailles: Record<string, Taille>) {
    setOrdre(nouvelOrdre);
    setMasquees(nouvellesMasquees);
    setTailles(nouvellesTailles);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ordre: nouvelOrdre, masquees: nouvellesMasquees, tailles: nouvellesTailles }));
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  }
  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== dropCibleId) setDropCibleId(id);
  }
  function handleDragEnd() { setDraggedId(null); setDropCibleId(null); }
  function handleDrop(e: React.DragEvent, cibleId: string) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/plain") || draggedId;
    if (!sourceId || sourceId === cibleId) { handleDragEnd(); return; }
    const nouvelOrdre = [...ordre];
    const depuis = nouvelOrdre.indexOf(sourceId);
    const vers = nouvelOrdre.indexOf(cibleId);
    if (depuis === -1 || vers === -1) { handleDragEnd(); return; }
    nouvelOrdre.splice(depuis, 1);
    nouvelOrdre.splice(vers, 0, sourceId);
    sauvegarder(nouvelOrdre, masquees, tailles);
    handleDragEnd();
  }
  function monter(id: string) {
    const visibles = ordre.filter((x) => !masquees.includes(x));
    const idx = visibles.indexOf(id);
    if (idx <= 0) return;
    const voisin = visibles[idx - 1];
    const nouvelOrdre = [...ordre];
    const iId = nouvelOrdre.indexOf(id), iVoisin = nouvelOrdre.indexOf(voisin);
    [nouvelOrdre[iId], nouvelOrdre[iVoisin]] = [nouvelOrdre[iVoisin], nouvelOrdre[iId]];
    sauvegarder(nouvelOrdre, masquees, tailles);
  }
  function descendre(id: string) {
    const visibles = ordre.filter((x) => !masquees.includes(x));
    const idx = visibles.indexOf(id);
    if (idx === -1 || idx >= visibles.length - 1) return;
    const voisin = visibles[idx + 1];
    const nouvelOrdre = [...ordre];
    const iId = nouvelOrdre.indexOf(id), iVoisin = nouvelOrdre.indexOf(voisin);
    [nouvelOrdre[iId], nouvelOrdre[iVoisin]] = [nouvelOrdre[iVoisin], nouvelOrdre[iId]];
    sauvegarder(nouvelOrdre, masquees, tailles);
  }
  function changerTaille(id: string) {
    const ordreTailles: Taille[] = ["small", "normal", "large"];
    const actuelle = tailles[id] || "normal";
    const suivante = ordreTailles[(ordreTailles.indexOf(actuelle) + 1) % ordreTailles.length];
    sauvegarder(ordre, masquees, { ...tailles, [id]: suivante });
  }
  function masquerCarte(id: string) { sauvegarder(ordre, [...masquees, id], tailles); }
  function reafficherCarte(id: string) { sauvegarder(ordre, masquees.filter((m) => m !== id), tailles); }
  function reinitialiser() { sauvegarder(ORDRE_PAR_DEFAUT, [], TAILLE_PAR_DEFAUT); }

  useEffect(() => {
    Promise.all([getClients(), getDevisListe(), getFacturesListe(), getTaches(), getProspects()])
      .then(([c, d, f, t, p]) => {
        setClients(toArray(c));
        setDevis(toArray(d));
        setFactures(toArray(f));
        setTaches(toArray(t));
        setProspects(toArray(p));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  // Tous les calculs utilisent toArray() pour être défensifs
  const safeDevis = toArray<Devis>(devis);
  const safeFactures = toArray<Facture>(factures);
  const safeTaches = toArray<Tache>(taches);
  const safeProspects = toArray<Prospect>(prospects);
  const safeClients = toArray<Client>(clients);

  const caSigne = safeDevis
    .filter((d) => d.statut === "accepte")
    .reduce((s, d) => s + (calculerTotaux(d.lignes, d.taux_tva ?? 0).totalHt ?? 0), 0);
  const caEnAttente = safeDevis
    .filter((d) => d.statut === "envoye")
    .reduce((s, d) => s + (calculerTotaux(d.lignes, d.taux_tva ?? 0).totalHt ?? 0), 0);
  const caFacture = safeFactures
    .filter((f) => f.statut !== "brouillon")
    .reduce((s, f) => s + (calculerTotaux(f.lignes, f.taux_tva ?? 0).totalHt ?? 0), 0);

  const tachesDone = safeTaches.filter((t) => t.statut === "done").length;
  const pctTaches = safeTaches.length > 0 ? Math.round((tachesDone / safeTaches.length) * 100) : 0;
  const prospectsActifs = safeProspects.filter((p) => p.statut !== "converti" && p.statut !== "perdu").length;
  const convertis = safeProspects.filter((p) => p.statut === "converti").length;
  const tauxConversion = safeProspects.length > 0 ? Math.round((convertis / safeProspects.length) * 100) : 0;

  const apercuDevis = safeDevis.slice(0, 3).map((d) => ({ texte: `${d.numero} — ${d.client?.nom || "—"}`, sousTexte: LABEL[d.statut] || d.statut, couleur: COULEUR_BARRE[d.statut] }));
  const apercuFactures = safeFactures.slice(0, 3).map((f) => ({ texte: `${f.numero} — ${f.client?.nom || "—"}`, sousTexte: LABEL[f.statut] || f.statut, couleur: COULEUR_BARRE[f.statut] }));
  const apercuProspects = safeProspects.slice(0, 3).map((p) => ({ texte: p.nom, sousTexte: LABEL[p.statut] || p.statut, couleur: COULEUR_BARRE[p.statut] }));
  const apercuTaches = safeTaches.slice(0, 3).map((t) => ({ texte: t.titre, sousTexte: LABEL[t.statut] || t.statut, couleur: COULEUR_BARRE[t.statut] }));

  function rendreCarte(id: string): React.ReactNode {
    switch (id) {
      case "kpi-clients": return <KpiCard label="Clients" valeur={String(safeClients.length)} />;
      case "kpi-ca-signe": return <KpiCard label="CA signé (devis)" valeur={`${caSigne.toFixed(0)} €`} couleur="text-teal" />;
      case "kpi-en-attente": return <KpiCard label="En attente signature" valeur={`${caEnAttente.toFixed(0)} €`} couleur="text-amber" />;
      case "kpi-facture": return <KpiCard label="Facturé" valeur={`${caFacture.toFixed(0)} €`} couleur="text-violet" />;
      case "kpi-taches": return <KpiCard label="Tâches accomplies" valeur={`${pctTaches}%`} sousLabel={`${tachesDone}/${safeTaches.length}`} />;
      case "kpi-prospects": return <KpiCard label="Prospects actifs" valeur={String(prospectsActifs)} sousLabel={`${tauxConversion}% de conversion`} />;
      case "echeances": return <EcheancesCard modePerso={modePerso} />;
      case "apercu-devis": return <AperculCard titre="Devis" lien="/devis" items={apercuDevis} modePerso={modePerso} />;
      case "apercu-prospects": return <AperculCard titre="Prospects" lien="/prospects" items={apercuProspects} modePerso={modePerso} />;
      case "apercu-factures": return <AperculCard titre="Factures" lien="/factures" items={apercuFactures} modePerso={modePerso} />;
      case "apercu-taches": return <AperculCard titre="Tâches" lien="/taches" items={apercuTaches} modePerso={modePerso} />;
      case "graph-devis": return <MiniBarChart titre="Devis par statut" donnees={repartir(safeDevis.map((d) => d.statut))} />;
      case "graph-prospects": return <MiniBarChart titre="Prospects par statut" donnees={repartir(safeProspects.map((p) => p.statut))} />;
      case "graph-factures": return <MiniBarChart titre="Factures par statut" donnees={repartir(safeFactures.map((f) => f.statut))} />;
      case "graph-taches": return <MiniBarChart titre="Tâches par statut" donnees={repartir(safeTaches.map((t) => t.statut))} />;
      default: return null;
    }
  }

  const cartesVisibles = ordre.filter((id) => !masquees.includes(id));

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-textPrimary">Tableau de bord</h1>
          <div className="flex items-center gap-2">
            {modePerso && masquees.length > 0 && (
              <span className="text-xs text-textMuted">{masquees.length} carte(s) masquée(s)</span>
            )}
            {modePerso && (
              <button onClick={reinitialiser} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                Réinitialiser
              </button>
            )}
            <button
              onClick={() => setModePerso((v) => !v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${modePerso ? "bg-violet text-white hover:bg-violet/90" : "border border-line text-textMuted hover:text-textPrimary"}`}
            >
              {modePerso ? "✓ Terminer" : "⚙ Personnaliser"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>
        )}

        {modePerso && (
          <p className="mb-4 text-xs text-textMuted">
            Glisse une carte par sa poignée <span className="text-sm">⠿</span> pour la déplacer, ou utilise les flèches ↑↓.
          </p>
        )}

        {modePerso && masquees.length > 0 && (
          <div className="mb-6 rounded-xl border border-dashed border-line bg-surface/50 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-textMuted">Cartes masquées — clique pour réafficher</p>
            <div className="flex flex-wrap gap-2">
              {masquees.map((id) => (
                <button key={id} onClick={() => reafficherCarte(id)} className="rounded-full border border-line px-3 py-1.5 text-xs text-textMuted hover:border-teal hover:text-teal">
                  + {TITRES_CARTES[id] || id}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : (
          <div className={`grid gap-6 ${modePerso ? "" : "lg:grid-cols-[1fr_380px]"}`}>
            <div className="grid grid-cols-6 gap-4">
              {cartesVisibles.map((id, index) =>
                modePerso ? (
                  <CarteEditable
                    key={id} id={id} taille={tailles[id] || "normal"}
                    draggedId={draggedId} dropCibleId={dropCibleId}
                    peutMonter={index > 0} peutDescendre={index < cartesVisibles.length - 1}
                    onDragStart={handleDragStart} onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd} onDrop={handleDrop}
                    onMasquer={masquerCarte} onChangerTaille={changerTaille}
                    onMonter={monter} onDescendre={descendre}
                  >
                    {rendreCarte(id)}
                  </CarteEditable>
                ) : (
                  <div key={id} className={`${SPAN_CLASSE[tailles[id] || "normal"]} rounded-xl border border-line bg-surface p-4`}>
                    {rendreCarte(id)}
                  </div>
                )
              )}
            </div>
            {!modePerso && (
              <div className="h-[calc(100vh-160px)] lg:sticky lg:top-6">
                <ChatAgentPanel compact />
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
