"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginCrm, loginGoogle, getTenantConfig, ApiError } from "@/lib/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: object) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

async function chargerConfigEtRediriger(produit?: string) {
  try { await getTenantConfig(); } catch {}
  const p = produit ?? "";
  if (p === "idel") {
    window.location.href = "/idel";
  } else if (p === "crm_idel") {
    window.location.href = "/choix-produit";
  } else {
    window.location.href = "/dashboard";
  }
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [googlePret, setGooglePret] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: { credential: string }) => {
          setChargement(true);
          setErreur(null);
          try {
            const auth = await loginGoogle(response.credential);
            await chargerConfigEtRediriger(auth.produit);
          } catch (e) {
            setErreur(e instanceof ApiError ? e.message : "Erreur de connexion Google.");
            setChargement(false);
          }
        },
      });
      const btn = document.getElementById("google-btn");
      if (btn) {
        window.google.accounts.id.renderButton(btn, {
          theme: "filled_black",
          size: "large",
          width: 320,
          text: "signin_with",
        });
      }
      setGooglePret(true);
    };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, [googleClientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChargement(true);
    setErreur(null);
    try {
      const auth = await loginCrm({ email, mot_de_passe: motDePasse });
      await chargerConfigEtRediriger(auth.produit);
    } catch (e) {
      let msg = "Email ou mot de passe incorrect.";
      if (e instanceof ApiError) {
        try {
          const parsed = JSON.parse(e.message);
          msg = parsed.detail ?? e.message;
        } catch {
          msg = e.message;
        }
      }
      setErreur(msg);
      setChargement(false);
    }
  }

  const next = searchParams.get("next") || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <a href="https://mutatech.fr" className="inline-flex items-center gap-2 font-display text-2xl font-bold text-textPrimary">
            <img src="/mutatech-logo.png" alt="Mutatech" className="h-8 w-8 object-contain" />
            Muta<span className="text-violet">tech</span>
          </a>
          <p className="mt-2 text-sm text-textMuted">Connexion à votre espace</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-6">
          {erreur && (
            <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">{erreur}</p>
          )}

          <label className="block">
            <span className="mb-1 block text-sm text-textMuted">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2.5 text-textPrimary placeholder:text-textMuted/60 focus:border-violet focus:outline-none"
              placeholder="vous@mutatech.fr"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-textMuted">Mot de passe</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2.5 text-textPrimary focus:border-violet focus:outline-none"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={chargement}
            className="w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white hover:bg-violet/90 disabled:opacity-50"
          >
            {chargement ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {/* Google */}
        {googleClientId && (
          <div className="space-y-3 text-center">
            <p className="text-xs text-textMuted">ou</p>
            <div id="google-btn" className="flex justify-center" />
            {!googlePret && (
              <p className="text-xs text-textMuted">Chargement de la connexion Google…</p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-textMuted">
          Pas encore de compte ?{" "}
          <a href="mailto:matthieu.piednoir@mutatech.fr" className="text-violet hover:underline">
            Contactez Mutatech
          </a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-bg text-textMuted text-sm">Chargement…</div>}>
      <LoginForm />
    </Suspense>
  );
}
