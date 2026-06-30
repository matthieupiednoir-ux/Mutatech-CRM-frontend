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
  // Devis
  brouillon: "#77778A",
  envoye: "#F0B429",
  accepte: "#5fe0c0",
  refuse: "#EF4444",
  // Factures
  envoyee: "#F0B429",
  payee: "#5fe0c0",
  // Prospects
  a_contacter: "#77778A",
  contacte: "#a89eff",
  rdv_planifie: "#F0B429",
  converti: "#5fe0c0",
  perdu: "#EF4444",
  // Tâches
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

function repartir(items: string[]): { statut: string; count: number }[] {
  const map: Record<string, number> = {};
  items.forEach((s) => {
    map[s] = (map[s] || 0) + 1;
  });
  return Object.entries(map)
    .map(([statut, count]) => ({ statut, count }))
    .sort((a, b) => b.count - a.count);
}

// --- Identifiants stables des cartes (pour la personnalisation) ---
const ORDRE_PAR_DEFAUT = [
  "kpi-clients",
  "kpi-ca-signe",
  "kpi-en-attente",
  "kpi-facture",
  "kpi-taches",
  "kpi-prospects",
  "echeances",
  "apercu-devis",
  "apercu-prospects",
  "apercu-factures",
  "apercu-taches",
  "graph-devis",
  "graph-prospects",
  "graph-factures",
  "graph-taches",
];

const TITRES_CARTES: Record<string, string> = {
  "kpi-clients": "KPI · Clients",
  "kpi-ca-signe": "KPI · CA signé",
  "kpi-en-attente": "KPI · En attente signature",
  "kpi-facture": "KPI · Facturé",
  "kpi-taches": "KPI · Tâches accomplies",
  "kpi-prospects": "KPI · Prospects actifs",
  echeances: "Échéances & Relances",
  "apercu-devis": "Aperçu · Devis",
  "apercu-prospects": "Aperçu · Prospects",
  "apercu-factures": "Aperçu · Factures",
  "apercu-taches": "Aperçu · Tâches",
  "graph-devis": "Graphique · Devis par statut",
  "graph-prospects": "Graphique · Prospects par statut",
  "graph-factures": "Graphique · Factures par statut",
  "graph-taches": "Graphique · Tâches par statut",
};

const STORAGE_KEY = "mutatech-dashboard-cartes-v1";

function chargerConfig(): { ordre: string[]; masquees: string[] } {
  if (typeof window === "undefined") return { ordre: ORDRE_PAR_DEFAUT, masquees: [] };
  try {
    const brut = localStorage.getItem(STORAGE_KEY);
    if (!brut) return { ordre: ORDRE_PAR_DEFAUT, masquees: [] };
    const parsed = JSON.parse(brut);
    const ordreComplet = [
      ...parsed.ordre.filter((id: string) => ORDRE_PAR_DEFAUT.includes(id)),
      ...ORDRE_PAR_DEFAUT.filter((id) => !parsed.ordre.includes(id)),
    ];
    return { ordre: ordreComplet, masquees: parsed.masquees || [] };
  } catch {
    return { ordre: ORDRE_PAR_DEFAUT, masquees: [] };
  }
}

