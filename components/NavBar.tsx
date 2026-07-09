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
  { href: "/idel/patients", label: "Patients" },
  { href: "/idel/comptabilite", label: "Trésorerie" },
  { href: "/idel/parametres", label: "Paramètres" },
];

const ONGLETS_ADMIN = [
  { href: "/admin", label: "Clients SaaS" },
  { href: "/admin/organisations", label: "Organisations & Modules" },
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
  const estAdmin = pathname.startsWith("/admin");
  const aAccesCrm = produit === "crm" || produit === "crm+idel";
  const aAccesIdel = produit === "idel" || produit === "crm+idel";
  const estRoleAdmin = user?.role === "admin" || user?.role === "owner";

  const onglets = estAdmin ? ONGLETS_ADMIN : estIdel ? ONGLETS_IDEL : ONGLETS_CRM;
  const labelProduit = estAdmin
    ? "Mutatech / Admin ⚙"
    : estIdel
    ? "Mutatech / IDEL 🩺"
    : "Mutatech / CRM 🧭";

  useEffect(() => {
    if (!estIdel && !estAdmin) {
      getGoogleStatus()
        .then((s) => setGoogleConnecte(s.connecte))
        .catch(() => setGoogleConnecte(false));
    }
  }, [searchParams, estIdel, estAdmin]);

  function handleLogout() {
    deconnecter();
    router.push("/login");
  }

  // Détermine si un onglet est actif
  function isActive(href: string): boolean {
    if (href === "/idel") return pathname === "/idel";
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center gap-6">
          <span className="font-display text-sm font-bold text-teal">
            {labelProduit}
          </span>

          <nav className="flex flex-wrap gap-4">
            {onglets.map((onglet) => (
              <Link
                key={onglet.href}
                href={onglet.href}
                className={`text-sm font-medium transition ${
                  isActive(onglet.href)
                    ? "text-violet"
                    : "text-textMuted hover:text-textPrimary"
                }`}
              >
                {onglet.label}
              </Link>
            ))}
          </nav>

          {estAdmin && (
            <Link href="/dashboard" className="text-sm text-textMuted hover:text-textPrimary">
              ← Retour au CRM
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Switcher CRM ↔ IDEL */}
          {produit === "crm+idel" && !estAdmin && (
            <Link
              href={estIdel ? "/dashboard" : "/idel"}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-textMuted hover:border-violet hover:text-textPrimary transition"
            >
              {estIdel ? "← CRM" : "IDEL 🩺"}
            </Link>
          )}

          {estRoleAdmin && !estAdmin && (
            <Link
              href="/admin"
              className="rounded-lg border border-violet/30 bg-violet/5 px-3 py-1.5 text-xs font-medium text-violet hover:bg-violet/10 transition"
            >
              ⚙ Admin
            </Link>
          )}

          {!estIdel && !estAdmin && googleConnecte === false && (
            <a
              href={urlConnexionGoogle()}
              className="rounded-lg bg-violet px-3 py-1.5 text-xs font-medium text-white hover:bg-violet/90"
            >
              Connecter Google
            </a>
          )}
          {!estIdel && !estAdmin && googleConnecte === true && (
            <span className="flex items-center gap-1.5 text-xs text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Google connecté
            </span>
          )}

          {user?.email && (
            <span className="hidden text-xs text-textMuted sm:block">{user.email}</span>
          )}

          <button
            onClick={handleLogout}
            className="text-xs text-textMuted hover:text-amber transition"
          >
            Déconnexion
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
