"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import {
  idelGetOrdonnances, idelUploaderOrdonnance,
  idelProposerCotation, idelValiderCotation,
  idelMarquerTransmis, idelExporterCsv, idelFicheReprise,
  idelGetPatients, ApiError,
} from "@/lib/api";
import {
  IdelOrdonnance, CotationOut, IdelPatient, ZoneDeplacement,
  LigneCotationCalculee, DetailCotationNGAP,
} from "@/lib/types";

// ===== CONSTANTES NGAP =====
const IFD = 2.50; // Indemnité forfaitaire de déplacement

const IK_ZONES: Record<ZoneDeplacement, number> = {
  plaine: 0.91,
  montagne: 1.05,
  tres_montagneux: 1.10,
};

const MAJORATIONS = [
  { code: "MS", label: "Soirée (20h–0h)", montant: 3.15 },
  { code: "MN", label: "Nuit (0h–7h)", montant: 4.72 },
  { code: "MJF", label: "Dimanche / Jour férié", montant: 11.65 },
];

// ===== MOTEUR NGAP ARTICLE 11B =====
function calculerNGAP(
  cotations: CotationOut[],
  patient: IdelPatient | null | undefined,
  majorationsActives: string[]
): DetailCotationNGAP {
  // Tri par coefficient décroissant (proxy : montant_total)
  const tries = [...cotations].sort(
    (a, b) => (b.montant_total ?? 0) - (a.montant_total ?? 0)
  );

  // Article 11B : 100% / 50% / gratuit
  const lignes: LigneCotationCalculee[] = tries.map((c, i) => {
    const brut = c.montant_total ?? 0;
    const pct: 100 | 50 | 0 = i === 0 ? 100 : i === 1 ? 50 : 0;
    const net = pct === 100 ? brut : pct === 50 ? brut * 0.5 : 0;
    return {
      code_acte: c.code_acte,
      libelle: c.libelle ?? c.code_acte,
      coefficient: c.coefficient ?? 0,
      montant_brut: brut,
      pourcentage: pct,
      montant_net: net,
      gratuit: pct === 0,
    };
  });

  // IK déplacement
  const zone = patient?.zone_deplacement ?? "plaine";
  const dist = patient?.distance_km ?? 0;
  const ik = dist > 0 ? dist * IK_ZONES[zone] * 2 : 0; // aller-retour

  // Majorations sélectionnées
  const majActives = MAJORATIONS.filter((m) => majorationsActives.includes(m.code));

  const totalActes = lignes.reduce((s, l) => s + l.montant_net, 0);
  const totalMaj = majActives.reduce((s, m) => s + m.montant, 0);
  const total = totalActes + IFD + ik + totalMaj;

  return { lignes, ifd: IFD, ik, majorations: majActives, total };
}

