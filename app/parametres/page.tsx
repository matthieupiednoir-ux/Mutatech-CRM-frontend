"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { getTenantConfig, updateTenantConfig } from "@/lib/api";

// Doit rester coherent avec ONGLETS_CRM dans NavBar.tsx -- volontairement
// duplique plutot qu'importe, car cette liste decrit des libelles humains
// pour l'ecran de reglages, distincts des routes techniques.
const ONGLETS_CONFIGURABLES = [
  { id: "clients", label: "Clients" },
  { id: "devis", label: "Devis" },
  { id: "factures", label: "Factures" },
  { id: "depenses", label: "Dépenses" },
  { id: "taches", label: "Tâches" },
  { id: "prospects", label: "Prospects" },
  { id: "comptabilite", label: "Comptabilité" },
  { id: "catalogue", label: "Catalogue" },
  { id: "agent", label: "Agent IA" },
];

// Apercu statique des 5 palettes -- copie a la main depuis globals.css
// (pas de lecture dynamique des variables CSS ici, plus simple et fiable
// pour un simple aperçu visuel avant application reelle).
const THEMES: { id: string; nom: string; description: string; couleurs: string[] }[] = [
  {
    id: "defaut",
    nom: "Défaut",
    description: "Violet tech, sombre — le thème actuel.",
    couleurs: ["#0F0F1E", "#16162C", "#6C63FF", "#00D4AA"],
  },
  {
    id: "sakura",
    nom: "Sakura Kawaii",
    description: "Rose pastel clair, pétales de cerisier animés.",
    couleurs: ["#FFF5F8", "#FFE4EC", "#FF6FA5", "#7BC9A6"],
  },
  {
    id: "bois",
    nom: "Atelier Bois",
    description: "Brun industriel chaud, accents terracotta.",
    couleurs: ["#2B2118", "#3D2F22", "#C97C3D", "#8B9A5B"],
  },
  {
    id: "neon",
    nom: "Néon Nuit",
    description: "Cyberpunk sombre, cyan et magenta électriques.",
    couleurs: ["#05050B", "#12122A", "#00F0FF", "#FF2E9A"],
  },
  {
    id: "menthe",
    nom: "Menthe Fraîche",
    description: "Clair et minimaliste, vert menthe et bleu ciel.",
    couleurs: ["#FFFFFF", "#EFFAF5", "#00B894", "#3D8BFF"],
  },
];

export default function ParametresPage() {
  const [masques, setMasques] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<string>("defaut");
  const [loading, setLoading] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTenantConfig()
      .then((config) => {
        const liste = (config.onglets_masques || "").split(",").map((s) => s.trim()).filter(Boolean);
        setMasques(new Set(liste));
        setTheme(config.theme || "defaut");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    setMasques((prev) => {
      const copie = new Set(prev);
      if (copie.has(id)) copie.delete(id); else copie.add(id);
      return copie;
    });
    setSucces(null);
  }

  async function handleChoisirTheme(id: string) {
    setTheme(id);
    setSucces(null);
    setError(null);
    // Applique immediatement a l'ecran (retour visuel instantane), la
    // sauvegarde serveur suit juste derriere -- si elle echoue, le theme
    // reste applique localement jusqu'au prochain chargement de page,
    // sans bloquer l'utilisateur sur un aller-retour reseau.
    document.body.dataset.theme = id;
    try {
      await updateTenantConfig({ theme: id });
      setSucces("Thème appliqué.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement du thème.");
    }
  }

  async function handleEnregistrer() {
    setEnregistrement(true);
    setError(null);
    setSucces(null);
    try {
      await updateTenantConfig({ onglets_masques: Array.from(masques).join(",") });
      setSucces("Préférences enregistrées — rafraîchis la page pour voir le menu mis à jour.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl text-textPrimary">Paramètres</h1>

        {error && <p className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}
        {succes && <p className="mt-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{succes}</p>}

        {/* Thème visuel */}
        <section className="mt-6">
          <h2 className="font-display text-lg text-textPrimary">Thème</h2>
          <p className="mt-1 text-sm text-textMuted">
            Change complètement l'apparence de ton espace CRM — réversible à tout moment, sans impact sur tes données.
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-textMuted">Chargement...</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleChoisirTheme(t.id)}
                  className={`rounded-xl border p-4 text-left transition ${
                    theme === t.id ? "border-violet ring-1 ring-violet" : "border-line hover:border-violet/50"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-textPrimary">{t.nom}</span>
                    {theme === t.id && <span className="text-xs text-violet">✓ Actif</span>}
                  </div>
                  <div className="mb-2 flex gap-1.5">
                    {t.couleurs.map((c, i) => (
                      <span key={i} className="h-6 w-6 rounded-full border border-line" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="text-xs text-textMuted">{t.description}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Onglets visibles */}
        <section className="mt-10">
          <h2 className="font-display text-lg text-textPrimary">Onglets visibles</h2>
          <p className="mt-1 text-sm text-textMuted">
            Choisis les onglets utiles à ton activité — masque ceux dont tu ne te sers pas (ex. Prospects si tu ne prospectes pas activement). Réversible à tout moment.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-textMuted">Chargement...</p>
          ) : (
            <div className="mt-6 space-y-2">
              {ONGLETS_CONFIGURABLES.map((o) => (
                <label key={o.id} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 cursor-pointer">
                  <span className="text-sm text-textPrimary">{o.label}</span>
                  <input
                    type="checkbox"
                    checked={!masques.has(o.id)}
                    onChange={() => toggle(o.id)}
                    className="h-4 w-4 accent-violet"
                  />
                </label>
              ))}
            </div>
          )}

          <button
            onClick={handleEnregistrer}
            disabled={enregistrement || loading}
            className="mt-6 rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
          >
            {enregistrement ? "Enregistrement..." : "Enregistrer"}
          </button>
        </section>
      </main>
    </>
  );
}
