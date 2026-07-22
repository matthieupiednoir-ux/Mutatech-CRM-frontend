"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { idelGetMe, idelUpdateMe, monOrganisation, idelChangerTheme, idelChangerOnglets, ApiError } from "@/lib/api";
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

// 3 themes IDEL/PSDM -- "defaut" reste l'identite Nova historique (rose
// neon hi-tech), les deux autres offrent une image plus sobre/medicale
// ou plus humaine/apaisante selon la personnalite de la structure.
const ONGLETS_CONFIGURABLES_IDEL = [
  { id: "patients", label: "Patients" },
  { id: "comptabilite", label: "Trésorerie" },
  { id: "catalogue", label: "Catalogue" },
  { id: "planning", label: "Planning" },
  { id: "journal", label: "Journal" },
];
// "pipeline" et "nova" restent volontairement absents : toujours
// visibles, comme "Dashboard"/"Agent IA" cote CRM.

const THEMES_IDEL: { id: string; nom: string; description: string; couleurs: string[] }[] = [
  {
    id: "defaut",
    nom: "Nova (Défaut)",
    description: "Rose néon hi-tech, glassmorphism — l'identité Nova actuelle.",
    couleurs: ["#05050B", "#12122A", "#FF2E9A", "#6C63FF"],
  },
  {
    id: "clinique",
    nom: "Clinique",
    description: "Blanc et bleu clinique, épuré et rassurant.",
    couleurs: ["#F4F8FC", "#FFFFFF", "#2E7CD6", "#1FB6A6"],
  },
  {
    id: "serenite",
    nom: "Sérénité",
    description: "Vert sauge doux et crème, chaleureux et apaisant.",
    couleurs: ["#F7F5EE", "#FFFEF9", "#7C9473", "#D9A25C"],
  },
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

  // Theme visuel de l'organisation
  const [theme, setTheme] = useState<string>("defaut");
  const [themeLoading, setThemeLoading] = useState(true);
  const [themeError, setThemeError] = useState<string | null>(null);
  const [themeSucces, setThemeSucces] = useState<string | null>(null);

  // Onglets visibles de l'organisation
  const [ongletsMasques, setOngletsMasques] = useState<Set<string>>(new Set());
  const [ongletsEnregistrement, setOngletsEnregistrement] = useState(false);
  const [ongletsError, setOngletsError] = useState<string | null>(null);
  const [ongletsSucces, setOngletsSucces] = useState<string | null>(null);

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

    monOrganisation()
      .then((org) => {
        setTheme(org.theme || "defaut");
        const liste = (org.onglets_masques || "").split(",").map((s) => s.trim()).filter(Boolean);
        setOngletsMasques(new Set(liste));
      })
      .catch(() => {})
      .finally(() => setThemeLoading(false));
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

  async function handleChoisirTheme(id: string) {
    const precedent = theme;
    setTheme(id);
    setThemeError(null);
    setThemeSucces(null);
    document.body.dataset.theme = id;
    try {
      await idelChangerTheme(id);
      setThemeSucces("Thème appliqué pour toute l'organisation.");
      setTimeout(() => setThemeSucces(null), 3000);
    } catch (e) {
      setTheme(precedent);
      document.body.dataset.theme = precedent;
      setThemeError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement du thème.");
    }
  }

  function toggleOnglet(id: string) {
    setOngletsMasques((prev) => {
      const copie = new Set(prev);
      if (copie.has(id)) copie.delete(id); else copie.add(id);
      return copie;
    });
    setOngletsSucces(null);
  }

  async function handleEnregistrerOnglets() {
    setOngletsEnregistrement(true);
    setOngletsError(null);
    setOngletsSucces(null);
    try {
      await idelChangerOnglets(Array.from(ongletsMasques).join(","));
      setOngletsSucces("Préférences enregistrées — rafraîchis la page pour voir le menu mis à jour.");
    } catch (e) {
      setOngletsError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setOngletsEnregistrement(false);
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

        {/* Thème visuel de l'organisation */}
        <section className="mb-8">
          <h2 className="font-display text-lg text-textPrimary mb-1">Thème</h2>
          <p className="mb-4 text-sm text-textMuted">
            S'applique à toute l'organisation (tous les membres voient le même thème) — réversible à tout moment.
          </p>

          {themeError && <p className="mb-3 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{themeError}</p>}
          {themeSucces && <p className="mb-3 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{themeSucces}</p>}

          {themeLoading ? (
            <p className="text-sm text-textMuted">Chargement…</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEMES_IDEL.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleChoisirTheme(t.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    theme === t.id ? "border-[var(--accent)] ring-1 ring-[var(--accent)]" : "border-line hover:border-[var(--accent)]/50"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-textPrimary">{t.nom}</span>
                    {theme === t.id && <span className="text-xs" style={{ color: "var(--accent)" }}>✓</span>}
                  </div>
                  <div className="mb-2 flex gap-1.5">
                    {t.couleurs.map((c, i) => (
                      <span key={i} className="h-5 w-5 rounded-full border border-line" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="text-xs text-textMuted">{t.description}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Onglets visibles de l'organisation */}
        <section className="mb-8">
          <h2 className="font-display text-lg text-textPrimary mb-1">Onglets visibles</h2>
          <p className="mb-4 text-sm text-textMuted">
            Choisis les onglets utiles à ton activité — masque ceux dont tu ne te sers pas. S'applique à toute
            l'organisation, réversible à tout moment.
          </p>

          {ongletsError && <p className="mb-3 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{ongletsError}</p>}
          {ongletsSucces && <p className="mb-3 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{ongletsSucces}</p>}

          {themeLoading ? (
            <p className="text-sm text-textMuted">Chargement…</p>
          ) : (
            <div className="space-y-2">
              {ONGLETS_CONFIGURABLES_IDEL.map((o) => (
                <label key={o.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 cursor-pointer">
                  <span className="text-sm text-textPrimary">{o.label}</span>
                  <input
                    type="checkbox"
                    checked={!ongletsMasques.has(o.id)}
                    onChange={() => toggleOnglet(o.id)}
                    className="h-4 w-4"
                    style={{ accentColor: "var(--accent)" }}
                  />
                </label>
              ))}
            </div>
          )}

          <button
            onClick={handleEnregistrerOnglets}
            disabled={ongletsEnregistrement || themeLoading}
            className="mt-4 rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {ongletsEnregistrement ? "Enregistrement..." : "Enregistrer"}
          </button>
        </section>

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
