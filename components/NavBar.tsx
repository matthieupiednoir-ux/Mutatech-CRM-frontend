"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { getGoogleStatus, urlConnexionGoogle, monOrganisation, getTenantConfig } from "@/lib/api";
import { deconnecter, getUser } from "@/lib/auth";
import FallingPetals from "@/components/FallingPetals";
import { saisonActuelle } from "@/lib/saison";

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
  { id: "planning", href: "/planning", label: "Planning" },
  { id: "journal", href: "/journal", label: "Journal" },
  { id: "corbeille", href: "/corbeille", label: "Corbeille" },
  { id: "agent", href: "/agent", label: "Agent IA" },
];
// Onglet a part (pas dans ONGLETS_CRM) : visible selon permission, mais
// jamais masquable via /parametres -- ce n'est pas une preference
// d'affichage personnelle, c'est une question de droit d'acces (gerer
// l'equipe), donc elle ne doit pas dependre du choix d'affichage d'un
// utilisateur non-owner.
const ONGLET_EQUIPE_CLIENT = { id: "equipe", href: "/equipe", label: "Mon équipe" };
// Formation IA (abonnement) : toujours visible -- la page elle-meme
// explique comment obtenir l'acces, le backend filtre le contenu.
const ONGLET_FORMATION = { id: "formation", href: "/formation", label: "Formation" };

