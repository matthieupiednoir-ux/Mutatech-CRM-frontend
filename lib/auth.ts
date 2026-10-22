// lib/auth.ts
// Gestion du token JWT côté client (localStorage + cookie marqueur).

import { AuthResponse, TenantConfig } from "./types";

const TOKEN_KEY = "mutatech_crm_token";
const USER_KEY = "mutatech_crm_user";
const CONFIG_KEY = "mutatech_tenant_config";
const COOKIE_PRESENCE = "mutatech_crm_has_token";

// Date d'expiration (secondes epoch) lue dans le JWT, sans le verifier :
// la signature reste controlee par les backends a chaque appel. Sert
// seulement a caler la duree du cookie marqueur et a ne pas garder un
// jeton perime.
function expirationJeton(token: string): number | null {
  try {
    const partie = token.split(".")[1];
    if (!partie) return null;
    const json = atob(partie.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

function jetonExpire(token: string): boolean {
  const exp = expirationJeton(token);
  return exp !== null && exp * 1000 <= Date.now();
}

// Le marqueur doit vivre aussi longtemps que le jeton : sans Max-Age c'etait
// un cookie de session, efface a la fermeture du navigateur ou de l'appli
// installee, et le middleware renvoyait alors vers /login alors que le
// jeton du localStorage etait encore valide.
function poserCookieMarqueur(token: string): void {
  if (typeof document === "undefined") return;
  const exp = expirationJeton(token);
  const maxAge = exp !== null ? Math.max(0, Math.floor(exp - Date.now() / 1000)) : 60 * 60 * 24;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_PRESENCE}=1; path=/; Max-Age=${maxAge}; SameSite=Strict${secure}`;
}

function supprimerCookieMarqueur(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_PRESENCE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
}

export interface UserSession {
  user_id?: string;
  tenant_id?: string | null;
  role?: string;
  produit: string;
  nom?: string | null;
  email?: string;
}

export function sauvegarderAuth(auth: AuthResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, auth.access_token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      user_id: auth.user_id,
      tenant_id: auth.tenant_id,
      role: auth.role,
      produit: auth.produit || "crm",
      nom: auth.nom,
      email: auth.email,
    } satisfies UserSession)
  );
  poserCookieMarqueur(auth.access_token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && jetonExpire(token)) {
    deconnecter();
    return null;
  }
  return token;
}

export function getUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

export function estConnecte(): boolean {
  return !!getToken();
}

// Session encore valide mais cookie marqueur absent (session ouverte avant
// ce correctif, cookie efface par le navigateur) : on le repose pour que
// le middleware laisse passer, au lieu de redemander la connexion.
export function restaurerSession(): boolean {
  const token = getToken();
  if (!token) return false;
  poserCookieMarqueur(token);
  return true;
}

export function getProduit(): string {
  return getUser()?.produit || "crm";
}

// Compte « formation » seule (client sans CRM ni IDEL) : seules ces pages
// lui sont utiles. Masquage cote interface uniquement, le backend repond
// 403 sur toutes les autres routes.
export const PRODUIT_FORMATION = "formation";
export const PAGES_FORMATION_SEULE = ["/formation", "/equipe", "/admin"];

export function estFormationSeule(): boolean {
  return getProduit() === PRODUIT_FORMATION;
}

export function deconnecter(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(CONFIG_KEY);
  supprimerCookieMarqueur();
}

export function sauvegarderConfig(config: TenantConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getConfig(): TenantConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getCouleurs(): { primaire: string; secondaire: string } {
  const config = getConfig();
  return {
    primaire: config?.couleur_primaire || config?.couleur_principale || "#6C63FF",
    secondaire: config?.couleur_secondaire || "#00D4AA",
  };
}

export function appliquerCouleursTenant(): void {
  if (typeof window === "undefined") return;
  const { primaire, secondaire } = getCouleurs();
  document.documentElement.style.setProperty("--color-accent", primaire);
  document.documentElement.style.setProperty("--color-accent2", secondaire);
}
