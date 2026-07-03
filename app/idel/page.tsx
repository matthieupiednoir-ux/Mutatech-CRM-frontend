"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import {
  idelGetOrdonnances,
  idelUploaderOrdonnance,
  idelMarquerTransmis,
  idelExporterCsv,
  idelFicheReprise,
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
    setError(null);
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
      // Le backend FastAPI attend le champ nommé "file" (paramètre UploadFile = File(...))
      formData.append("file", file);
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
    setError(null);
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
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleUpload}
              disabled={upload}
            />
          </label>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        {/* Kanban 3 colonnes */}
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
                          {o.patient
                            ? `${o.patient.nom} ${o.patient.prenom}`
                            : "Patient non associé"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-textMuted">
                          {o.medecin_prescripteur || "Médecin non extrait"}
                          {o.date_prescription
                            ? ` · ${new Date(o.date_prescription).toLocaleDateString("fr-FR")}`
                            : ""}
                        </p>
                        {o.necessite_validation && o.statut === "en_cours" && (
                          <span className="mt-1 inline-block rounded bg-amber/20 px-1.5 py-0.5 text-[10px] text-amber">
                            ⚠ Validation requise
                          </span>
                        )}
                        {o.confiance_ocr != null && (
                          <span className={`mt-1 ml-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${
                            o.confiance_ocr >= 0.8 ? "bg-teal/20 text-teal"
                            : o.confiance_ocr >= 0.5 ? "bg-amber/20 text-amber"
                            : "bg-red-900/20 text-red-400"
                          }`}>
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

        {/* Panneau latéral détail ordonnance */}
        {panneau && (
          <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 sm:items-center">
            <div className="w-full max-w-md rounded-t-2xl bg-surface p-6 sm:rounded-2xl sm:m-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-textPrimary">
                  Détail ordonnance
                </h3>
                <button
                  onClick={() => setPanneau(null)}
                  className="text-textMuted hover:text-textPrimary"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted mb-1">Patient</p>
                  <p className="text-textPrimary font-medium">
                    {panneau.patient
                      ? `${panneau.patient.nom} ${panneau.patient.prenom}`
                      : "Non associé"}
                  </p>
                </div>

                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted mb-1">Prescripteur</p>
                  <p className="text-textPrimary">{panneau.medecin_prescripteur || "—"}</p>
                  {panneau.date_prescription && (
                    <p className="text-xs text-textMuted mt-0.5">
                      Le {new Date(panneau.date_prescription).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>

                {panneau.acte_prescrit_texte && (
                  <div className="rounded-lg bg-surfaceAlt p-3">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted mb-1">Acte prescrit</p>
                    <p className="text-textPrimary text-xs leading-relaxed">
                      {panneau.acte_prescrit_texte}
                    </p>
                  </div>
                )}

                {panneau.cotations && panneau.cotations.length > 0 && (
                  <div className="rounded-lg bg-surfaceAlt p-3">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted mb-2">
                      Cotation NGAP
                    </p>
                    <div className="space-y-1">
                      {panneau.cotations.map((c, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-textPrimary font-medium">{c.code_acte}</span>
                          <span className="text-textMuted">{c.libelle}</span>
                          <span className="text-teal font-medium">
                            {c.montant_total?.toFixed(2)} €
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 border-t border-line pt-2 flex justify-between text-xs font-bold">
                      <span className="text-textPrimary">Total</span>
                      <span className="text-teal">
                        {panneau.cotations
                          .reduce((s, c) => s + (c.montant_total || 0), 0)
                          .toFixed(2)} €
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions selon le statut */}
              <div className="mt-5 flex flex-col gap-2">
                {panneau.statut === "en_cours" && panneau.cotations && panneau.cotations.length > 0 && (
                  <>
                    <a
                      href={idelExporterCsv(panneau.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-teal/40 bg-teal/10 px-4 py-2 text-center text-sm font-medium text-teal hover:bg-teal/20"
                    >
                      ↓ Export CSV (import LPS)
                    </a>
                    <a
                      href={idelFicheReprise(panneau.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-violet/40 bg-violet/10 px-4 py-2 text-center text-sm font-medium text-violet hover:bg-violet/20"
                    >
                      ↓ Fiche de reprise assistée
                    </a>
                    <button
                      onClick={() => handleMarquerTransmis(panneau.id)}
                      disabled={actionEnCours === panneau.id}
                      className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
                    >
                      {actionEnCours === panneau.id
                        ? "Traitement…"
                        : "✓ J'ai transmis depuis mon LPS"}
                    </button>
                  </>
                )}
                {panneau.statut === "reception" && (
                  <p className="text-xs text-textMuted text-center">
                    L'IA analyse l'ordonnance — elle passera automatiquement en "En cours" une fois traitée.
                  </p>
                )}
                {panneau.statut === "traite" && (
                  <p className="text-xs text-teal text-center">
                    ✓ Transmise à la CPAM via votre LPS
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-textMuted">
          ⚠ Ce système prépare vos transmissions CPAM mais ne se substitue jamais à votre LPS agréé SESAM-Vitale.
          La cotation NGAP proposée est indicative — vérifiez toujours avant de valider.
          Hébergement HDS requis en production pour le stockage des ordonnances.
        </p>
      </main>
    </>
  );
}
