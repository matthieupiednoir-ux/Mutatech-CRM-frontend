"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getGoogleStatus, urlConnexionGoogle, monOrganisation, getTenantConfig } from "@/lib/api";
import { deconnecter, getUser } from "@/lib/auth";
import FallingPetals from "@/components/FallingPetals";

const ONGLETS_CRM = [
  { id: "dashboard", href: "/dashboard", label: "Dashboard" },
  { id: "clients", href: "/clients", label: "Clients" },
  { id: "devis", href: "/devis", label: "Devis" },
  { id: "factures", href: "/factures", label: "Factures" },
  { id: "depenses", href: "/depenses", label: "Dépenses" },
  { id: "taches", href: "/taches", label: "Tâches" },
  { id: "prospects", href: "/prospects", label: "Prospects" },
  { id: "comptabilite", href: "/comptabilite", label: "Comptabilité" },
  { id: "catalogue", href: "/catalogue", label: "Catalogue" },
  { id: "agent", href: "/agent", label: "Agent IA" },
];
// Onglets a part (pas dans ONGLETS_CRM) : visibles pour tous ou selon
// permission, mais jamais masquables via /parametres (ce ne sont pas des
// preferences d'affichage comme les autres).
const ONGLET_EQUIPE_CLIENT = { id: "equipe", href: "/equipe", label: "Mon équipe" };
const ONGLET_PLANNING_CRM = { id: "planning", href: "/planning", label: "Planning" };
const ONGLET_JOURNAL_CRM = { id: "journal", href: "/journal", label: "Journal" };
const ONGLET_CORBEILLE_CRM = { id: "corbeille", href: "/corbeille", label: "🗑 Corbeille" };

const ONGLETS_IDEL_BASE = [
  { href: "/idel", label: "Pipeline" },
  { href: "/idel/patients", label: "Patients" },
  { href: "/idel/comptabilite", label: "Trésorerie" },
  { href: "/idel/catalogue", label: "Catalogue" },
  { href: "/idel/planning", label: "Planning" },
  { href: "/idel/journal", label: "Journal" },
  { href: "/idel/nova", label: "✨ Nova" },
];
const ONGLETS_MODULES: Record<string, { href: string; label: string }> = {
  tournees: { href: "/idel/tournees", label: "Tournées" },
  commandes_pharma: { href: "/idel/pharma", label: "Commandes" },
  ordonnances_vision: { href: "/idel/prescriptions", label: "Ordonnances" },
  agenda: { href: "/idel/agenda", label: "Agenda" },
};
const ONGLET_PARAMETRES = { href: "/idel/parametres", label: "Paramètres" };

