/**
 * middleware.ts
 * -------------
 * Protège toutes les routes du CRM avec le JWT stocké en localStorage.
 *
 * Attention : Next.js middleware s'exécute côté serveur Edge Runtime —
 * il n'a pas accès au localStorage. On vérifie donc la présence du token
 * via un cookie léger "mutatech_crm_has_token" posé par le client au
 * moment du login. Si ce cookie est absent, on redirige vers /login.
 *
 * La validation réelle du JWT reste côté backend FastAPI — le middleware
 * sert uniquement à éviter d'afficher la page un instant avant la
 * redirection (UX seulement, pas une garantie de sécurité).
 *
 * Routes publiques (pas de vérification) :
 *   /login         → page d'authentification
 *   /signer/*      → page de signature publique des devis (lien client)
 *   /api/*         → les appels API gèrent leur propre auth (JWT Bearer)
 */

import { NextRequest, NextResponse } from "next/server";

const ROUTES_PUBLIQUES = ["/login", "/signer"];
const COOKIE_PRESENCE = "mutatech_crm_has_token";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Laisser passer les routes publiques et les assets Next.js
  if (ROUTES_PUBLIQUES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Vérifier la présence du cookie marqueur
  const hasToken = request.cookies.get(COOKIE_PRESENCE)?.value === "1";

  if (!hasToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
