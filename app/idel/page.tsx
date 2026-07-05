"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import {
  idelGetOrdonnances, idelUploaderOrdonnance,
  idelProposerCotation, idelValiderCotation,
  idelMarquerTransmis, idelExporterCsv, idelFicheReprise,
  idelGetPatients, ApiError,
} from "@/lib/api";
import { IdelOrdonnance, CotationOut, IdelPatient } from "@/lib/types";

// ===== CONSTANTES NGAP =====
const IFD = 2.50; // Indemnité forfaitaire de déplacement
const ZONES_IK: Record<string, number> = {
  plaine: 0.91,
  montagne: 1.05,
  tres_montagneux: 1.10,
};
const MAJORATIONS = [
  { code: "MS", label: "Soirée (20h–0h)", montant: 3.15 },
  { code: "MN", label: "Nuit (0h–7h)", montant: 4.72 },
  { code: "MJF", label: "Dimanche / Jour férié", montant: 11.65 },
];

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

// Application règle Article 11B NGAP
function appliquer11B(cotations: CotationOut[]): Array<CotationOut & { montant_applique: number; rang: number }> {
  const tries = [...cotations].sort((a, b) => (b.coefficient ?? 0) - (a.coefficient ?? 0));
  return tries.map((c, i) => {
    const base = c.montant_total ?? 0;
    let montant_applique: number;
    if (i === 0) montant_applique = base; // 100%
    else if (i === 1) montant_applique = base * 0.5; // 50%
    else montant_applique = 0; // gratuit
    return { ...c, montant_applique, rang: i + 1 };
  });
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
  const [patientSelectionne, setPatientSelectionne] = useState<string>("");

  // Majorations et déplacement
  const [majorationsSelectionnees, setMajorationsSelectionnees] = useState<string[]>([]);
  const [avecDeplacement, setAvecDeplacement] = useState(true);

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
    setMajorationsSelectionnees([]);
    setAvecDeplacement(true);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpload(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await idelUploaderOrdonnance(fd);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'upload");
    } finally {
      setUpload(false);
      e.target.value = "";
    }
  }

  async function handleProposerCotation(id: string) {
    setCotationLoading(true);
    setCotationError(null);
    setCotationProposee(null);
    try {
      const props = await idelProposerCotation(id);
      setCotationProposee(safeArr<CotationOut>(props));
    } catch (e) {
      setCotationError(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setCotationLoading(false);
    }
  }

  async function handleValiderCotation(id: string) {
    const pid = patientSelectionne || panneau?.patient?.id;
    if (!pid) { setCotationError("Associez un patient avant de valider."); return; }
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
    } finally {
      setActionEnCours(null);
    }
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
    } finally {
      setActionEnCours(null);
    }
  }

  function toggleMajoration(code: string) {
    setMajorationsSelectionnees((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  // Calcul complet de la séance
  const patientResolu = panneau?.patient
    || patients.find((p) => p.id === patientSelectionne)
    || null;

  const safeCotation = safeArr<CotationOut>(cotationProposee);
  const cotation11B = appliquer11B(safeCotation);

  const totalActes = cotation11B.reduce((s, c) => s + c.montant_applique, 0);
  const totalMajorations = majorationsSelectionnees.reduce((s, code) => {
    return s + (MAJORATIONS.find((m) => m.code === code)?.montant ?? 0);
  }, 0);

  const patientZone = (patientResolu as any)?.zone_deplacement ?? "plaine";
  const patientDistKm = parseFloat((patientResolu as any)?.distance_km ?? "0") || 0;
  const ikParKm = ZONES_IK[patientZone] ?? 0.91;
  const totalDeplacement = avecDeplacement ? IFD + patientDistKm * 2 * ikParKm : 0;
  const totalSeance = totalActes + totalMajorations + totalDeplacement;

  const safeCotationExistante = safeArr<CotationOut>(panneau?.cotations);
  const totalCotationExistante = safeCotationExistante.reduce((s, c) => s + (c.montant_total ?? 0), 0);

  const colonnes: Array<"reception" | "en_cours" | "traite"> = ["reception", "en_cours", "traite"];

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Pipeline IDEL</h1>
            <p className="mt-0.5 text-sm text-textMuted">Cotation NGAP · Art. 11B · Majorations · IK automatiques</p>
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
                          {o.confiance_ocr != null && (
                            <span className={`mt-1 ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${o.confiance_ocr >= 0.8 ? "bg-teal/20 text-teal" : o.confiance_ocr >= 0.5 ? "bg-amber/20 text-amber" : "bg-red-900/20 text-red-400"}`}>
                              OCR {Math.round(o.confiance_ocr * 100)}%
                            </span>
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
            <div className="w-full max-w-xl rounded-t-2xl bg-surface p-5 sm:rounded-2xl sm:m-4 max-h-[92vh] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-textPrimary">Détail ordonnance</h3>
                <button onClick={() => setPanneau(null)} className="text-textMuted hover:text-textPrimary">✕</button>
              </div>

              <div className="space-y-3 text-sm">
                {/* Patient */}
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted mb-1">Patient</p>
                  {patientResolu ? (
                    <div>
                      <p className="text-textPrimary font-medium">{patientResolu.nom} {patientResolu.prenom}</p>
                      {(patientResolu as any).zone_deplacement && (
                        <p className="text-[11px] text-textMuted mt-0.5">
                          Zone : {ZONES_IK[(patientResolu as any).zone_deplacement] ? `${(patientResolu as any).zone_deplacement} (${ZONES_IK[(patientResolu as any).zone_deplacement]}€/km)` : "—"}
                          {(patientResolu as any).distance_km ? ` · ${(patientResolu as any).distance_km}km aller` : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-amber">⚠ Aucun patient — requis pour valider</p>
                      {patients.length > 0 ? (
                        <select value={patientSelectionne} onChange={(e) => setPatientSelectionne(e.target.value)}
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary">
                          <option value="">— Sélectionner un patient —</option>
                          {patients.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                        </select>
                      ) : (
                        <p className="text-xs text-textMuted">Aucun patient — créez-en un dans l'onglet Patients.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Prescripteur */}
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted mb-1">Prescripteur</p>
                  <p className="text-textPrimary">{panneau.medecin_prescripteur || "—"}</p>
                  {panneau.date_prescription && (
                    <p className="text-xs text-textMuted">Le {new Date(panneau.date_prescription).toLocaleDateString("fr-FR")}</p>
                  )}
                </div>

                {panneau.acte_prescrit_texte && (
                  <div className="rounded-lg bg-surfaceAlt p-3">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted mb-1">Acte prescrit</p>
                    <p className="text-xs leading-relaxed text-textPrimary">{panneau.acte_prescrit_texte}</p>
                  </div>
                )}

                {/* Cotation existante validée */}
                {safeCotationExistante.length > 0 && (
                  <div className="rounded-lg bg-surfaceAlt p-3">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted mb-2">Cotation validée</p>
                    {safeCotationExistante.map((c, i) => (
                      <div key={i} className="flex justify-between text-xs gap-2 py-0.5">
                        <span className="font-bold text-textPrimary">{c.code_acte}</span>
                        <span className="flex-1 text-textMuted truncate">{c.libelle}</span>
                        <span className="text-teal">{(c.montant_total ?? 0).toFixed(2)} €</span>
                      </div>
                    ))}
                    <div className="mt-2 border-t border-line pt-2 flex justify-between text-xs font-bold">
                      <span>Total actes</span><span className="text-teal">{totalCotationExistante.toFixed(2)} €</span>
                    </div>
                  </div>
                )}

                {/* Zone cotation NGAP complète */}
                {panneau.statut === "en_cours" && safeCotationExistante.length === 0 && (
                  <div className="rounded-xl border border-violet/20 bg-violet/5 p-4 space-y-3">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted">Cotation NGAP — Art. 11B</p>

                    {!cotationProposee && !cotationLoading && !cotationValidee && (
                      <button onClick={() => handleProposerCotation(panneau.id)}
                        className="w-full rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
                        🤖 Proposer une cotation NGAP
                      </button>
                    )}

                    {cotationLoading && <p className="text-xs text-textMuted text-center py-2">Analyse IA en cours…</p>}
                    {cotationError && <p className="text-xs text-amber">{cotationError}</p>}

                    {cotation11B.length > 0 && !cotationValidee && (
                      <div className="space-y-3">
                        {/* Actes avec règle 11B */}
                        <div className="space-y-1">
                          {cotation11B.map((c, i) => (
                            <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${c.rang === 1 ? "bg-teal/10" : c.rang === 2 ? "bg-amber/10" : "bg-surfaceAlt opacity-60"}`}>
                              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${c.rang === 1 ? "bg-teal/20 text-teal" : c.rang === 2 ? "bg-amber/20 text-amber" : "bg-surfaceAlt text-textMuted"}`}>
                                {c.rang === 1 ? "100%" : c.rang === 2 ? "50%" : "Gratuit"}
                              </span>
                              <span className="font-bold text-textPrimary">{c.code_acte}</span>
                              <span className="flex-1 text-textMuted truncate">{c.libelle}</span>
                              <span className={c.rang <= 2 ? "text-textPrimary font-medium" : "line-through text-textMuted"}>
                                {c.rang <= 2 ? c.montant_applique.toFixed(2) + " €" : "0 €"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Majorations */}
                        <div className="rounded-lg border border-line p-3 space-y-2">
                          <p className="text-[11px] uppercase tracking-wide text-textMuted">Majorations</p>
                          {MAJORATIONS.map((m) => (
                            <label key={m.code} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox"
                                checked={majorationsSelectionnees.includes(m.code)}
                                onChange={() => toggleMajoration(m.code)}
                                className="accent-violet" />
                              <span className="text-xs text-textPrimary flex-1">{m.label}</span>
                              <span className="text-xs text-violet font-medium">+{m.montant.toFixed(2)} €</span>
                            </label>
                          ))}
                        </div>

                        {/* Déplacement */}
                        <div className="rounded-lg border border-line p-3 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={avecDeplacement}
                              onChange={(e) => setAvecDeplacement(e.target.checked)}
                              className="accent-teal" />
                            <span className="text-[11px] uppercase tracking-wide text-textMuted flex-1">Indemnités déplacement</span>
                          </label>
                          {avecDeplacement && (
                            <div className="space-y-1 text-xs text-textMuted pl-5">
                              <div className="flex justify-between">
                                <span>IFD (forfait)</span>
                                <span className="text-textPrimary">{IFD.toFixed(2)} €</span>
                              </div>
                              {patientDistKm > 0 ? (
                                <div className="flex justify-between">
                                  <span>IK {patientDistKm}km A/R × {ikParKm}€</span>
                                  <span className="text-textPrimary">{(patientDistKm * 2 * ikParKm).toFixed(2)} €</span>
                                </div>
                              ) : (
                                <p className="text-amber">⚠ Distance non renseignée sur le patient</p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Récap total */}
                        <div className="rounded-lg bg-surface border border-line p-3 space-y-1.5">
                          <p className="text-[11px] uppercase tracking-wide text-textMuted mb-2">Récapitulatif séance</p>
                          <div className="flex justify-between text-xs"><span className="text-textMuted">Actes (art. 11B)</span><span className="text-textPrimary">{totalActes.toFixed(2)} €</span></div>
                          {totalMajorations > 0 && <div className="flex justify-between text-xs"><span className="text-textMuted">Majorations</span><span className="text-violet">+{totalMajorations.toFixed(2)} €</span></div>}
                          {avecDeplacement && <div className="flex justify-between text-xs"><span className="text-textMuted">IFD + IK</span><span className="text-teal">+{totalDeplacement.toFixed(2)} €</span></div>}
                          <div className="flex justify-between border-t border-line pt-2 font-bold">
                            <span className="text-textPrimary">Total séance</span>
                            <span className="text-teal text-base">{totalSeance.toFixed(2)} €</span>
                          </div>
                        </div>

                        <p className="text-[11px] text-textMuted">Art. 11B NGAP — 1er acte 100%, 2ème 50%, suivants gratuits. Vérifiez avant de valider.</p>

                        <div className="flex gap-2">
                          <button onClick={() => setCotationProposee(null)}
                            className="flex-1 rounded-lg border border-line px-3 py-2 text-xs text-textMuted hover:text-textPrimary">
                            Relancer
                          </button>
                          <button onClick={() => handleValiderCotation(panneau.id)}
                            disabled={actionEnCours === panneau.id || (!panneau.patient?.id && !patientSelectionne)}
                            className="flex-1 rounded-lg bg-teal px-3 py-2 text-xs font-medium text-ink hover:opacity-90 disabled:opacity-50">
                            {actionEnCours === panneau.id ? "Validation…" : "✓ Valider"}
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
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-col gap-2">
                {panneau.statut === "en_cours" && safeCotationExistante.length > 0 && (
                  <>
                    <a href={idelExporterCsv(panneau.id)} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg border border-teal/40 bg-teal/10 px-4 py-2 text-center text-sm font-medium text-teal hover:bg-teal/20">
                      ↓ Export CSV (import LPS)
                    </a>
                    <a href={idelFicheReprise(panneau.id)} target="_blank" rel="noopener noreferrer"
                      className="rounded-lg border border-violet/40 bg-violet/10 px-4 py-2 text-center text-sm font-medium text-violet hover:bg-violet/20">
                      ↓ Fiche de reprise assistée
                    </a>
                    <button onClick={() => handleMarquerTransmis(panneau.id)} disabled={actionEnCours === panneau.id}
                      className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50">
                      {actionEnCours === panneau.id ? "…" : "✓ J'ai transmis depuis mon LPS"}
                    </button>
                  </>
                )}
                {panneau.statut === "reception" && (
                  <p className="text-xs text-textMuted text-center">L'IA analyse l'ordonnance — elle passera en "En cours" une fois traitée.</p>
                )}
                {panneau.statut === "traite" && (
                  <p className="text-xs text-teal text-center">✓ Transmise à la CPAM via votre LPS</p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-textMuted">
          ⚠ Ce système prépare vos transmissions CPAM mais ne remplace pas votre LPS agréé SESAM-Vitale.
          La cotation NGAP est indicative — vérifiez toujours avant de valider. Hébergement HDS requis en production.
        </p>
      </main>
    </>
  );
}
