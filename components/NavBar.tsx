"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getGoogleStatus, urlConnexionGoogle } from "@/lib/api";
import { deconnecter, getUser } from "@/lib/auth";

const ONGLETS_CRM = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/devis", label: "Devis" },
  { href: "/factures", label: "Factures" },
  { href: "/depenses", label: "Dépenses" },
  { href: "/taches", label: "Tâches" },
  { href: "/prospects", label: "Prospects" },
  { href: "/comptabilite", label: "Comptabilité" },
  { href: "/agent", label: "Agent IA" },
];

const ONGLETS_IDEL = [
  { href: "/idel", label: "Pipeline" },
  { href: "/idel/comptabilite", label: "Trésorerie" },
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
  const user = getUser();

  const produit = user?.produit || "crm";
  const estIdel = pathname.startsWith("/idel");
  const aAccesCrm = produit === "crm" || produit === "crm+idel";
  const aAccesIdel = produit === "idel" || produit === "crm+idel";
  const onglets = estIdel ? ONGLETS_IDEL : ONGLETS_CRM;
  const labelProduit = estIdel ? "Mutatech / IDEL 🩺" : "Mutatech / CRM 🧭";

  useEffect(() => {
    // Ne charger Google status que sur les pages CRM (pas IDEL)
    if (!estIdel) {
      getGoogleStatus()
        .then((s) => setGoogleConnecte(s.connecte))
        .catch(() => setGoogleConnecte(false));
    }
  }, [searchParams, estIdel]);

  function handleLogout() {
    deconnecter();
    router.push("/login");
  }

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <span className={`font-display text-sm font-bold ${estIdel ? "text-teal" : "text-teal"}`}>
            {labelProduit}
          </span>
          <nav className="flex flex-wrap gap-4">
            {onglets.map((onglet) => (
              <Link
                key={onglet.href}
                href={onglet.href}
                className={`text-sm font-medium transition ${
                  pathname === onglet.href || (onglet.href !== "/idel" && pathname.startsWith(onglet.href))
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
          {/* Switcher CRM ↔ IDEL pour les comptes crm+idel */}
          {produit === "crm+idel" && (
            <Link
              href={estIdel ? "/dashboard" : "/idel"}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-textMuted hover:border-violet hover:text-textPrimary transition"
            >
              {estIdel ? "← CRM" : "IDEL 🩺"}
            </Link>
          )}

          {/* Lien vers l'espace IDEL pour les comptes idel seul */}
          {produit === "idel" && !estIdel && (
            <Link href="/idel" className="text-xs text-teal hover:underline">
              Espace IDEL →
            </Link>
          )}

          {/* Google status (CRM seulement) */}
          {!estIdel && googleConnecte === false && (
            <a
              href={urlConnexionGoogle()}
              className="rounded-lg bg-violet px-3 py-1.5 text-xs font-medium text-white hover:bg-violet/90"
            >
              Connecter Google
            </a>
          )}
          {!estIdel && googleConnecte === true && (
            <span className="flex items-center gap-1.5 text-xs text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Google connecté
            </span>
          )}

          {user?.email && (
            <span className="text-xs text-textMuted">{user.email}</span>
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
