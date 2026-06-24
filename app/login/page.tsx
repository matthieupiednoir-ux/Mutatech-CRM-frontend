"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code)) {
      setError("Entre les 6 chiffres du code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (data.valid) {
        router.push("/");
        router.refresh();
      } else {
        setError("Code incorrect. Réessaie.");
        setCode("");
      }
    } catch {
      setError("Erreur de connexion. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface text-2xl">
        🔒
      </div>
      <h1 className="font-display text-2xl font-bold text-textPrimary">
        Espace Collaborateur
      </h1>
      <p className="mb-8 mt-3 max-w-sm text-sm text-textMuted">
        Entre le code à 6 chiffres affiché dans Google Authenticator.
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col items-center gap-4"
      >
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          autoComplete="one-time-code"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="000000"
          className="w-full rounded-xl border-2 border-line bg-surface px-4 py-4 text-center font-mono text-3xl font-bold tracking-[0.3em] text-textPrimary focus:border-violet focus:outline-none"
        />
        <p className="min-h-[18px] text-sm text-amber">{error}</p>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet px-6 py-3 font-display font-medium text-white transition hover:bg-violet/90 disabled:opacity-50"
        >
          {loading ? "Vérification…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