const ONGLETS_IDEL_BASE = [
  { id: "accueil", href: "/idel/accueil", label: "Accueil" },
  { id: "pipeline", href: "/idel", label: "Pipeline" },
  { id: "patients", href: "/idel/patients", label: "Patients" },
  { id: "comptabilite", href: "/idel/comptabilite", label: "Trésorerie" },
  { id: "catalogue", href: "/idel/catalogue", label: "Catalogue" },
  { id: "planning", href: "/idel/planning", label: "Planning" },
  { id: "journal", href: "/idel/journal", label: "Journal" },
  { id: "remplacements", href: "/idel/remplacements", label: "Remplacements" },
  { id: "nova", href: "/idel/nova", label: "Nova" },
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
  { href: "/admin/outils", label: "Outils" },
  { href: "/formation", label: "Formation" },
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
    // Theme "Saison" (CRM uniquement) : la palette reelle depend d'un
    // second attribut, data-saison, recalcule a chaque chargement --
    // pas besoin de stocker la saison elle-meme cote backend, elle se
    // deduit toujours de la date du jour.
    if (theme === "saison") {
      document.body.dataset.saison = saisonActuelle();
    }
  }, [theme]);

  // Referme le menu mobile a chaque changement de page -- evite de
  // rester coince avec le menu ouvert apres avoir clique un lien.
  useEffect(() => {
    setMenuMobileOuvert(false);
  }, [pathname]);

  const ongletsIdelBaseFiltres = ONGLETS_IDEL_BASE.filter(
    (o) => o.id === "accueil" || o.id === "pipeline" || o.id === "nova" || !ongletsMasques.has(o.id)
  );
  const ongletsIdel = [
    ...ongletsIdelBaseFiltres,
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
        ...(peutGererEquipe ? [ONGLET_EQUIPE_CLIENT] : []),
        ONGLET_FORMATION,
        { id: "parametres", href: "/parametres", label: "Paramètres" },
      ];
  const labelProduit = estAdmin ? "Admin" : estIdel ? "IDEL · PSDM" : "CRM";
  const initiales = (user?.nom || user?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase())
    .join("");

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
        .then((org) => {
          setModulesActifs(org.modules_actifs);
          // Theme IDEL propre a l'organisation (Nova/Clinique/Serenite) --
          // meme mecanisme que le theme CRM, juste une source differente
          // (Organization.theme plutot que TenantConfig.theme).
          setTheme(org.theme || "defaut");
          const liste = (org.onglets_masques || "").split(",").map((s) => s.trim()).filter(Boolean);
          setOngletsMasques(new Set(liste));
        })
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
      <header className="sticky top-0 z-30 border-b border-line bg-ink/85 backdrop-blur-md supports-[backdrop-filter]:bg-ink/70">
        <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={estIdel ? "/idel/accueil" : estAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
              <img src="/mutatech-logo.svg" alt="" aria-hidden="true" width={18} height={24} className="h-6 w-[18px]" />
              <span className="font-display text-[15px] font-semibold tracking-tight text-textPrimary">Mutatech</span>
            </Link>
            <span
              className="rounded-md px-2 py-0.5 text-[11px] font-medium"
              style={{ color: "var(--accent)", backgroundColor: "var(--accent-soft, transparent)" }}
            >
              {labelProduit}
            </span>
            {estAdmin && (
              <Link href="/dashboard" className="hidden text-sm text-textMuted hover:text-textPrimary sm:block">
                ← Retour au CRM
              </Link>
            )}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            {/* Switcher CRM ↔ IDEL */}
            {produit === "crm+idel" && !estAdmin && (
              <Link
                href={estIdel ? "/dashboard" : "/idel/accueil"}
                className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-textMuted hover:border-textMuted/40 hover:text-textPrimary"
              >
                {estIdel ? "Aller au CRM" : "Aller à l'espace IDEL"}
              </Link>
            )}

            {estRoleAdmin && !estAdmin && (
              <Link
                href="/admin"
                className="rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-textMuted hover:border-textMuted/40 hover:text-textPrimary"
              >
                Admin
              </Link>
            )}

            {!estIdel && !estAdmin && googleConnecte === false && (
              <a
                href={urlConnexionGoogle()}
                className="rounded-md bg-violet px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet/90"
              >
                Connecter Google
              </a>
            )}
            {!estIdel && !estAdmin && googleConnecte === true && (
              <span className="hidden items-center gap-1.5 px-1 text-xs text-textMuted lg:flex" title="Drive et Gmail sont actifs">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Google
              </span>
            )}

            <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />

            {user?.email && (
              <span className="flex items-center gap-2" title={user.email}>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surfaceAlt text-[11px] font-semibold text-textPrimary ring-1 ring-line">
                  {initiales}
                </span>
                <span className="hidden max-w-[200px] truncate text-xs text-textMuted lg:block">{user.email}</span>
              </span>
            )}

            <button
              onClick={handleLogout}
              className="rounded-md px-2 py-1.5 text-xs text-textMuted hover:bg-surfaceAlt hover:text-textPrimary"
            >
              Déconnexion
            </button>
          </div>

          {/* Bouton menu -- visible uniquement sur petit ecran (sm:hidden) */}
          <button
            onClick={() => setMenuMobileOuvert((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-textMuted sm:hidden"
            aria-label={menuMobileOuvert ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuMobileOuvert}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {menuMobileOuvert ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {/* Onglets : une seule ligne, defilement horizontal si l'ecran est
            trop etroit (plutot que de passer sur deux lignes). L'onglet
            actif est souligne par l'accent du mode. */}
        <nav className="nav-onglets hidden overflow-x-auto px-2 sm:flex sm:px-4" aria-label="Navigation principale">
          {onglets.map((onglet) => {
            const actif = isActive(onglet.href);
            return (
              <Link
                key={onglet.href}
                href={onglet.href}
                aria-current={actif ? "page" : undefined}
                className={`relative shrink-0 whitespace-nowrap px-3 py-2.5 text-[13px] font-medium ${
                  actif ? "text-textPrimary" : "text-textMuted hover:text-textPrimary"
                }`}
              >
                {onglet.label}
                {actif && (
                  <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Panneau mobile -- liste complete des onglets et actions du
            compte, affichee uniquement quand le menu est ouvert. */}
        {menuMobileOuvert && (
          <nav className="max-h-[calc(100vh-3.5rem)] overflow-y-auto border-t border-line bg-ink px-3 py-3 sm:hidden" aria-label="Navigation principale">
            <div className="grid grid-cols-2 gap-1">
              {onglets.map((onglet) => {
                const actif = isActive(onglet.href);
                return (
                  <Link
                    key={onglet.href}
                    href={onglet.href}
                    aria-current={actif ? "page" : undefined}
                    className={`rounded-md px-3 py-2.5 text-sm font-medium ${actif ? "" : "text-textMuted hover:bg-surfaceAlt hover:text-textPrimary"}`}
                    style={actif ? { color: "var(--accent)", backgroundColor: "var(--accent-soft, transparent)" } : undefined}
                  >
                    {onglet.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
              {produit === "crm+idel" && !estAdmin && (
                <Link href={estIdel ? "/dashboard" : "/idel/accueil"} className="rounded-md px-3 py-2.5 text-sm text-textMuted hover:bg-surfaceAlt hover:text-textPrimary">
                  {estIdel ? "Aller au CRM" : "Aller à l'espace IDEL"}
                </Link>
              )}
              {estRoleAdmin && !estAdmin && (
                <Link href="/admin" className="rounded-md px-3 py-2.5 text-sm text-textMuted hover:bg-surfaceAlt hover:text-textPrimary">
                  Admin
                </Link>
              )}
              {estAdmin && (
                <Link href="/dashboard" className="rounded-md px-3 py-2.5 text-sm text-textMuted hover:bg-surfaceAlt hover:text-textPrimary">
                  ← Retour au CRM
                </Link>
              )}
              {!estIdel && !estAdmin && googleConnecte === false && (
                <a href={urlConnexionGoogle()} className="rounded-md px-3 py-2.5 text-sm text-textMuted hover:bg-surfaceAlt hover:text-textPrimary">
                  Connecter Google
                </a>
              )}
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="truncate text-xs text-textMuted">{user?.email}</span>
                <button onClick={handleLogout} className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                  Déconnexion
                </button>
              </div>
            </div>
          </nav>
        )}

        {searchParams.get("google") === "connecte" && (
          <div className="border-t border-line bg-teal/10 px-4 py-2 text-center text-xs text-teal">
            ✓ Google connecté avec succès — Drive et Gmail sont actifs.
          </div>
        )}
      </header>
    </>
  );
}