function MiniBarChart({
  titre,
  donnees,
}: {
  titre: string;
  donnees: { statut: string; count: number }[];
}) {
  const total = donnees.reduce((s, d) => s + d.count, 0);
  if (total === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface p-4">
        <h3 className="mb-3 font-display text-sm text-textPrimary">{titre}</h3>
        <p className="text-xs text-textMuted">Aucune donnée pour l'instant.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <h3 className="mb-3 font-display text-sm text-textPrimary">{titre}</h3>
      <div className="space-y-2">
        {donnees.map((d) => (
          <div key={d.statut} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] text-textMuted">
              {LABEL[d.statut] || d.statut}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-surfaceAlt">
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${Math.max((d.count / total) * 100, 4)}%`,
                  background: COULEUR_BARRE[d.statut] || "#77778A",
                }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-[11px] text-textMuted">
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  valeur,
  sousLabel,
  couleur = "text-textPrimary",
}: {
  label: string;
  valeur: string;
  sousLabel?: string;
  couleur?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[11px] uppercase tracking-wide text-textMuted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${couleur}`}>{valeur}</p>
      {sousLabel && <p className="mt-0.5 text-[11px] text-textMuted">{sousLabel}</p>}
    </div>
  );
}

function AperculCard({
  titre,
  lien,
  items,
  modePerso,
}: {
  titre: string;
  lien: string;
  items: { texte: string; sousTexte?: string; couleur?: string }[];
  modePerso: boolean;
}) {
  const contenu = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm text-textPrimary">{titre}</h3>
        {!modePerso && <span className="text-xs text-violet">Voir tout →</span>}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-textMuted">Rien pour l'instant.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-surfaceAlt px-2.5 py-1.5"
            >
              <span className="truncate text-xs text-textPrimary">{it.texte}</span>
              {it.sousTexte && (
                <span
                  className="ml-2 shrink-0 text-[11px]"
                  style={{ color: it.couleur || "#77778A" }}
                >
                  {it.sousTexte}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  if (modePerso) {
    return <div className="rounded-xl border border-line bg-surface p-4">{contenu}</div>;
  }
  return (
    <Link
      href={lien}
      className="block rounded-xl border border-line bg-surface p-4 transition hover:border-violet/50"
    >
      {contenu}
    </Link>
  );
}

// --- Widget Échéances & Relances ---
function EcheancesCard({ modePerso }: { modePerso: boolean }) {
  const [recap, setRecap] = useState<RecapEcheances | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  function charger() {
    getEcheances()
      .then(setRecap)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  async function handleRelancer(factureId: string) {
    setActionEnCours(factureId);
    try {
      await relancerFacture(factureId);
      charger();
    } catch {
      // erreur affichée nulle part ici, volontairement discret sur le dashboard
    } finally {
      setActionEnCours(null);
    }
  }

  async function handleGenererMois(devisId: string) {
    setActionEnCours(devisId);
    try {
      await genererFactureMois(devisId);
      charger();
    } catch {
      // idem
    } finally {
      setActionEnCours(null);
    }
  }

  const total =
    (recap?.en_retard.length || 0) +
    (recap?.a_venir.length || 0) +
    (recap?.abonnements_a_facturer.length || 0);

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:col-span-2">
      <h3 className="mb-3 font-display text-sm text-textPrimary">Échéances &amp; Relances</h3>
      {loading ? (
        <p className="text-xs text-textMuted">Chargement…</p>
      ) : total === 0 ? (
        <p className="text-xs text-textMuted">Tout est à jour — rien à signaler.</p>
      ) : (
        <div className="space-y-3">
          {recap!.en_retard.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-amber">
                En retard
              </p>
              <div className="space-y-1.5">
                {recap!.en_retard.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg bg-amber/10 px-2.5 py-1.5"
                  >
                    <span className="truncate text-xs text-textPrimary">
                      {f.numero} — {f.client_nom}{" "}
                      <span className="text-textMuted">
                        ({f.jours} j) · {f.montant_ttc.toFixed(0)} €
                      </span>
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

          {recap!.a_venir.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-textMuted">
                À venir (14 jours)
              </p>
              <div className="space-y-1.5">
                {recap!.a_venir.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg bg-surfaceAlt px-2.5 py-1.5"
                  >
                    <span className="truncate text-xs text-textPrimary">
                      {f.numero} — {f.client_nom}
                    </span>
                    <span className="ml-2 shrink-0 text-[11px] text-textMuted">
                      dans {-f.jours} j · {f.montant_ttc.toFixed(0)} €
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recap!.abonnements_a_facturer.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-violet">
                Abonnements à facturer ce mois
              </p>
              <div className="space-y-1.5">
                {recap!.abonnements_a_facturer.map((a) => (
                  <div
                    key={a.devis_id}
                    className="flex items-center justify-between rounded-lg bg-violet/10 px-2.5 py-1.5"
                  >
                    <span className="truncate text-xs text-textPrimary">
                      {a.devis_numero} — {a.client_nom}{" "}
                      <span className="text-textMuted">
                        (mois {a.mois_index}) · {a.montant.toFixed(0)} €
                      </span>
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

function CarteReorganisable({
  id,
  draggedId,
  onDragStart,
  onDragOver,
  onDrop,
  onMasquer,
  children,
}: {
  id: string;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: () => void;
  onMasquer: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(id);
      }}
      onDrop={onDrop}
      className={`relative rounded-xl ring-2 transition ${
        draggedId === id ? "opacity-40 ring-violet" : "ring-transparent"
      }`}
    >
      <div className="pointer-events-none absolute -top-2 left-3 z-10 flex items-center gap-1.5 rounded-full border border-violet/40 bg-ink px-2 py-0.5 text-[10px] text-violet">
        <span className="cursor-grab">⠿</span> Glisser
      </div>
      <button
        onClick={() => onMasquer(id)}
        className="absolute -top-2 right-3 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-amber/40 bg-ink text-[10px] text-amber hover:bg-amber/10"
        title="Masquer cette carte"
      >
        ✕
      </button>
      {children}
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
  const [modePerso, setModePerso] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [survolId, setSurvolId] = useState<string | null>(null);

  useEffect(() => {
    const config = chargerConfig();
    setOrdre(config.ordre);
    setMasquees(config.masquees);
  }, []);

  function sauvegarder(nouvelOrdre: string[], nouvellesMasquees: string[]) {
    setOrdre(nouvelOrdre);
    setMasquees(nouvellesMasquees);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ordre: nouvelOrdre, masquees: nouvellesMasquees })
    );
  }

  function handleDrop() {
    if (!draggedId || !survolId || draggedId === survolId) {
      setDraggedId(null);
      setSurvolId(null);
      return;
    }
    const nouvelOrdre = [...ordre];
    const depuis = nouvelOrdre.indexOf(draggedId);
    const vers = nouvelOrdre.indexOf(survolId);
    nouvelOrdre.splice(depuis, 1);
    nouvelOrdre.splice(vers, 0, draggedId);
    sauvegarder(nouvelOrdre, masquees);
    setDraggedId(null);
    setSurvolId(null);
  }

  function masquerCarte(id: string) {
    sauvegarder(ordre, [...masquees, id]);
  }

  function reafficherCarte(id: string) {
    sauvegarder(ordre, masquees.filter((m) => m !== id));
  }

  function reinitialiser() {
    sauvegarder(ORDRE_PAR_DEFAUT, []);
  }

  useEffect(() => {
    Promise.all([
      getClients(),
      getDevisListe(),
      getFacturesListe(),
      getTaches(),
      getProspects(),
    ])
      .then(([c, d, f, t, p]) => {
        setClients(c);
        setDevis(d);
        setFactures(f);
        setTaches(t);
        setProspects(p);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Erreur de chargement")
      )
      .finally(() => setLoading(false));
  }, []);

  const caSigne = devis
    .filter((d) => d.statut === "accepte")
    .reduce((s, d) => s + calculerTotaux(d.lignes, d.taux_tva).totalHt, 0);
  const caEnAttente = devis
    .filter((d) => d.statut === "envoye")
    .reduce((s, d) => s + calculerTotaux(d.lignes, d.taux_tva).totalHt, 0);
  const caFacture = factures
    .filter((f) => f.statut !== "brouillon")
    .reduce((s, f) => s + calculerTotaux(f.lignes, f.taux_tva).totalHt, 0);

  const tachesDone = taches.filter((t) => t.statut === "done").length;
  const pctTaches = taches.length > 0 ? Math.round((tachesDone / taches.length) * 100) : 0;

  const prospectsActifs = prospects.filter(
    (p) => p.statut !== "converti" && p.statut !== "perdu"
  ).length;
  const convertis = prospects.filter((p) => p.statut === "converti").length;
  const tauxConversion =
    prospects.length > 0 ? Math.round((convertis / prospects.length) * 100) : 0;

  const apercuDevis = devis.slice(0, 3).map((d) => ({
    texte: `${d.numero} — ${d.client?.nom || "—"}`,
    sousTexte: LABEL[d.statut] || d.statut,
    couleur: COULEUR_BARRE[d.statut],
  }));
  const apercuFactures = factures.slice(0, 3).map((f) => ({
    texte: `${f.numero} — ${f.client?.nom || "—"}`,
    sousTexte: LABEL[f.statut] || f.statut,
    couleur: COULEUR_BARRE[f.statut],
  }));
  const apercuProspects = prospects.slice(0, 3).map((p) => ({
    texte: p.nom,
    sousTexte: LABEL[p.statut] || p.statut,
    couleur: COULEUR_BARRE[p.statut],
  }));
  const apercuTaches = taches.slice(0, 3).map((t) => ({
    texte: t.titre,
    sousTexte: LABEL[t.statut] || t.statut,
    couleur: COULEUR_BARRE[t.statut],
  }));

  function rendreCarte(id: string): React.ReactNode {
    switch (id) {
      case "kpi-clients":
        return <KpiCard label="Clients" valeur={String(clients.length)} />;
      case "kpi-ca-signe":
        return (
          <KpiCard label="CA signé (devis)" valeur={`${caSigne.toFixed(0)} €`} couleur="text-teal" />
        );
      case "kpi-en-attente":
        return (
          <KpiCard
            label="En attente signature"
            valeur={`${caEnAttente.toFixed(0)} €`}
            couleur="text-amber"
          />
        );
      case "kpi-facture":
        return <KpiCard label="Facturé" valeur={`${caFacture.toFixed(0)} €`} couleur="text-violet" />;
      case "kpi-taches":
        return (
          <KpiCard
            label="Tâches accomplies"
            valeur={`${pctTaches}%`}
            sousLabel={`${tachesDone}/${taches.length}`}
          />
        );
      case "kpi-prospects":
        return (
          <KpiCard
            label="Prospects actifs"
            valeur={String(prospectsActifs)}
            sousLabel={`${tauxConversion}% de conversion`}
          />
        );
      case "echeances":
        return <EcheancesCard modePerso={modePerso} />;
      case "apercu-devis":
        return <AperculCard titre="Devis" lien="/devis" items={apercuDevis} modePerso={modePerso} />;
      case "apercu-prospects":
        return (
          <AperculCard titre="Prospects" lien="/prospects" items={apercuProspects} modePerso={modePerso} />
        );
      case "apercu-factures":
        return (
          <AperculCard titre="Factures" lien="/factures" items={apercuFactures} modePerso={modePerso} />
        );
      case "apercu-taches":
        return <AperculCard titre="Tâches" lien="/taches" items={apercuTaches} modePerso={modePerso} />;
      case "graph-devis":
        return <MiniBarChart titre="Devis par statut" donnees={repartir(devis.map((d) => d.statut))} />;
      case "graph-prospects":
        return (
          <MiniBarChart
            titre="Prospects par statut"
            donnees={repartir(prospects.map((p) => p.statut))}
          />
        );
      case "graph-factures":
        return (
          <MiniBarChart titre="Factures par statut" donnees={repartir(factures.map((f) => f.statut))} />
        );
      case "graph-taches":
        return <MiniBarChart titre="Tâches par statut" donnees={repartir(taches.map((t) => t.statut))} />;
      default:
        return null;
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
              <span className="text-xs text-textMuted">
                {masquees.length} carte(s) masquée(s)
              </span>
            )}
            {modePerso && (
              <button
                onClick={reinitialiser}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary"
              >
                Réinitialiser
              </button>
            )}
            <button
              onClick={() => setModePerso((v) => !v)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
                modePerso
                  ? "bg-violet text-white hover:bg-violet/90"
                  : "border border-line text-textMuted hover:text-textPrimary"
              }`}
            >
              {modePerso ? "✓ Terminer" : "⚙ Personnaliser"}
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        {modePerso && masquees.length > 0 && (
          <div className="mb-6 rounded-xl border border-dashed border-line bg-surface/50 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-textMuted">
              Cartes masquées — clique pour réafficher
            </p>
            <div className="flex flex-wrap gap-2">
              {masquees.map((id) => (
                <button
                  key={id}
                  onClick={() => reafficherCarte(id)}
                  className="rounded-full border border-line px-3 py-1.5 text-xs text-textMuted hover:border-teal hover:text-teal"
                >
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
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cartesVisibles
                  .filter((id) => id.startsWith("kpi-"))
                  .map((id) =>
                    modePerso ? (
                      <CarteReorganisable
                        key={id}
                        id={id}
                        draggedId={draggedId}
                        onDragStart={setDraggedId}
                        onDragOver={setSurvolId}
                        onDrop={handleDrop}
                        onMasquer={masquerCarte}
                      >
                        {rendreCarte(id)}
                      </CarteReorganisable>
                    ) : (
                      <div key={id}>{rendreCarte(id)}</div>
                    )
                  )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {cartesVisibles
                  .filter((id) => id === "echeances")
                  .map((id) =>
                    modePerso ? (
                      <CarteReorganisable
                        key={id}
                        id={id}
                        draggedId={draggedId}
                        onDragStart={setDraggedId}
                        onDragOver={setSurvolId}
                        onDrop={handleDrop}
                        onMasquer={masquerCarte}
                      >
                        {rendreCarte(id)}
                      </CarteReorganisable>
                    ) : (
                      <div key={id}>{rendreCarte(id)}</div>
                    )
                  )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {cartesVisibles
                  .filter((id) => id.startsWith("apercu-"))
                  .map((id) =>
                    modePerso ? (
                      <CarteReorganisable
                        key={id}
                        id={id}
                        draggedId={draggedId}
                        onDragStart={setDraggedId}
                        onDragOver={setSurvolId}
                        onDrop={handleDrop}
                        onMasquer={masquerCarte}
                      >
                        {rendreCarte(id)}
                      </CarteReorganisable>
                    ) : (
                      <div key={id}>{rendreCarte(id)}</div>
                    )
                  )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {cartesVisibles
                  .filter((id) => id.startsWith("graph-"))
                  .map((id) =>
                    modePerso ? (
                      <CarteReorganisable
                        key={id}
                        id={id}
                        draggedId={draggedId}
                        onDragStart={setDraggedId}
                        onDragOver={setSurvolId}
                        onDrop={handleDrop}
                        onMasquer={masquerCarte}
                      >
                        {rendreCarte(id)}
                      </CarteReorganisable>
                    ) : (
                      <div key={id}>{rendreCarte(id)}</div>
                    )
                  )}
              </div>
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
