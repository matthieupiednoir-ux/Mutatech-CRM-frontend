"use client";

import { useEffect, useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import { getFacturesListe, getDepenses, calculerTotaux, ApiError } from "@/lib/api";
import { Facture, Depense } from "@/lib/types";

const MOIS_LABEL = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function mensualitesRecurrentes(depense: Depense, annee: number): { date: Date; montant: number }[] {
  if (depense.type !== "recurrente" || !depense.date_debut) return [];
  const debut = new Date(depense.date_debut);
  const fin = depense.date_fin ? new Date(depense.date_fin) : new Date(annee, 11, 31);
  const borneBasse = new Date(Math.max(debut.getTime(), new Date(annee, 0, 1).getTime()));
  const borneHaute = new Date(Math.min(fin.getTime(), new Date(annee, 11, 31).getTime()));
  if (borneBasse > borneHaute) return [];

  const resultat: { date: Date; montant: number }[] = [];
  if (depense.frequence === "annuelle") {
    const occurrence = new Date(annee, debut.getMonth(), 1);
    if (occurrence >= borneBasse && occurrence <= borneHaute) {
      resultat.push({ date: occurrence, montant: depense.montant });
    }
    return resultat;
  }
  const curseur = new Date(borneBasse.getFullYear(), borneBasse.getMonth(), 1);
  while (curseur <= borneHaute) {
    resultat.push({ date: new Date(curseur), montant: depense.montant });
    curseur.setMonth(curseur.getMonth() + 1);
  }
  return resultat;
}

export default function ComptabilitePage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annee, setAnnee] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([getFacturesListe(), getDepenses()])
      .then(([f, d]) => {
        setFactures(safeArr<Facture>(f));
        setDepenses(safeArr<Depense>(d));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const safeFactures = safeArr<Facture>(factures);
  const safeDepenses = safeArr<Depense>(depenses);

  const anneesDisponibles = useMemo(() => {
    const annees = new Set<number>([new Date().getFullYear()]);
    safeFactures.forEach((f) => {
      if (f.payee_le) annees.add(new Date(f.payee_le).getFullYear());
    });
    safeDepenses.forEach((d) => {
      if (d.date_depense) annees.add(new Date(d.date_depense).getFullYear());
      if (d.date_debut) {
        const debut = new Date(d.date_debut).getFullYear();
        const fin = d.date_fin ? new Date(d.date_fin).getFullYear() : new Date().getFullYear();
        for (let a = debut; a <= fin; a++) annees.add(a);
      }
    });
    return Array.from(annees).sort((a, b) => b - a);
  }, [safeFactures, safeDepenses]);

  const recettes = useMemo(() => {
    return safeFactures
      .filter((f) => f.payee_le && new Date(f.payee_le).getFullYear() === annee)
      .map((f) => {
        try {
          const { totalHt, totalTva, totalTtc } = calculerTotaux(f.lignes, f.taux_tva);
          return { facture: f, totalHt: totalHt ?? 0, totalTva: totalTva ?? 0, totalTtc: totalTtc ?? 0, date: new Date(f.payee_le!) };
        } catch {
          return { facture: f, totalHt: 0, totalTva: 0, totalTtc: 0, date: new Date(f.payee_le!) };
        }
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [safeFactures, annee]);

  const sortiesDepenses = useMemo(() => {
    const sorties: { libelle: string; categorie: string | null; montant: number; date: Date; type: string }[] = [];
    safeDepenses.forEach((d) => {
      if (d.type === "ponctuelle") {
        if (d.date_depense && new Date(d.date_depense).getFullYear() === annee) {
          sorties.push({
            libelle: d.libelle,
            categorie: d.categorie || null,
            montant: d.montant ?? 0,
            date: new Date(d.date_depense),
            type: "Ponctuelle",
          });
        }
      } else {
        mensualitesRecurrentes(d, annee).forEach((m) => {
          sorties.push({
            libelle: d.libelle,
            categorie: d.categorie || null,
            montant: m.montant ?? 0,
            date: m.date,
            type: d.frequence === "annuelle" ? "Récurrente (annuelle)" : "Récurrente (mensuelle)",
          });
        });
      }
    });
    return sorties.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [safeDepenses, annee]);

  // Tous les reduce sur des tableaux garantis (useMemo retourne toujours un tableau)
  const totalRecettesTtc = useMemo(() => recettes.reduce((s, r) => s + (r.totalTtc ?? 0), 0), [recettes]);
  const totalRecettesHt = useMemo(() => recettes.reduce((s, r) => s + (r.totalHt ?? 0), 0), [recettes]);
  const totalDepenses = useMemo(() => sortiesDepenses.reduce((s, d) => s + (d.montant ?? 0), 0), [sortiesDepenses]);
  const solde = totalRecettesTtc - totalDepenses;

  // Données par mois pour le tableau
  const parMois = useMemo(() => {
    return Array.from({ length: 12 }, (_, mois) => {
      const recettesMois = recettes.filter((r) => r.date.getMonth() === mois);
      const depensesMois = sortiesDepenses.filter((d) => d.date.getMonth() === mois);
      const totalR = recettesMois.reduce((s, r) => s + (r.totalTtc ?? 0), 0);
      const totalD = depensesMois.reduce((s, d) => s + (d.montant ?? 0), 0);
      return { mois, totalR, totalD, solde: totalR - totalD, nbR: recettesMois.length, nbD: depensesMois.length };
    });
  }, [recettes, sortiesDepenses]);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Comptabilité</h1>
            <p className="mt-0.5 text-sm text-textMuted">Recettes encaissées vs dépenses réelles</p>
          </div>
          <select
            value={annee}
            onChange={(e) => setAnnee(parseInt(e.target.value))}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary"
          >
            {anneesDisponibles.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {/* KPIs */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Recettes TTC</p>
            <p className="mt-1 font-display text-2xl font-bold text-teal">{totalRecettesTtc.toFixed(0)} €</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Recettes HT</p>
            <p className="mt-1 font-display text-2xl font-bold text-textPrimary">{totalRecettesHt.toFixed(0)} €</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Dépenses</p>
            <p className="mt-1 font-display text-2xl font-bold text-amber">{totalDepenses.toFixed(0)} €</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-textMuted">Solde net</p>
            <p className={`mt-1 font-display text-2xl font-bold ${solde >= 0 ? "text-teal" : "text-amber"}`}>
              {solde >= 0 ? "+" : ""}{solde.toFixed(0)} €
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : (
          <>
            {/* Tableau par mois */}
            <div className="mb-8 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface">
                    <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wide text-textMuted">Mois</th>
                    <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wide text-textMuted">Recettes TTC</th>
                    <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wide text-textMuted">Dépenses</th>
                    <th className="px-4 py-3 text-right text-[11px] uppercase tracking-wide text-textMuted">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {parMois.map(({ mois, totalR, totalD, solde: soldeMois, nbR, nbD }) => (
                    (nbR > 0 || nbD > 0) ? (
                      <tr key={mois} className="border-b border-line last:border-0 hover:bg-surface">
                        <td className="px-4 py-3 text-textPrimary">{MOIS_LABEL[mois]}</td>
                        <td className="px-4 py-3 text-right text-teal">{totalR > 0 ? `${totalR.toFixed(0)} €` : "—"}</td>
                        <td className="px-4 py-3 text-right text-amber">{totalD > 0 ? `${totalD.toFixed(0)} €` : "—"}</td>
                        <td className={`px-4 py-3 text-right font-medium ${soldeMois >= 0 ? "text-teal" : "text-amber"}`}>
                          {soldeMois >= 0 ? "+" : ""}{soldeMois.toFixed(0)} €
                        </td>
                      </tr>
                    ) : null
                  ))}
                  {parMois.every(m => m.nbR === 0 && m.nbD === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-textMuted">
                        Aucune donnée pour {annee}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Détail recettes */}
            {recettes.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 font-display text-sm font-bold text-textPrimary">Factures encaissées</h2>
                <div className="space-y-2">
                  {recettes.map((r) => (
                    <div key={r.facture.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-textPrimary">{r.facture.numero} — {r.facture.client?.nom || "—"}</p>
                        <p className="text-xs text-textMuted">{r.date.toLocaleDateString("fr-FR")} · {r.facture.objet || "Sans objet"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal">{r.totalTtc.toFixed(2)} € TTC</p>
                        <p className="text-xs text-textMuted">{r.totalHt.toFixed(2)} € HT</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Détail dépenses */}
            {sortiesDepenses.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-sm font-bold text-textPrimary">Dépenses</h2>
                <div className="space-y-2">
                  {sortiesDepenses.map((d, i) => (
                    <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-textPrimary">{d.libelle}</p>
                        <p className="text-xs text-textMuted">{d.date.toLocaleDateString("fr-FR")} · {d.categorie || "—"} · {d.type}</p>
                      </div>
                      <p className="text-sm font-bold text-amber">{d.montant.toFixed(2)} €</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
