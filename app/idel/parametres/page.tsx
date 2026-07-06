"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { idelGetMe, idelUpdateMe, ApiError } from "@/lib/api";
import { IdelMe, LpsChoisi } from "@/lib/types";

const LPS_OPTIONS: { value: LpsChoisi; label: string }[] = [
  { value: "vega", label: "Vega" },
  { value: "albus", label: "Albus" },
  { value: "simply_vitale", label: "Simply Vitale" },
  { value: "agathe_you", label: "Agathe&You" },
  { value: "ozzen", label: "Ozzen" },
  { value: "desmos", label: "Desmos" },
  { value: "carecare", label: "CareCare" },
  { value: "infimax", label: "Infimax" },
  { value: "autre", label: "Autre / non listé" },
];

export default function ParametresPage() {
  const [moi, setMoi] = useState<IdelMe | null>(null);
  const [lps, setLps] = useState<LpsChoisi>("autre");
  const [ville, setVille] = useState("");
  const [telephone, setTelephone] = useState("");
  const [rpps, setRpps] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  useEffect(() => {
    idelGetMe()
      .then((data) => {
        setMoi(data);
        setLps(data.lps_utilise);
        setVille(data.ville ?? "");
        setTelephone(data.telephone ?? "");
        setRpps(data.numero_adeli_rpps ?? "");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setSucces(false);
    try {
      const data = await idelUpdateMe({
        lps_utilise: lps,
        ville: ville.trim() || null,
        telephone: telephone.trim() || null,
        numero_adeli_rpps: rpps.trim() || null,
      });
      setMoi(data);
      setSucces(true);
      setTimeout(() => setSucces(false), 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-textPrimary mb-1">Paramètres</h1>
        <p className="text-sm text-textMuted mb-6">
          Ces informations personnalisent l'affichage et serviront de base à une future
          intégration directe si votre éditeur LPS propose un jour un accès technique.
          Aujourd'hui, aucun n'en documente publiquement — l'export CSV et la fiche de
          reprise sont la solution de démarrage en attendant.
        </p>

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-line bg-surface p-6">
            {moi && (
              <div className="text-sm text-textPrimary">
                <span className="font-medium">{moi.prenom} {moi.nom}</span>
                <span className="text-textMuted"> · {moi.email}</span>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-textMuted">
                Logiciel LPS utilisé (SESAM-Vitale)
              </label>
              <select value={lps} onChange={(e) => setLps(e.target.value as LpsChoisi)}
                className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                {LPS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-textMuted">
                Sert à afficher le bon nom lors de la confirmation de transmission, et à
                préparer une intégration API directe le jour où votre éditeur en proposera
                une — aucun ne le fait à ce jour.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-textMuted">
                N° ADELI / RPPS
              </label>
              <input value={rpps} onChange={(e) => setRpps(e.target.value)}
                className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-textMuted">
                  Ville
                </label>
                <input value={ville} onChange={(e) => setVille(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-textMuted">
                  Téléphone
                </label>
                <input value={telephone} onChange={(e) => setTelephone(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
              </div>
            </div>

            {error && <p className="text-xs text-amber">{error}</p>}
            {succes && <p className="text-xs text-teal">✓ Enregistré</p>}

            <button type="submit" disabled={saving}
              className="w-full rounded-lg bg-violet px-4 py-2.5 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
