"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";

const API_IDEL = process.env.NEXT_PUBLIC_IDEL_API_URL || "";

const MOIS_LABEL = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

interface StatsMois {
  mois: number;
  annee: number;
  nb_traitees: number;
  montant_total: number;
}

interface StatsAnnee {
  annee: number;
  nb_traitees: number;
  montant_total: number;
  par_mois: StatsMois[];
}

interface Facture {
  id: string;
  numero: string;
  patient_nom: string;
  montant: number;
  statut: string;
  date_creation: string;
  date_paiement?: string | null;
}

async function requeteIdel<T>(chemin: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_IDEL}${chemin}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const corps = await res.text();
    throw new ApiError(corps || `Erreur ${res.status}`);
  }
  return res.json();
}

export default function IdelComptabilitePage() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<StatsAnnee | null>(null);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      requeteIdel<StatsAnnee>(`/api/compta/stats?annee=${annee}`),
      requeteIdel<Facture[]>(`/api/compta/factures?annee=${annee}`),
    ])
      .then(([s, f]) => {
        setStats(s);
        setFactures(f);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [annee]);

  const anneesDisponibles = Array.from(
    { length: 3 },
    (_, i) => new Date().getFullYear() - i
  );

  const facturesPayees = factures.filter((f) => f.statut === "payee");
  const facturesEnAttente = factures.filter((f) => f.statut !== "payee" && f.statut !== "rejetee");
  const facturesRejetees = factures.filter((f) => f.statut === "rejetee");

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Trésorerie IDEL</h1>
            <p className="mt-1 text-sm text-textMuted">
              Suivi des actes transmis et des paiements CPAM
            </p>
          </div>
          <select
            value={annee}
            onChange={(e) => setAnnee(parseInt(e.target.value))}
            className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary"
          >
            {anneesDisponibles.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : (
          <div className="space-y-8">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wide text-textMuted">Actes traités</p>
                <p className="mt-1 font-display text-2xl font-bold text-teal">
                  {stats?.nb_traitees ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wide text-textMuted">Montant total</p>
                <p className="mt-1 font-display text-2xl font-bold text-teal">
                  {(stats?.montant_total ?? 0).toFixed(2)} €
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wide text-textMuted">En attente CPAM</p>
                <p className="mt-1 font-display text-2xl font-bold text-amber">
                  {facturesEnAttente.length}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wide text-textMuted">Rejetées NOÉMIE</p>
                <p className="mt-1 font-display text-2xl font-bold text-amber">
                  {facturesRejetees.length}
                </p>
              </div>
            </div>

            {/* Répartition mensuelle */}
            {stats && stats.par_mois.length > 0 && (
              <div>
                <h3 className="mb-3 font-display text-sm text-textPrimary">
                  Répartition mensuelle {annee}
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-textMuted">
                      <th className="py-2">Mois</th>
                      <th className="py-2 text-right">Actes</th>
                      <th className="py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.par_mois.map((m) => (
                      <tr key={m.mois} className="border-b border-line/50">
                        <td className="py-2 text-textPrimary">{MOIS_LABEL[m.mois - 1]}</td>
                        <td className="py-2 text-right text-textMuted">{m.nb_traitees}</td>
                        <td className="py-2 text-right text-teal font-medium">
                          {m.montant_total.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Détail des factures */}
            {factures.length > 0 && (
              <div>
                <h3 className="mb-3 font-display text-sm text-textPrimary">
                  Détail des actes facturés
                </h3>
                <div className="space-y-2">
                  {factures.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-textPrimary">
                          {f.patient_nom}
                          <span className={`ml-2 rounded px-2 py-0.5 text-[10px] font-medium ${
                            f.statut === "payee"
                              ? "bg-teal/10 text-teal"
                              : f.statut === "rejetee"
                              ? "bg-amber/10 text-amber"
                              : "bg-violet/10 text-violet"
                          }`}>
                            {f.statut === "payee" ? "Payée" : f.statut === "rejetee" ? "Rejetée" : "En attente"}
                          </span>
                        </p>
                        <p className="text-xs text-textMuted">
                          {new Date(f.date_creation).toLocaleDateString("fr-FR")}
                          {f.date_paiement && ` · Payée le ${new Date(f.date_paiement).toLocaleDateString("fr-FR")}`}
                        </p>
                      </div>
                      <span className="font-display text-sm font-bold text-teal">
                        {f.montant.toFixed(2)} €
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {factures.length === 0 && (
              <p className="text-sm text-textMuted">
                Aucun acte facturé pour {annee} — les actes apparaissent ici une fois passés en "Traité" dans le pipeline.
              </p>
            )}

            <p className="text-[11px] text-textMuted">
              Les montants affichés correspondent aux cotations NGAP validées.
              Les paiements CPAM réels peuvent différer selon les rejets NOÉMIE.
              Ce tableau de bord ne se substitue pas à votre logiciel de comptabilité officiel.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
