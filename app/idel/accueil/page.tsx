"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import InsightStrip from "@/components/InsightStrip";
import KpiTuile from "@/components/KpiTuile";
import { idelAccueil, idelInsights, IdelAccueil, IdelPerimetreAccueil, ApiError } from "@/lib/api";

// Page d'accueil IDEL : recapitulatif simple de la journee et de
// l'activite, sur le modele du tableau de bord CRM. Une seule requete
// (/api/accueil) ; les patients n'y apparaissent qu'en initiales et rien
// n'est garde dans le navigateur (pas de localStorage, reponse no-store).

const PRESTATION: Record<string, string> = {
  pansement: "Pansement", injection: "Injection", prelevement: "Prélèvement", toilette: "Toilette",
  surveillance: "Surveillance", soins_infirmiers: "Soins infirmiers", perfusion: "Perfusion",
  oxygenotherapie: "Oxygénothérapie", nutrition_enterale: "Nutrition entérale", vni: "VNI",
  aerosolotherapie: "Aérosolthérapie", autre: "Autre",
};
const STATUT_VISITE: Record<string, { label: string; couleur: string }> = {
  planned: { label: "Prévue", couleur: "var(--st-neutre)" },
  in_progress: { label: "En cours", couleur: "var(--st-warn)" },
  delayed: { label: "Retardée", couleur: "var(--st-err)" },
  completed: { label: "Faite", couleur: "var(--st-ok)" },
};
const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function euros(v: number): string {
  return `${(v ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
}

function dateLongue(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const texte = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function Carte({ titre, lien, lienLabel = "Ouvrir →", children }: {
  titre: string; lien?: string; lienLabel?: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-textPrimary">{titre}</h2>
        {lien && <Link href={lien} className="text-xs text-textMuted hover:text-violet">{lienLabel}</Link>}
      </div>
      {children}
    </section>
  );
}

function Kpi({ lien, ...props }: React.ComponentProps<typeof KpiTuile> & { lien: string }) {
  return (
    <Link href={lien} className="rounded-xl border border-line bg-surface p-4 transition hover:border-textMuted/30 hover:bg-surfaceAlt/40">
      <KpiTuile {...props} />
    </Link>
  );
}

function Ligne({ label, valeur, alerte = false }: { label: string; valeur: string | number; alerte?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 ${alerte ? "bg-amber/10" : "bg-surfaceAlt"}`}>
      <span className="text-xs text-textPrimary">{label}</span>
      <span className={`text-xs font-medium ${alerte ? "text-amber" : "text-textMuted"}`}>{valeur}</span>
    </div>
  );
}