const ONGLETS_ADMIN = [
  { href: "/admin", label: "Clients SaaS" },
  { href: "/admin/organisations", label: "Organisations & Modules" },
  { href: "/admin/equipe", label: "Équipe Mutatech" },
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
  const [modulesActifs, setModulesActifs] = useState<string[]>([]);
  const [ongletsMasques, setOngletsMasques] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState<string>("defaut");
  // Menu mobile : replie la liste d'onglets (desormais nombreuse -- 14+
  // avec Planning/Journal/Corbeille) derriere un bouton hamburger sur
  // petit ecran, pour eviter qu'elle s'empile verticalement sur toute la
  // hauteur de l'ecran avant meme d'atteindre le contenu de la page.
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const user = getUser();

  const produit = user?.produit || "crm";
  const estIdel = pathname.startsWith("/idel");
  const estAdmin = pathname.startsWith("/admin");
  const aAccesCrm = produit === "crm" || produit === "crm+idel";
  const aAccesIdel = produit === "idel" || produit === "crm+idel";
  const estRoleAdmin = user?.role === "admin" || user?.role === "owner";

  const mode = estAdmin ? "admin" : estIdel ? "idel" : "crm";

  // Pilote l'aura de fond (definie dans globals.css via body[data-mode])
  // -- violette cote CRM/Pixel, rose hi-tech cote IDEL-PSDM/Nova, ambre en admin.
  useEffect(() => {
    document.body.dataset.mode = mode;
  }, [mode]);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  // Referme le menu mobile a chaque changement de page -- evite de
  // rester coince avec le menu ouvert apres avoir clique un lien.
  useEffect(() => {
    setMenuMobileOuvert(false);
  }, [pathname]);

  const ongletsIdel = [
    ...ONGLETS_IDEL_BASE,
    ...modulesActifs.filter((m) => ONGLETS_MODULES[m]).map((m) => ONGLETS_MODULES[m]),
    ONGLET_PARAMETRES,
  ];
  const ongletsCrmFiltres = ONGLETS_CRM.filter(
    (o) => o.id === "dashboard" || o.id === "agent" || !ongletsMasques.has(o.id)
  );
  const peutGererEquipe = user?.role === "owner" || user?.role === "admin";
  const onglets = estAdmin
    ? ONGLETS_ADMIN
    : estIdel
    ? ongletsIdel
    : [
        ...ongletsCrmFiltres,
        ONGLET_PLANNING_CRM,
        ONGLET_JOURNAL_CRM,
        ONGLET_CORBEILLE_CRM,
        ...(peutGererEquipe ? [ONGLET_EQUIPE_CLIENT] : []),
        { id: "parametres", href: "/parametres", label: "⚙" },
      ];
  const labelProduit = estAdmin
    ? "Mutatech / Admin"
    : estIdel
    ? "Mutatech / IDEL · PSDM · Médical"
    : "Mutatech / CRM";
  const mascotteEmoji = estAdmin ? "⚙" : estIdel ? "🩺" : "🧭";

  useEffect(() => {
    if (!estIdel && !estAdmin) {
      getGoogleStatus()
        .then((s) => setGoogleConnecte(s.connecte))
        .catch(() => setGoogleConnecte(false));
      getTenantConfig()
        .then((config) => {
          const liste = (config.onglets_masques || "").split(",").map((s) => s.trim()).filter(Boolean);
          setOngletsMasques(new Set(liste));
          setTheme(config.theme || "defaut");
        })
        .catch(() => setOngletsMasques(new Set()));
    }
  }, [searchParams, estIdel, estAdmin]);

  useEffect(() => {
    if (estIdel) {
      monOrganisation()
        .then((org) => setModulesActifs(org.modules_actifs))
        .catch(() => setModulesActifs([]));
    }
  }, [estIdel]);

  function handleLogout() {
    deconnecter();
    router.push("/login");
  }

  function isActive(href: string): boolean {
    if (href === "/idel") return pathname === "/idel";
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <>
      {!estIdel && !estAdmin && theme === "sakura" && <FallingPetals />}
      <header
        className="relative border-b border-line"
        style={{ borderBottomColor: "var(--accent-soft, #2A2A4A)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 font-display text-sm font-bold text-[var(--accent)]">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: "var(--accent)",
                  boxShadow: "0 0 8px 1px var(--accent)",
                }}
              />
              {labelProduit}
              <span className="text-xs opacity-70">{mascotteEmoji}</span>
            </span>

            {/* Bouton hamburger -- visible uniquement sur petit ecran (sm:hidden) */}
            <button
              onClick={() => setMenuMobileOuvert((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-textMuted sm:hidden"
              aria-label="Ouvrir le menu"
              aria-expanded={menuMobileOuvert}
            >
              {menuMobileOuvert ? "✕" : "☰"}
            </button>

            {/* Navigation desktop -- masquee sur petit ecran, la liste
                complete apparait sinon en un seul bloc replie tres haut. */}
            <nav className="hidden flex-wrap gap-4 sm:flex">
              {onglets.map((onglet) => (
                <Link
                  key={onglet.href}
                  href={onglet.href}
                  className="text-sm font-medium transition text-textMuted hover:text-textPrimary"
                  style={isActive(onglet.href) ? { color: "var(--accent)" } : undefined}
                >
                  {onglet.label}
                </Link>
              ))}
            </nav>

            {estAdmin && (
              <Link href="/dashboard" className="hidden text-sm text-textMuted hover:text-textPrimary sm:block">
                ← Retour au CRM
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Switcher CRM ↔ IDEL */}
            {produit === "crm+idel" && !estAdmin && (
              <Link
                href={estIdel ? "/dashboard" : "/idel"}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-textMuted transition hover:text-textPrimary"
                style={{ borderColor: "var(--accent-soft, #2A2A4A)" }}
              >
                {estIdel ? "← CRM" : "IDEL/PSDM 🩺"}
              </Link>
            )}

            {estRoleAdmin && !estAdmin && (
              <Link
                href="/admin"
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition"
                style={{
                  borderColor: "var(--accent-soft, #2A2A4A)",
                  backgroundColor: "var(--accent-soft, transparent)",
                  color: "var(--accent)",
                }}
              >
                ⚙ Admin
              </Link>
            )}

            {!estIdel && !estAdmin && googleConnecte === false && (
              <a
                href={urlConnexionGoogle()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                style={{ backgroundColor: "var(--accent)" }}
              >
                Connecter Google
              </a>
            )}
            {!estIdel && !estAdmin && googleConnecte === true && (
              <span className="hidden items-center gap-1.5 text-xs text-teal sm:flex">
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

        {/* Panneau mobile -- liste complete des onglets empilee, affichee
            uniquement quand le hamburger est ouvert (sm:hidden au niveau
            du bouton garantit que ce panneau n'existe que sur mobile). */}
        {menuMobileOuvert && (
          <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 sm:hidden">
            {onglets.map((onglet) => (
              <Link
                key={onglet.href}
                href={onglet.href}
                className="rounded-lg px-2 py-2 text-sm font-medium transition text-textMuted hover:bg-surface hover:text-textPrimary"
                style={isActive(onglet.href) ? { color: "var(--accent)" } : undefined}
              >
                {onglet.label}
              </Link>
            ))}
            {estAdmin && (
              <Link href="/dashboard" className="rounded-lg px-2 py-2 text-sm text-textMuted hover:bg-surface hover:text-textPrimary">
                ← Retour au CRM
              </Link>
            )}
          </nav>
        )}

        {searchParams.get("google") === "connecte" && (
          <div className="bg-teal/10 px-4 py-2 text-center text-xs text-teal">
            ✓ Google connecté avec succès — Drive et Gmail sont actifs.
          </div>
        )}
      </header>
    </>
  );
}
