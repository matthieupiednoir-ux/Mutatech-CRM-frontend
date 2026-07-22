"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import {
  getTenantConfig, updateTenantConfig,
  whatsappDemanderLiaison, whatsappVerifierLiaison, whatsappStatutLiaison, whatsappDelierLiaison,
} from "@/lib/api";

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
  { id: "planning", label: "Planning" },
  { id: "journal", label: "Journal" },
  { id: "corbeille", label: "🗑 Corbeille" },
];
// "agent" (Agent IA) et "dashboard" restent volontairement absents de
// cette liste : ils sont toujours visibles, comme cote NavBar.tsx.

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

  // Informations legales -- necessaires pour que le bilan annuel exporte
  // depuis /comptabilite soit un document complet, exploitable tel quel
  // par un expert-comptable (nom, SIRET, adresse, TVA intracommunautaire).
  const [siret, setSiret] = useState("");
  const [adresseEntreprise, setAdresseEntreprise] = useState("");
  const [tvaIntra, setTvaIntra] = useState("");
  const [enregistrementLegal, setEnregistrementLegal] = useState(false);
  const [succesLegal, setSuccesLegal] = useState<string | null>(null);
  const [errorLegal, setErrorLegal] = useState<string | null>(null);

  // WhatsApp -- liaison du numero pour parler a Pixel depuis WhatsApp
  const [whatsappLie, setWhatsappLie] = useState(false);
  const [whatsappNumero, setWhatsappNumero] = useState<string | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState(true);
  const [nouveauNumero, setNouveauNumero] = useState("");
  const [codeVerification, setCodeVerification] = useState("");
  const [etapeWhatsapp, setEtapeWhatsapp] = useState<"saisie" | "verification">("saisie");
  const [whatsappEnCours, setWhatsappEnCours] = useState(false);
  const [erreurWhatsapp, setErreurWhatsapp] = useState<string | null>(null);
  const [succesWhatsapp, setSuccesWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    getTenantConfig()
      .then((config) => {
        const liste = (config.onglets_masques || "").split(",").map((s) => s.trim()).filter(Boolean);
        setMasques(new Set(liste));
        setTheme(config.theme || "defaut");
        setSiret(config.siret || "");
        setAdresseEntreprise(config.adresse || "");
        setTvaIntra(config.tva_intracommunautaire || "");
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));

    whatsappStatutLiaison()
      .then((s) => {
        setWhatsappLie(s.lie);
        setWhatsappNumero(s.numero);
      })
      .catch(() => {})
      .finally(() => setWhatsappLoading(false));
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

  async function handleEnregistrerLegal() {
    setEnregistrementLegal(true);
    setErrorLegal(null);
    setSuccesLegal(null);
    try {
      await updateTenantConfig({
        siret: siret.trim() || undefined,
        adresse: adresseEntreprise.trim() || undefined,
        tva_intracommunautaire: tvaIntra.trim() || undefined,
      });
      setSuccesLegal("Informations légales enregistrées.");
    } catch (e) {
      setErrorLegal(e instanceof ApiError ? e.message : "Erreur lors de l'enregistrement.");
    } finally {
      setEnregistrementLegal(false);
    }
  }

  async function handleDemanderCode() {
    if (!nouveauNumero.trim().startsWith("+")) {
      setErreurWhatsapp("Le numéro doit être au format international (ex: +33612345678).");
      return;
    }
    setWhatsappEnCours(true);
    setErreurWhatsapp(null);
    setSuccesWhatsapp(null);
    try {
      await whatsappDemanderLiaison(nouveauNumero.trim());
      setEtapeWhatsapp("verification");
      setSuccesWhatsapp("Code envoyé sur WhatsApp — saisis-le ci-dessous.");
    } catch (e) {
      setErreurWhatsapp(e instanceof ApiError ? e.message : "Erreur lors de l'envoi du code.");
    } finally {
      setWhatsappEnCours(false);
    }
  }

  async function handleVerifierCode() {
    setWhatsappEnCours(true);
    setErreurWhatsapp(null);
    try {
      const res = await whatsappVerifierLiaison(codeVerification.trim());
      setWhatsappLie(true);
      setWhatsappNumero(res.numero.replace("whatsapp:", ""));
      setEtapeWhatsapp("saisie");
      setNouveauNumero("");
      setCodeVerification("");
      setSuccesWhatsapp("Numéro lié avec succès — tu peux maintenant discuter avec Pixel sur WhatsApp.");
    } catch (e) {
      setErreurWhatsapp(e instanceof ApiError ? e.message : "Code incorrect ou expiré.");
    } finally {
      setWhatsappEnCours(false);
    }
  }

  async function handleDelier() {
    if (!confirm("Délier ce numéro WhatsApp ? Tu ne pourras plus discuter avec Pixel depuis ce canal.")) return;
    setWhatsappEnCours(true);
    setErreurWhatsapp(null);
    try {
      await whatsappDelierLiaison();
      setWhatsappLie(false);
      setWhatsappNumero(null);
      setSuccesWhatsapp("Numéro délié.");
    } catch (e) {
      setErreurWhatsapp(e instanceof ApiError ? e.message : "Erreur lors de la suppression.");
    } finally {
      setWhatsappEnCours(false);
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

        {/* WhatsApp */}
        <section className="mt-10">
          <h2 className="font-display text-lg text-textPrimary">💬 Pixel sur WhatsApp</h2>
          <p className="mt-1 text-sm text-textMuted">
            Lie ton numéro pour discuter avec Pixel directement depuis WhatsApp — mêmes capacités que sur le web,
            avec une double confirmation par message avant toute suppression.
          </p>

          {erreurWhatsapp && <p className="mt-3 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{erreurWhatsapp}</p>}
          {succesWhatsapp && <p className="mt-3 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{succesWhatsapp}</p>}

          {whatsappLoading ? (
            <p className="mt-4 text-sm text-textMuted">Chargement...</p>
          ) : whatsappLie ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
              <div>
                <p className="text-sm text-textPrimary">✓ Numéro lié</p>
                <p className="text-xs text-textMuted font-mono">{whatsappNumero}</p>
              </div>
              <button
                onClick={handleDelier}
                disabled={whatsappEnCours}
                className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-amber disabled:opacity-50"
              >
                Délier
              </button>
            </div>
          ) : etapeWhatsapp === "saisie" ? (
            <div className="mt-4 flex gap-2">
              <input
                value={nouveauNumero}
                onChange={(e) => setNouveauNumero(e.target.value)}
                placeholder="+33612345678"
                className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary font-mono placeholder:text-textMuted/60"
              />
              <button
                onClick={handleDemanderCode}
                disabled={whatsappEnCours}
                className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {whatsappEnCours ? "…" : "Envoyer le code"}
              </button>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <input
                value={codeVerification}
                onChange={(e) => setCodeVerification(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-32 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary font-mono placeholder:text-textMuted/60"
              />
              <button
                onClick={handleVerifierCode}
                disabled={whatsappEnCours}
                className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {whatsappEnCours ? "…" : "Valider"}
              </button>
              <button
                onClick={() => { setEtapeWhatsapp("saisie"); setErreurWhatsapp(null); }}
                className="text-sm text-textMuted hover:text-textPrimary"
              >
                Annuler
              </button>
            </div>
          )}
        </section>

        {/* Informations légales */}
        <section className="mt-10">
          <h2 className="font-display text-lg text-textPrimary">Informations légales</h2>
          <p className="mt-1 text-sm text-textMuted">
            Utilisées sur le bilan annuel exporté depuis Comptabilité, pour un document directement
            exploitable par ton expert-comptable.
          </p>

          {errorLegal && <p className="mt-3 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{errorLegal}</p>}
          {succesLegal && <p className="mt-3 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{succesLegal}</p>}

          {loading ? (
            <p className="mt-4 text-sm text-textMuted">Chargement...</p>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">SIRET</span>
                <input
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  placeholder="123 456 789 00012"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary font-mono placeholder:text-textMuted/60"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Adresse de l'entreprise</span>
                <textarea
                  value={adresseEntreprise}
                  onChange={(e) => setAdresseEntreprise(e.target.value)}
                  rows={2}
                  placeholder="12 rue de la Paix, 06000 Nice"
                  className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">TVA intracommunautaire</span>
                <input
                  value={tvaIntra}
                  onChange={(e) => setTvaIntra(e.target.value)}
                  placeholder="FR12345678901"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary font-mono placeholder:text-textMuted/60"
                />
              </label>
              <button
                onClick={handleEnregistrerLegal}
                disabled={enregistrementLegal}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {enregistrementLegal ? "Enregistrement..." : "Enregistrer"}
              </button>
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