const STATUT_LABEL: Record<string, string> = {
  reception: "Réception", en_cours: "En cours", traite: "Traité",
};
const STATUT_COULEUR: Record<string, string> = {
  reception: "border-line bg-surface text-textMuted",
  en_cours: "border-amber/40 bg-amber/10 text-amber",
  traite: "border-teal/40 bg-teal/10 text-teal",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function IdelDashboard() {
  const [ordonnances, setOrdonnances] = useState<IdelOrdonnance[]>([]);
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState(false);
  const [panneau, setPanneau] = useState<IdelOrdonnance | null>(null);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  // Cotation
  const [cotationProposee, setCotationProposee] = useState<CotationOut[] | null>(null);
  const [cotationLoading, setCotationLoading] = useState(false);
  const [cotationError, setCotationError] = useState<string | null>(null);
  const [cotationValidee, setCotationValidee] = useState(false);
  const [patientSelectionne, setPatientSelectionne] = useState("");
  const [majorationsActives, setMajorationsActives] = useState<string[]>([]);

  function charger() {
    setLoading(true);
    Promise.all([
      idelGetOrdonnances(),
      idelGetPatients().catch(() => []),
    ])
      .then(([ordo, pts]) => {
        setOrdonnances(safeArr<IdelOrdonnance>(ordo));
        setPatients(safeArr<IdelPatient>(pts));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  function ouvrirPanneau(o: IdelOrdonnance) {
    setPanneau(o);
    setCotationProposee(null);
    setCotationError(null);
    setCotationValidee(false);
    setPatientSelectionne(o.patient?.id ?? "");
    setMajorationsActives([]);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpload(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await idelUploaderOrdonnance(fd);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'upload");
    } finally { setUpload(false); e.target.value = ""; }
  }

  async function handleProposerCotation(id: string) {
    setCotationLoading(true);
    setCotationError(null);
    setCotationProposee(null);
    try {
      const props = await idelProposerCotation(id);
      setCotationProposee(safeArr<CotationOut>(props));
    } catch (e) {
      setCotationError(e instanceof ApiError ? e.message : "Erreur lors de la proposition");
    } finally { setCotationLoading(false); }
  }

  async function handleValiderCotation(id: string) {
    const pid = patientSelectionne || panneau?.patient?.id;
    if (!pid) { setCotationError("Sélectionnez un patient avant de valider."); return; }
    if (!cotationProposee) return;
    setActionEnCours(id);
    setCotationError(null);
    try {
      const items = safeArr<CotationOut>(cotationProposee).map((c) => ({
        code_acte: c.code_acte,
        quantite: c.quantite ?? 1,
        modificateurs: safeArr<string>(c.modificateurs),
      }));
      await idelValiderCotation(id, items, pid);
      setCotationValidee(true);
      setTimeout(() => charger(), 500);
    } catch (e) {
      setCotationError(e instanceof ApiError ? e.message : "Erreur de validation");
    } finally { setActionEnCours(null); }
  }

  async function handleMarquerTransmis(id: string) {
    if (!confirm("Confirmer la transmission depuis votre LPS ?")) return;
    setActionEnCours(id);
    try {
      await idelMarquerTransmis(id);
      charger();
      if (panneau?.id === id) setPanneau(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    } finally { setActionEnCours(null); }
  }

  function toggleMajoration(code: string) {
    setMajorationsActives((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  // Patient résolu pour le panneau
  const patientResolu = panneau?.patient
    ?? patients.find((p) => p.id === patientSelectionne)
    ?? null;

  // Calcul NGAP en temps réel
  const safeCotation = safeArr<CotationOut>(cotationProposee);
  const detail: DetailCotationNGAP | null = safeCotation.length > 0
    ? calculerNGAP(safeCotation, patientResolu, majorationsActives)
    : null;

  // Cotation existante déjà validée
  const cotationsExistantes = safeArr<CotationOut>(panneau?.cotations);

  const colonnes: Array<"reception" | "en_cours" | "traite"> = ["reception", "en_cours", "traite"];

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Pipeline IDEL</h1>
            <p className="mt-0.5 text-sm text-textMuted">Cotation NGAP Art.11B · IK · Majorations · Préparation CPAM</p>
          </div>
          <label className={`cursor-pointer rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 ${upload ? "opacity-50 pointer-events-none" : ""}`}>
            {upload ? "Analyse…" : "+ Déposer une ordonnance"}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={upload} />
          </label>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {/* Kanban */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {colonnes.map((statut) => {
            const items = safeArr<IdelOrdonnance>(ordonnances).filter((o) => o.statut === statut);
            return (
              <div key={statut} className="rounded-xl border border-line bg-surface p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-textPrimary">{STATUT_LABEL[statut]}</h2>
                  <span className="rounded-full bg-surfaceAlt px-2 py-0.5 text-xs text-textMuted">{items.length}</span>
                </div>
                {loading ? <p className="text-xs text-textMuted">Chargement…</p>
                  : items.length === 0 ? <p className="text-xs text-textMuted">Aucune ordonnance.</p>
                  : (
                    <div className="space-y-2">
                      {items.map((o) => (
                        <button key={o.id} onClick={() => ouvrirPanneau(o)}
                          className={`w-full rounded-lg border p-3 text-left transition hover:border-violet/40 ${STATUT_COULEUR[o.statut]}`}>
                          <p className="text-xs font-medium text-textPrimary">
                            {o.patient ? `${o.patient.nom} ${o.patient.prenom}` : "Patient non associé"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-textMuted">
                            {o.medecin_prescripteur || "Médecin non extrait"}
                            {o.date_prescription ? ` · ${new Date(o.date_prescription).toLocaleDateString("fr-FR")}` : ""}
                          </p>
                          {o.necessite_validation && o.statut === "en_cours" && (
                            <span className="mt-1 inline-block rounded bg-amber/20 px-1.5 py-0.5 text-[10px] text-amber">⚠ Validation requise</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        {/* Panneau détail */}
        {panneau && (
          <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) setPanneau(null); }}>
            <div className="w-full max-w-lg rounded-t-2xl bg-surface p-5 sm:rounded-2xl sm:m-4 max-h-[92vh] overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-textPrimary">Détail ordonnance</h3>
                <button onClick={() => setPanneau(null)} className="text-textMuted hover:text-textPrimary">✕</button>
              </div>

              {/* Patient */}
              <div className="rounded-lg bg-surfaceAlt p-3">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-textMuted">Patient</p>
                {patientResolu ? (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-textPrimary">{patientResolu.nom} {patientResolu.prenom}</p>
                      {patientResolu.adresse && <p className="text-xs text-textMuted">{patientResolu.adresse}</p>}
                    </div>
                    {patientResolu.zone_deplacement && (
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-medium text-teal">
                          {patientResolu.zone_deplacement === "plaine" ? "Plaine" : patientResolu.zone_deplacement === "montagne" ? "Montagne" : "Très montagneux"}
                        </p>
                        {patientResolu.distance_km && (
                          <p className="text-[11px] text-textMuted">{patientResolu.distance_km} km</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-amber">⚠ Aucun patient associé — requis pour la cotation</p>
                    {patients.length > 0 ? (
                      <select value={patientSelectionne} onChange={(e) => setPatientSelectionne(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary">
                        <option value="">— Sélectionner un patient —</option>
                        {patients.map((p) => (
                          <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-textMuted">Aucun patient en base — créez-en un dans l'onglet Patients.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Prescripteur + Acte */}
              {panneau.medecin_prescripteur && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-textMuted">Prescripteur</p>
                  <p className="text-sm text-textPrimary">{panneau.medecin_prescripteur}</p>
                  {panneau.date_prescription && <p className="text-xs text-textMuted">Le {new Date(panneau.date_prescription).toLocaleDateString("fr-FR")}</p>}
                </div>
              )}
              {panneau.acte_prescrit_texte && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-textMuted">Acte prescrit</p>
                  <p className="text-xs text-textPrimary leading-relaxed">{panneau.acte_prescrit_texte}</p>
                </div>
              )}

              {/* Cotation déjà validée */}
              {cotationsExistantes.length > 0 && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="mb-2 text-[11px] uppercase tracking-wide text-textMuted">Cotation NGAP validée</p>
                  {cotationsExistantes.map((c, i) => (
                    <div key={i} className="flex justify-between text-xs gap-2 py-0.5">
                      <span className="font-bold text-textPrimary">{c.code_acte}</span>
                      <span className="text-textMuted flex-1 truncate">{c.libelle}</span>
                      <span className="text-teal font-medium">{(c.montant_total ?? 0).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Zone cotation NGAP — en_cours + pas encore validée */}
              {panneau.statut === "en_cours" && cotationsExistantes.length === 0 && (
                <div className="rounded-xl border border-violet/20 bg-violet/5 p-4 space-y-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted font-medium">Cotation NGAP · Article 11B</p>

                  {!cotationProposee && !cotationLoading && !cotationValidee && (
                    <button onClick={() => handleProposerCotation(panneau.id)}
                      className="w-full rounded-lg bg-violet px-4 py-2.5 text-sm font-medium text-white hover:bg-violet/90">
                      🤖 Proposer une cotation NGAP
                    </button>
                  )}
                  {cotationLoading && <p className="text-xs text-textMuted text-center py-2">Analyse IA en cours…</p>}
                  {cotationError && <p className="text-xs text-amber">{cotationError}</p>}

                  {detail && !cotationValidee && (
                    <div className="space-y-3">
                      {/* Tableau Article 11B */}
                      <div className="space-y-1">
                        {detail.lignes.map((l, i) => (
                          <div key={i} className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${l.gratuit ? "opacity-50" : ""}`}>
                            <span className="font-bold text-textPrimary w-14 shrink-0">{l.code_acte}</span>
                            <span className="text-textMuted flex-1 truncate text-[11px]">{l.libelle}</span>
                            <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${l.pourcentage === 100 ? "bg-teal/20 text-teal" : l.pourcentage === 50 ? "bg-amber/20 text-amber" : "bg-surfaceAlt text-textMuted"}`}>
                              {l.gratuit ? "Gratuit" : `${l.pourcentage}%`}
                            </span>
                            <span className="shrink-0 font-medium text-textPrimary w-14 text-right">
                              {l.gratuit ? "0.00 €" : `${l.montant_net.toFixed(2)} €`}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Déplacement */}
                      <div className="border-t border-line pt-2 space-y-0.5">
                        <div className="flex justify-between text-[11px] text-textMuted">
                          <span>IFD (forfait déplacement)</span><span>{IFD.toFixed(2)} €</span>
                        </div>
                        {detail.ik > 0 && patientResolu && (
                          <div className="flex justify-between text-[11px] text-textMuted">
                            <span>IK {patientResolu.zone_deplacement} · {patientResolu.distance_km}km A/R</span>
                            <span>{detail.ik.toFixed(2)} €</span>
                          </div>
                        )}
                        {!patientResolu?.distance_km && (
                          <p className="text-[10px] text-textMuted italic">← Renseignez la distance dans la fiche patient pour l'IK</p>
                        )}
                      </div>

                      {/* Majorations */}
                      <div className="border-t border-line pt-2">
                        <p className="mb-2 text-[11px] text-textMuted font-medium">Majorations</p>
                        <div className="space-y-1.5">
                          {MAJORATIONS.map((m) => (
                            <label key={m.code} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox"
                                checked={majorationsActives.includes(m.code)}
                                onChange={() => toggleMajoration(m.code)}
                                className="accent-violet" />
                              <span className="text-xs text-textPrimary flex-1">{m.label}</span>
                              <span className="text-xs text-teal font-medium">+{m.montant.toFixed(2)} €</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="border-t border-line pt-2 flex justify-between font-bold">
                        <span className="text-sm text-textPrimary">Total séance</span>
                        <span className="text-teal text-lg">{detail.total.toFixed(2)} €</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button onClick={() => setCotationProposee(null)}
                          className="flex-1 rounded-lg border border-line px-3 py-2 text-xs text-textMuted hover:text-textPrimary">
                          Relancer
                        </button>
                        <button onClick={() => handleValiderCotation(panneau.id)}
                          disabled={actionEnCours === panneau.id || (!panneau.patient?.id && !patientSelectionne)}
                          className="flex-1 rounded-lg bg-teal px-3 py-2 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-50">
                          {actionEnCours === panneau.id ? "Validation…" : "✓ Valider la cotation"}
                        </button>
                      </div>
                      {!panneau.patient?.id && !patientSelectionne && (
                        <p className="text-[11px] text-amber text-center">Sélectionnez un patient pour valider</p>
                      )}
                    </div>
                  )}
                  {cotationValidee && <p className="text-xs text-teal text-center py-2">✓ Cotation validée — rechargement en cours.</p>}
                </div>
              )}

              {/* Actions export/transmission */}
              <div className="flex flex-col gap-2 pt-1">
                {panneau.statut === "en_cours" && cotationsExistantes.length > 0 && (
                  <>
                    <a href={idelExporterCsv(panneau.id)} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg border border-teal/40 bg-teal/10 px-4 py-2 text-center text-sm font-medium text-teal hover:bg-teal/20">
                      ↓ Export CSV (import LPS)
                    </a>
                    <a href={idelFicheReprise(panneau.id)} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg border border-violet/40 bg-violet/10 px-4 py-2 text-center text-sm font-medium text-violet hover:bg-violet/20">
                      ↓ Fiche de reprise assistée
                    </a>
                    <button onClick={() => handleMarquerTransmis(panneau.id)}
                      disabled={actionEnCours === panneau.id}
                      className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50">
                      {actionEnCours === panneau.id ? "…" : "✓ J'ai transmis depuis mon LPS"}
                    </button>
                  </>
                )}
                {panneau.statut === "reception" && (
                  <p className="text-xs text-textMuted text-center">L'IA analyse l'ordonnance — elle passera en "En cours" automatiquement.</p>
                )}
                {panneau.statut === "traite" && (
                  <p className="text-xs text-teal text-center">✓ Transmise à la CPAM via votre LPS</p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-textMuted">
          ⚠ Cotation NGAP indicative (Art.11B). Ne se substitue pas à votre LPS agréé SESAM-Vitale. HDS requis en production.
        </p>
      </main>
    </>
  );
}