function HistoriqueMois({ historique }: { historique: IdelAccueil["facturation"]["historique"] }) {
  const max = Math.max(...historique.map((m) => m.montant), 0);
  if (max === 0) return <p className="text-xs text-textMuted">Aucune facture transmise sur les 6 derniers mois.</p>;
  return (
    <div className="flex h-28 items-end gap-2" aria-label="Montant transmis par mois">
      {historique.map((m) => {
        const mois = Number(m.mois.slice(5, 7)) - 1;
        return (
          <div key={m.mois} className="flex flex-1 flex-col items-center gap-1" title={`${MOIS_COURT[mois]} : ${euros(m.montant)}`}>
            <span className="text-[10px] text-textMuted">{m.montant > 0 ? euros(m.montant) : ""}</span>
            <div className="w-full rounded-t bg-violet/70" style={{ height: `${Math.max((m.montant / max) * 64, m.montant > 0 ? 4 : 1)}px` }} />
            <span className="text-[10px] text-textMuted">{MOIS_COURT[mois]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AccueilIdelPage() {
  const [donnees, setDonnees] = useState<IdelAccueil | null>(null);
  const [perimetre, setPerimetre] = useState<IdelPerimetreAccueil | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    idelAccueil(perimetre)
      .then((d) => { setDonnees(d); setError(null); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [perimetre]);

  const d = donnees;
  const aTraiter = d ? d.pipeline.a_saisir + d.pipeline.a_coter + d.pipeline.a_transmettre : 0;
  const vueCabinet = d?.perimetre === "cabinet";

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <InsightStrip fetcher={idelInsights} />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-textPrimary">
              {d?.prenom ? `Bonjour ${d.prenom}` : "Tableau de bord"}
            </h1>
            {d && <p className="mt-1 text-sm text-textMuted">{dateLongue(d.date)}{vueCabinet ? " · vue du cabinet" : ""}</p>}
          </div>
          {d?.coordination && (
            <div className="flex rounded-lg border border-line bg-surface p-0.5 text-xs">
              {(["moi", "cabinet"] as IdelPerimetreAccueil[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPerimetre(p)}
                  className={`rounded-md px-3 py-1.5 ${d.perimetre === p ? "bg-surfaceAlt font-medium text-textPrimary shadow-sm ring-1 ring-line" : "text-textMuted hover:text-textPrimary"}`}
                >
                  {p === "moi" ? "Mon activité" : "Cabinet"}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {loading && !d ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : d && (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            {/* Chiffres cles */}
            <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {d.journee ? (
                <Kpi label="Visites du jour" valeur={String(d.journee.nb_restantes)}
                     sousLabel={`restante(s) sur ${d.journee.nb_visites}`} ton="sky" icone="agenda" lien="/idel/tournees" />
              ) : (
                <Kpi label="Patients suivis" valeur={String(d.patients)} ton="rose" icone="clients" lien="/idel/patients" />
              )}
              <Kpi label="Dossiers à traiter" valeur={String(aTraiter)} ton={aTraiter > 0 ? "amber" : "neutre"} icone="dossier"
                   sousLabel="dans le Pipeline" lien="/idel" />
              <Kpi label="Transmis ce mois" valeur={euros(d.facturation.facture_mois)} ton="teal" icone="envoi"
                   lien="/idel/comptabilite" />
              <Kpi label="En attente de paiement" valeur={euros(d.facturation.montant_en_attente_paiement)}
                   ton="violet" icone="portefeuille" lien="/idel/comptabilite" />
            </div>

            <div className="gap-4 lg:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
              {d.journee && (
                <Carte titre={vueCabinet ? "Journée du cabinet" : "Ma journée"} lien="/idel/tournees" lienLabel="Tournées →">
                  {d.journee.visites.length === 0 ? (
                    <p className="text-xs text-textMuted">Aucune visite prévue aujourd'hui.</p>
                  ) : (
                    <>
                      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-surfaceAlt">
                        <div className="h-full rounded-full bg-teal"
                             style={{ width: `${d.journee.nb_visites ? (d.journee.nb_terminees / d.journee.nb_visites) * 100 : 0}%` }} />
                      </div>
                      <div className="space-y-1.5">
                        {d.journee.visites.map((v, i) => {
                          const s = STATUT_VISITE[v.statut] || { label: v.statut, couleur: "var(--st-neutre)" };
                          return (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-surfaceAlt px-2.5 py-1.5">
                              <span className="truncate text-xs text-textPrimary">
                                <span className="mr-2 font-medium">{v.heure}</span>
                                {v.patient} · {PRESTATION[v.prestation] || v.prestation}
                              </span>
                              <span className="ml-2 shrink-0 text-[11px]" style={{ color: s.couleur }}>{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </Carte>
              )}

              {d.agenda && (
                <Carte titre="Agenda du jour" lien="/idel/agenda" lienLabel="Agenda →">
                  {d.agenda.length === 0 ? (
                    <p className="text-xs text-textMuted">Rien à l'agenda aujourd'hui.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {d.agenda.map((e, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg bg-surfaceAlt px-2.5 py-1.5">
                          <span className="truncate text-xs text-textPrimary">
                            <span className="mr-2 font-medium">{e.heure || "Journée"}</span>
                            {e.titre}{e.patient ? ` · ${e.patient}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Carte>
              )}

              <Carte titre="Pipeline des ordonnances" lien="/idel" lienLabel="Pipeline →">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { label: "À saisir", n: d.pipeline.a_saisir },
                    { label: "À coter", n: d.pipeline.a_coter },
                    { label: "À transmettre", n: d.pipeline.a_transmettre },
                    { label: "Rejetées", n: d.pipeline.rejetees, alerte: true },
                  ].map((e) => (
                    <div key={e.label} className={`rounded-lg px-3 py-2 ${e.alerte && e.n > 0 ? "bg-amber/10" : "bg-surfaceAlt"}`}>
                      <p className="text-[11px] text-textMuted">{e.label}</p>
                      <p className={`mt-0.5 font-display text-xl font-semibold ${e.alerte && e.n > 0 ? "text-amber" : "text-textPrimary"}`}>{e.n}</p>
                    </div>
                  ))}
                </div>
                {aTraiter === 0 && d.pipeline.rejetees === 0 && (
                  <p className="mt-3 text-xs text-textMuted">Tout est à jour.</p>
                )}
              </Carte>

              <Carte titre="Facturation" lien="/idel/comptabilite" lienLabel="Trésorerie →">
                <div className="mb-4 space-y-1.5">
                  <Ligne label="Cotées, à transmettre" valeur={euros(d.facturation.montant_a_transmettre)} />
                  <Ligne label="Transmises, en attente de paiement" valeur={euros(d.facturation.montant_en_attente_paiement)} />
                  <Ligne label="Encaissé ce mois" valeur={euros(d.facturation.encaisse_mois)} />
                  {d.facturation.montant_rejete > 0 && (
                    <Ligne label="Rejeté (à reprendre)" valeur={euros(d.facturation.montant_rejete)} alerte />
                  )}
                </div>
                <p className="mb-2 text-[11px] uppercase tracking-wide text-textMuted">Transmis par mois</p>
                <HistoriqueMois historique={d.facturation.historique} />
              </Carte>

              <Carte titre="Suivi">
                <div className="space-y-1.5">
                  <Ligne label="Patients suivis" valeur={d.patients} />
                  {d.ordonnances && (
                    <>
                      <Ligne label="Ordonnances expirant sous 7 jours" valeur={d.ordonnances.expirent_7j} alerte={d.ordonnances.expirent_7j > 0} />
                      <Ligne label="Ordonnances à renouveler" valeur={d.ordonnances.a_renouveler} alerte={d.ordonnances.a_renouveler > 0} />
                    </>
                  )}
                  {d.commandes_en_attente !== null && (
                    <Ligne label="Commandes pharmacie en attente" valeur={d.commandes_en_attente} />
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/idel/patients" className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">Patients</Link>
                  {d.ordonnances && <Link href="/idel/prescriptions" className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">Ordonnances</Link>}
                  {d.commandes_en_attente !== null && <Link href="/idel/pharma" className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">Commandes</Link>}
                  <Link href="/idel/nova" className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">Nova</Link>
                </div>
              </Carte>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
