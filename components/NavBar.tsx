"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getGoogleStatus, urlConnexionGoogle } from "@/lib/api";

const ONGLETS = [
  { href: "/clients", label: "Clients" },
  { href: "/devis", label: "Devis" },
  { href: "/factures", label: "Factures" },
  { href: "/taches", label: "Tâches" },
  { href: "/prospects", label: "Prospects" },
];

export default function NavBar() {
  return (
    <Suspense fallback={null}>
      <NavBarInterieur />
    </Suspense>
  );
}

function NavBarInterieur() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [googleConnecte, setGoogleConnecte] = useState<boolean | null>(null);

  useEffect(() => {
    getGoogleStatus()
      .then((s) => setGoogleConnecte(s.connecte))
      .catch(() => setGoogleConnecte(false));
  }, [searchParams]);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <span className="font-display text-sm font-bold text-teal">
            Mutatech / CRM
          </span>
          <nav className="flex flex-wrap gap-4">
            {ONGLETS.map((onglet) => (
              <Link
                key={onglet.href}
                href={onglet.href}
                className={`text-sm font-medium transition ${
                  pathname.startsWith(onglet.href)
                    ? "text-violet"
                    : "text-textMuted hover:text-textPrimary"
                }`}
              >
                {onglet.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {googleConnecte === false && (
            <a
              href={urlConnexionGoogle()}
              className="rounded-lg bg-violet px-3 py-1.5 text-xs font-medium text-white hover:bg-violet/90"
            >
              Connecter Google
            </a>
          )}
          {googleConnecte === true && (
            <span className="flex items-center gap-1.5 text-xs text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Google
              connecté
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-textMuted hover:text-amber"
          >
            Se déconnecter
          </button>
        </div>
      </div>
      {searchParams.get("google") === "connecte" && (
        <div className="bg-teal/10 px-4 py-2 text-center text-xs text-teal">
          ✓ Google connecté avec succès — Drive et Gmail sont actifs.
        </div>
      )}
    </header>
  );
}
