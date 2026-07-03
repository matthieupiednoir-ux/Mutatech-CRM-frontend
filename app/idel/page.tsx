"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import {
  idelGetOrdonnances,
  idelUploaderOrdonnance,
  idelValiderCotation,
  idelMarquerTransmis,
  idelExporterCsv,
  ApiError,
} from "@/lib/api";
import { IdelOrdonnance } from "@/lib/types";

const STATUT_LABEL: Record<string, string> = {
  reception: "Réception",
  en_cours: "En cours",
  traite: "Traité",
};
const STATUT_COULEUR: Record<string, string> = {
  reception: "border-line bg-surface text-textMuted",
  en_cours: "border-amber/40 bg-amber/10 text-amber",
  traite: "border-teal/40 bg-teal/10 text-teal",
};

export default function IdelDashboard() {
  const [ordonnances, setOrdonnances] = useState<IdelOrdonnance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState(false);
  const [panneau, setPanneau] = useState<IdelOrdonnance | null>(null);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    idelGetOrdonnances()
      .then(setOrdonnances)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUpload(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("fichier", file);
      await idelUploaderOrdonnance(formData);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'upload");
    } finally {
      setUpload(false);
      e.target.value = "";
    }
  }

  async function handleMarquerTransmis(id: string) {
    if (!confirm("Confirmer que vous avez transmis cette ordonnance depuis votre LPS ?")) return;
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

  const colonnes: Array<"reception" | "en_cours" | "traite"> = ["reception", "en_cours", "traite"];

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Pipeline IDEL</h1>
            <p className="mt-0.5 text-sm text-textMuted">
              Préparation des transmissions CPAM · Lecture d'ordonnance + cotation NGAP
            </p>
          </div>
          <label className={`cursor-pointer rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 ${upload ? "opacity-50 pointer-events-none" : ""}`}>
            {upload ? "Analyse en cours…" : "+ Déposer une ordonnance"}
            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={upload} />
          </label>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {colonnes.map((statut) => {
            const items = ordonnances.filter((o) => o.statut === statut);
            return (
              <div key={statut} className="rounded-xl border border-line bg-surface p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold text-textPrimary">
                    {STATUT_LABEL[statut]}
                  </h2>
                  <span className="rounded-full bg-surfaceAlt px-2 py-0.5 text-xs text-textMuted">
                    {items.length}
                  </span>
                </div>

                {loading ? (
                  <p className="text-xs text-textMuted">Chargement…</p>
                ) : items.length === 0 ? (
                  <p className="text-xs text-textMuted">Aucune ordonnance.</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setPanneau(o)}
                        className={`w-full rounded-lg border p-3 text-left transition hover:border-violet/40 ${STATUT_COULEUR[o.statut]}`}
                      >
                        <p className="text-xs font-medium text-textPrimary">
                          {o.patient ? `${o.patient.nom} ${o.patient.prenom}` : "Patient inconnu"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-textMuted">
                          {o.medecin_prescripteur || "Médecin non extrait"}
                          {o.date_prescription ? ` · ${new Date(o.date_prescription).toLocaleDateString("fr-FR")}` : ""}
                        </p>
                        {o.necessite_validation && o.statut === "en_cours" && (
                          <span className="mt-1 inline-block rounded bg-amber/20 px-1.5 py-0.5 text-[10px] text-amber">
                            ⚠ Validation requise
                          </span>
                        )}
                        {o.confiance_ocr != null && (
                          <span className={`mt-1 ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${o.confiance_ocr >= 0.8 ? "bg-teal/10 text-teal" : "bg-amber/10 text-amber"}`}>
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

        {/* Panneau de détail / validation */}
        {panneau && (
          <div className="mt-6 rounded-xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg text-textPrimary">
                {panneau.patient
                  ? `${panneau.patient.nom} ${panneau.patient.prenom}`
                  : "Détail ordonnance"}
              </h2>
              <button onClick={() => setPanneau(null)} className="text-textMuted hover:text-textPrimary">✕</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <div>
                <p className="text-xs text-textMuted">Médecin prescripteur</p>
                <p className="text-sm text-textPrimary">{panneau.medecin_prescripteur || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-textMuted">Date prescription</p>
                <p className="text-sm text-textPrimary">
                  {panneau.date_prescription
                    ? new Date(panneau.date_prescription).toLocaleDateString("fr-FR")
                    : "—"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-textMuted">Acte prescrit (texte extrait)</p>
                <p className="text-sm text-textPrimary">{panneau.acte_prescrit_texte || "—"}</p>
              </div>
            </div>

            {panneau.cotations.length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-textMuted">
                  Proposition de cotation NGAP
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-textMuted">
                      <th className="py-1.5 text-left">Acte</th>
                      <th className="py-1.5 text-left">Libellé</th>
                      <th className="py-1.5 text-right">Coeff.</th>
                      <th className="py-1.5 text-right">Qté</th>
                      <th className="py-1.5 text-right">Montant</th>
                      <th className="py-1.5 text-right">Validé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {panneau.cotations.map((c) => (
                      <tr key={c.id} className="border-b border-line/50">
                        <td className="py-1.5 font-mono text-xs text-violet">{c.code_acte}</td>
                        <td className="py-1.5 text-textMuted">{c.libelle || "—"}</td>
                        <td className="py-1.5 text-right">{c.coefficient ?? "—"}</td>
                        <td className="py-1.5 text-right">{c.quantite}</td>
                        <td className="py-1.5 text-right text-teal">
                          {c.montant_total != null ? `${c.montant_total.toFixed(2)} €` : "—"}
                        </td>
                        <td className="py-1.5 text-right">
                          {c.valide_par_idel
                            ? <span className="text-teal">✓</span>
                            : <span className="text-amber">En attente</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {panneau.statut === "en_cours" && (
                <>
                  <a
                    href={idelExporterCsv(panneau.id)}
                    download
                    className="rounded-lg border border-line px-4 py-2 text-sm text-textPrimary hover:border-violet/40"
                  >
                    📥 Export CSV (import LPS)
                  </a>
                  <button
                    onClick={() => handleMarquerTransmis(panneau.id)}
                    disabled={actionEnCours === panneau.id}
                    className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-ink hover:bg-teal/90 disabled:opacity-50"
                  >
                    {actionEnCours === panneau.id ? "…" : "✓ J'ai transmis depuis mon LPS"}
                  </button>
                </>
              )}
              {panneau.statut === "traite" && (
                <span className="rounded-lg border border-teal/40 bg-teal/10 px-4 py-2 text-sm text-teal">
                  ✓ Transmise à la CPAM
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-amber/20 bg-amber/5 px-4 py-3 text-xs text-amber">
          ⚠ Ce système prépare vos transmissions CPAM mais ne se substitue jamais à votre LPS agréé SESAM-Vitale.
          La cotation NGAP proposée est indicative — vérifiez toujours avant de valider.
          Hébergement HDS requis en production pour le stockage des ordonnances.
        </div>
      </main>
    </>
  );
}
