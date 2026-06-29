"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import ChatAgentPanel from "@/components/ChatAgentPanel";
import {
  getClients,
  getDevisListe,
  getFacturesListe,
  getTaches,
  getProspects,
  calculerTotaux,
  ApiError,
} from "@/lib/api";
import { Client, Devis, Facture, Tache, Prospect } from "@/lib/types";

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

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 font-display text-2xl text-textPrimary">Tableau de bord</h1>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Colonne principale : KPIs + graphiques */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <KpiCard label="Clients" valeur={String(clients.length)} />
                <KpiCard
                  label="CA signé (devis)"
                  valeur={`${caSigne.toFixed(0)} €`}
                  couleur="text-teal"
                />
                <KpiCard
                  label="En attente signature"
                  valeur={`${caEnAttente.toFixed(0)} €`}
                  couleur="text-amber"
                />
                <KpiCard
                  label="Facturé"
                  valeur={`${caFacture.toFixed(0)} €`}
                  couleur="text-violet"
                />
                <KpiCard
                  label="Tâches accomplies"
                  valeur={`${pctTaches}%`}
                  sousLabel={`${tachesDone}/${taches.length}`}
                />
                <KpiCard
                  label="Prospects actifs"
                  valeur={String(prospectsActifs)}
                  sousLabel={`${tauxConversion}% de conversion`}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MiniBarChart titre="Devis par statut" donnees={repartir(devis.map((d) => d.statut))} />
                <MiniBarChart
                  titre="Prospects par statut"
                  donnees={repartir(prospects.map((p) => p.statut))}
                />
                <MiniBarChart
                  titre="Factures par statut"
                  donnees={repartir(factures.map((f) => f.statut))}
                />
                <MiniBarChart titre="Tâches par statut" donnees={repartir(taches.map((t) => t.statut))} />
              </div>
            </div>

            {/* Colonne latérale : Agent IA */}
            <div className="h-[calc(100vh-160px)] lg:sticky lg:top-6">
              <ChatAgentPanel compact />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
