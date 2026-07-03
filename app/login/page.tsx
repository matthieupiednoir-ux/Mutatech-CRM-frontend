"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginCrm, registerCrm, loginGoogle, getTenantConfig, ApiError } from "@/lib/api";
import { estConnecte, appliquerCouleursTenant } from "@/lib/auth";

type Mode = "login" | "register";

// Composant interne qui utilise useSearchParams — doit être dans <Suspense>
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nom, setNom] = useState("");
  const [nomEntreprise, setNomEntreprise] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (estConnecte()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  async function chargerConfigEtRediriger() {
    try {
      await getTenantConfig();
      appliquerCouleursTenant();
    } catch { /* non bloquant */ }
    const next = searchParams.get("next") || "/dashboard";
    router.replace(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") {
        await loginCrm({ email, mot_de_passe: motDePasse });
      } else {
        await registerCrm({
          email,
          mot_de_passe: motDePasse,
          nom: nom || undefined,
          nom_entreprise: nomEntreprise || undefined,
        });
      }
      await chargerConfigEtRediriger();
    } catch (e) {
      let msg = "Erreur de connexion.";
      if (e instanceof ApiError) {
        try { msg = JSON.parse(e.message)?.detail || e.message; } catch { msg = e.message; }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleClick() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !(window as any).google) {
      setError("Google n'est pas disponible. Utilise email + mot de passe.");
      return;
    }
    setGoogleLoading(true);
    setError(null);
    (window as any).google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: any) => {
        try {
          await loginGoogle(response.credential);
          await chargerConfigEtRediriger();
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Erreur Google.");
          setGoogleLoading(false);
        }
      },
    });
    (window as any).google.accounts.id.prompt();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="font-display text-2xl font-bold text-textPrimary">
          Muta<span className="text-violet">tech</span>
        </span>
        <p className="mt-1 text-sm text-textMuted">CRM · Espace client</p>
      </div>

      <div className="mb-6 flex rounded-lg border border-line bg-surface p-1">
        <button
          onClick={() => { setMode("login"); setError(null); }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === "login" ? "bg-violet text-white" : "text-textMuted hover:text-textPrimary"
          }`}
        >
          Se connecter
        </button>
        <button
          onClick={() => { setMode("register"); setError(null); }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === "register" ? "bg-violet text-white" : "text-textMuted hover:text-textPrimary"
          }`}
        >
          Créer un compte
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "register" && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm text-textMuted">Votre nom</span>
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="ex: Marie Dupont"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-textPrimary placeholder:text-textMuted/50 focus:border-violet focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-textMuted">Nom de votre entreprise</span>
              <input
                type="text"
                value={nomEntreprise}
                onChange={(e) => setNomEntreprise(e.target.value)}
                placeholder="ex: Cabinet Dupont"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-textPrimary placeholder:text-textMuted/50 focus:border-violet focus:outline-none"
              />
            </label>
          </>
        )}

        <label className="block">
          <span className="mb-1 block text-sm text-textMuted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@exemple.fr"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-textPrimary placeholder:text-textMuted/50 focus:border-violet focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-textMuted">Mot de passe</span>
          <input
            type="password"
            required
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-textPrimary placeholder:text-textMuted/50 focus:border-violet focus:outline-none"
          />
          {mode === "register" && (
            <p className="mt-1 text-[11px] text-textMuted">8 caractères minimum</p>
          )}
        </label>

        {error && (
          <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet py-3 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
        >
          {loading
            ? mode === "login" ? "Connexion…" : "Création du compte…"
            : mode === "login" ? "Se connecter" : "Créer mon espace CRM"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <div className="flex-1 border-t border-line" />
        <span className="text-xs text-textMuted">ou</span>
        <div className="flex-1 border-t border-line" />
      </div>

      <button
        onClick={handleGoogleClick}
        disabled={googleLoading}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-line bg-surface py-3 text-sm font-medium text-textPrimary hover:border-violet/40 disabled:opacity-50 transition"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        {googleLoading ? "Connexion Google…" : "Continuer avec Google"}
      </button>

      <p className="mt-6 text-center text-[11px] text-textMuted">
        Besoin d'aide ?{" "}
        <a href="mailto:matthieu.piednoir@mutatech.fr" className="text-violet">
          Contactez-nous
        </a>
      </p>
    </div>
  );
}

// Page racine — enveloppe le formulaire dans <Suspense> pour satisfaire
// Next.js 14 qui exige un boundary autour de useSearchParams().
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Suspense fallback={
        <div className="text-sm text-textMuted">Chargement…</div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}
