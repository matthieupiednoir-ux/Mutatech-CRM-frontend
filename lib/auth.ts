// lib/auth.ts
// Gestion du token JWT côté client (localStorage + cookie marqueur).
//
// Le cookie "mutatech_crm_has_token" est un marqueur léger (pas le JWT
// lui-même) que le middleware Next.js peut lire côté Edge Runtime pour
// protéger les routes sans exposer le token dans les cookies.
// La validation réelle du JWT reste exclusivement côté backend FastAPI.

import { AuthResponse, TenantConfig } from "./types";

const TOKEN_KEY = "mutatech_crm_token";
const USER_KEY = "mutatech_crm_user";
const CONFIG_KEY = "mutatech_tenant_config";
const COOKIE_PRESENCE = "mutatech_crm_has_token";

function poserCookieMarqueur(): void {
  if (typeof document === "undefined") return;
  // Cookie de session (expire à la fermeture du navigateur), SameSite=Strict
  document.cookie = `${COOKIE_PRESENCE}=1; path=/; SameSite=Strict`;
}

function supprimerCookieMarqueur(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_PRESENCE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
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
      nom: auth.nom,
      email: auth.email,
    })
  );
  poserCookieMarqueur();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): Omit<AuthResponse, "access_token" | "token_type"> | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function estConnecte(): boolean {
  return !!getToken();
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
    primaire: config?.couleur_primaire || "#6C63FF",
    secondaire: config?.couleur_secondaire || "#00D4AA",
  };
}

// Applique les couleurs du tenant comme CSS custom properties sur <html>
// — appelé au montage du layout racine après chargement de la config.
export function appliquerCouleursTenant(): void {
  if (typeof window === "undefined") return;
  const { primaire, secondaire } = getCouleurs();
  document.documentElement.style.setProperty("--color-accent", primaire);
  document.documentElement.style.setProperty("--color-accent2", secondaire);
}
