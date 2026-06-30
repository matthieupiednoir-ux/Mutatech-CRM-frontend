"use client";

import { useEffect, useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import { getFacturesListe, getDepenses, calculerTotaux, ApiError } from "@/lib/api";
import { Facture, Depense } from "@/lib/types";

const MOIS_LABEL = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Découpe une dépense récurrente en mensualités (une par mois) sur sa
// période d'activité, bornée à l'année demandée — pour pouvoir l'agréger
// au même titre qu'une dépense ponctuelle dans le détail mensuel.
function mensualitesRecurrentes(depense: Depense, annee: number): { date: Date; montant: number }[] {
  if (depense.type !== "recurrente" || !depense.date_debut) return [];
  const debut = new Date(depense.date_debut);
  const fin = depense.date_fin ? new Date(depense.date_fin) : new Date(annee, 11, 31);
  const borneBasse = new Date(Math.max(debut.getTime(), new Date(annee, 0, 1).getTime()));
  const borneHaute = new Date(Math.min(fin.getTime(), new Date(annee, 11, 31).getTime()));
  if (borneBasse > borneHaute) return [];

  const resultat: { date: Date; montant: number }[] = [];
  if (depense.frequence === "annuelle") {
    // Une seule occurrence dans l'année si la date de début (jour/mois) tombe dans la période.
    const occurrence = new Date(annee, debut.getMonth(), 1);
    if (occurrence >= borneBasse && occurrence <= borneHaute) {
      resultat.push({ date: occurrence, montant: depense.montant });
    }
    return resultat;
  }
  // Mensuelle (par défaut) : une occurrence par mois entre les bornes.
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
        setFactures(f);
        setDepenses(d);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  const anneesDisponibles = useMemo(() => {
    const annees = new Set<number>([new Date().getFullYear()]);
    factures.forEach((f) => {
      if (f.payee_le) annees.add(new Date(f.payee_le).getFullYear());
    });
    depenses.forEach((d) => {
      if (d.date_depense) annees.add(new Date(d.date_depense).getFullYear());
      if (d.date_debut) {
        const debut = new Date(d.date_debut).getFullYear();
        const fin = d.date_fin ? new Date(d.date_fin).getFullYear() : new Date().getFullYear();
        for (let a = debut; a <= fin; a++) annees.add(a);
      }
    });
    return Array.from(annees).sort((a, b) => b - a);
  }, [factures, depenses]);

  // --- Recettes : factures réellement encaissées, sur l'année sélectionnée ---
  const recettes = useMemo(() => {
    return factures
      .filter((f) => f.payee_le && new Date(f.payee_le).getFullYear() === annee)
      .map((f) => {
        const { totalHt, totalTva, totalTtc } = calculerTotaux(f.lignes, f.taux_tva);
        return { facture: f, totalHt, totalTva, totalTtc, date: new Date(f.payee_le!) };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [factures, annee]);

  // --- Dépenses : ponctuelles de l'année + mensualités des récurrentes ---
  const sortiesDepenses = useMemo(() => {
    const sorties: { libelle: string; categorie: string | null; montant: number; date: Date; type: string }[] = [];
    depenses.forEach((d) => {
      if (d.type === "ponctuelle") {
        if (d.date_depense && new Date(d.date_depense).getFullYear() === annee) {
          sorties.push({
            libelle: d.libelle,
            categorie: d.categorie || null,
            montant: d.montant,
            date: new Date(d.date_depense),
            type: "Ponctuelle",
          });
        }
      } else {
        mensualitesRecurrentes(d, annee).forEach((m) => {
          sorties.push({
            libelle: d.libelle,
            categorie: d.categorie || null,
            montant: m.montant,
            date: m.date,
            type: d.frequence === "annuelle" ? "Récurrente (annuelle)" : "Récurrente (mensuelle)",
          });
        });
      }
    });
    return sorties.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [depenses, annee]);

  const totalRecettesTtc = recettes.reduce((s, r) => s + r.totalTtc, 0);
  const totalRecettesHt = recettes.reduce((s, r) => s + r.totalHt, 0);
  const totalDepenses = sortiesDepenses.reduce((s, d) => s + d.montant, 0);
  const solde = totalRecettesTtc - totalDepenses;

  const parMois = useMemo(() => {
    const tableau = Array.from({ length: 12 }, (_, i) => ({
      mois: i,
      nbRecettes: 0,
      totalRecettesHt: 0,
      totalRecettesTtc: 0,
      totalDepenses: 0,
    }));
    recettes.forEach((r) => {
      const m = r.date.getMonth();
      tableau[m].nbRecettes += 1;
      tableau[m].totalRecettesHt += r.totalHt;
      tableau[m].totalRecettesTtc += r.totalTtc;
    });
    sortiesDepenses.forEach((d) => {
      const m = d.date.getMonth();
      tableau[m].totalDepenses += d.montant;
    });
    return tableau;
  }, [recettes, sortiesDepenses]);

  const parTrimestre = useMemo(() => {
    const t = [0, 1, 2, 3].map((i) => ({
      trimestre: i + 1,
      totalRecettesHt: 0,
      totalRecettesTtc: 0,
      totalDepenses: 0,
    }));
    parMois.forEach((m, i) => {
      const q = Math.floor(i / 3);
      t[q].totalRecettesHt += m.totalRecettesHt;
      t[q].totalRecettesTtc += m.totalRecettesTtc;
      t[q].totalDepenses += m.totalDepenses;
    });
    return t;
  }, [parMois]);

  // Impayés / en attente (toutes années) — vue complémentaire, hors bilan annuel
  const impayees = factures.filter((f) => f.statut === "envoyee");
  const totalImpaye = impayees.reduce(
    (s, f) => s + calculerTotaux(f.lignes, f.taux_tva).totalTtc,
    0
  );

  function imprimer() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          nav, header, .no-print { display: none !important; }
          body { background: #fff !important; color: #000 !important; }
          .print-doc { color: #000 !important; background: #fff !important; }
          .print-doc * { color: #000 !important; border-color: #ccc !important; background: #fff !important; }
          .print-doc table { border-collapse: collapse; width: 100%; }
          .print-doc th, .print-doc td { border: 1px solid #ccc; padding: 6px 8px; }
        }
      `}</style>

      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <h1 className="font-display text-2xl text-textPrimary">Comptabilité</h1>
          <div className="flex items-center gap-2">
            <select
              value={annee}
              onChange={(e) => setAnnee(parseInt(e.target.value))}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary"
            >
              {anneesDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <button
              onClick={imprimer}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
            >
              🖨️ Imprimer / Exporter PDF
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber no-print">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-textMuted no-print">Chargement…</p>
        ) : (
          <div className="print-doc space-y-8">
            {/* En-tête imprimable */}
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-teal">
                Mutatech — Matthieu Piednoir (EI)
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-textPrimary">
                Bilan recettes / dépenses — Année {annee}
              </h2>
              <p className="mt-1 text-xs text-textMuted">
                SIRET 106 418 619 00016 · Régime micro-BNC · TVA non applicable, art. 293 B du CGI
              </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 no-print">
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wide text-textMuted">
                  Recettes {annee}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-teal">
                  {totalRecettesTtc.toFixed(2)} €
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wide text-textMuted">
                  Dépenses {annee}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-amber">
                  {totalDepenses.toFixed(2)} €
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wide text-textMuted">
                  Solde {annee}
                </p>
                <p
                  className={`mt-1 font-display text-2xl font-bold ${
                    solde >= 0 ? "text-teal" : "text-amber"
                  }`}
                >
                  {solde >= 0 ? "+" : ""}
                  {solde.toFixed(2)} €
                </p>
              </div>
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className="text-[11px] uppercase tracking-wide text-textMuted">
                  En attente de paiement
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-violet">
                  {totalImpaye.toFixed(2)} €
                </p>
                <p className="mt-0.5 text-[11px] text-textMuted">
                  {impayees.length} facture(s), toutes années
                </p>
              </div>
            </div>

            {/* Bilan visible aussi à l'impression */}
            <div className="hidden print:block">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-line/50">
                    <td className="py-2">Total recettes encaissées</td>
                    <td className="py-2 text-right font-medium">{totalRecettesTtc.toFixed(2)} €</td>
                  </tr>
                  <tr className="border-b border-line/50">
                    <td className="py-2">Total dépenses</td>
                    <td className="py-2 text-right font-medium">{totalDepenses.toFixed(2)} €</td>
                  </tr>
                  <tr className="border-t-2 border-line font-display font-bold">
                    <td className="py-2">Solde</td>
                    <td className="py-2 text-right">
                      {solde >= 0 ? "+" : ""}
                      {solde.toFixed(2)} €
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Répartition trimestrielle */}
            <div>
              <h3 className="mb-2 font-display text-sm text-textPrimary">
                Répartition trimestrielle (déclarations URSSAF)
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-textMuted">
                    <th className="py-2">Trimestre</th>
                    <th className="py-2 text-right">Recettes HT</th>
                    <th className="py-2 text-right">Recettes TTC</th>
                    <th className="py-2 text-right">Dépenses</th>
                    <th className="py-2 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {parTrimestre.map((t) => (
                    <tr key={t.trimestre} className="border-b border-line/50">
                      <td className="py-2 text-textPrimary">T{t.trimestre}</td>
                      <td className="py-2 text-right text-textMuted">
                        {t.totalRecettesHt.toFixed(2)} €
                      </td>
                      <td className="py-2 text-right text-teal">
                        {t.totalRecettesTtc.toFixed(2)} €
                      </td>
                      <td className="py-2 text-right text-amber">
                        {t.totalDepenses.toFixed(2)} €
                      </td>
                      <td className="py-2 text-right font-medium text-textPrimary">
                        {(t.totalRecettesTtc - t.totalDepenses).toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Répartition mensuelle */}
            <div>
              <h3 className="mb-2 font-display text-sm text-textPrimary">
                Répartition mensuelle
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-textMuted">
                    <th className="py-2">Mois</th>
                    <th className="py-2 text-right">Nb factures</th>
                    <th className="py-2 text-right">Recettes TTC</th>
                    <th className="py-2 text-right">Dépenses</th>
                    <th className="py-2 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {parMois
                    .filter((m) => m.nbRecettes > 0 || m.totalDepenses > 0)
                    .map((m) => (
                      <tr key={m.mois} className="border-b border-line/50">
                        <td className="py-2 text-textPrimary">{MOIS_LABEL[m.mois]}</td>
                        <td className="py-2 text-right text-textMuted">{m.nbRecettes}</td>
                        <td className="py-2 text-right text-teal">
                          {m.totalRecettesTtc.toFixed(2)} €
                        </td>
                        <td className="py-2 text-right text-amber">
                          {m.totalDepenses.toFixed(2)} €
                        </td>
                        <td className="py-2 text-right font-medium text-textPrimary">
                          {(m.totalRecettesTtc - m.totalDepenses).toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  {recettes.length === 0 && sortiesDepenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-textMuted">
                        Aucune recette ni dépense enregistrée pour {annee}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Livre des recettes détaillé */}
            <div>
              <h3 className="mb-2 font-display text-sm text-textPrimary">
                Détail chronologique — Recettes
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-textMuted">
                    <th className="py-2">Date encaissement</th>
                    <th className="py-2">N° facture</th>
                    <th className="py-2">Client</th>
                    <th className="py-2 text-right">HT</th>
                    <th className="py-2 text-right">TVA</th>
                    <th className="py-2 text-right">TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {recettes.map((r) => (
                    <tr key={r.facture.id} className="border-b border-line/50">
                      <td className="py-2 text-textMuted">
                        {r.date.toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 text-textPrimary">{r.facture.numero}</td>
                      <td className="py-2 text-textPrimary">
                        {r.facture.client?.nom || "—"}
                      </td>
                      <td className="py-2 text-right text-textMuted">
                        {r.totalHt.toFixed(2)} €
                      </td>
                      <td className="py-2 text-right text-textMuted">
                        {r.totalTva.toFixed(2)} €
                      </td>
                      <td className="py-2 text-right font-medium text-textPrimary">
                        {r.totalTtc.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                  {recettes.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-textMuted">
                        Aucune recette encaissée pour {annee}.
                      </td>
                    </tr>
                  )}
                </tbody>
                {recettes.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-line font-display font-bold">
                      <td colSpan={3} className="py-2 text-textPrimary">
                        Total {annee}
                      </td>
                      <td className="py-2 text-right text-textPrimary">
                        {totalRecettesHt.toFixed(2)} €
                      </td>
                      <td></td>
                      <td className="py-2 text-right text-teal">
                        {totalRecettesTtc.toFixed(2)} €
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Détail des dépenses */}
            <div>
              <h3 className="mb-2 font-display text-sm text-textPrimary">
                Détail chronologique — Dépenses
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-textMuted">
                    <th className="py-2">Date</th>
                    <th className="py-2">Libellé</th>
                    <th className="py-2">Catégorie</th>
                    <th className="py-2">Type</th>
                    <th className="py-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {sortiesDepenses.map((d, i) => (
                    <tr key={i} className="border-b border-line/50">
                      <td className="py-2 text-textMuted">
                        {d.date.toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 text-textPrimary">{d.libelle}</td>
                      <td className="py-2 text-textMuted">{d.categorie || "—"}</td>
                      <td className="py-2 text-textMuted">{d.type}</td>
                      <td className="py-2 text-right font-medium text-amber">
                        {d.montant.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                  {sortiesDepenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-textMuted">
                        Aucune dépense pour {annee}.
                      </td>
                    </tr>
                  )}
                </tbody>
                {sortiesDepenses.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-line font-display font-bold">
                      <td colSpan={4} className="py-2 text-textPrimary">
                        Total {annee}
                      </td>
                      <td className="py-2 text-right text-amber">
                        {totalDepenses.toFixed(2)} €
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <p className="text-[11px] text-textMuted no-print">
              Les recettes proviennent uniquement des factures marquées "payée" (avec leur date
              d'encaissement réelle, page Factures). Les dépenses récurrentes sont automatiquement
              réparties en mensualités sur leur période d'activité. Document utile pour tes
              déclarations URSSAF et pour ton expert-comptable.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
