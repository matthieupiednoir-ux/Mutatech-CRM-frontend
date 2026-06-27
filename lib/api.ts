import {
  Client,
  ClientInput,
  Devis,
  DevisInput,
  DevisPublic,
  Facture,
  FactureInput,
  GoogleStatus,
  Ligne,
  Tache,
  TacheInput,
  Prospect,
  ProspectInput,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {}

async function requete<T>(
  chemin: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${chemin}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const corps = await res.text();
    throw new ApiError(corps || `Erreur ${res.status}`);
  }
  return res.json();
}

// --- Clients ---
export const getClients = () => requete<Client[]>("/api/clients");
export const getClient = (id: string) => requete<Client>(`/api/clients/${id}`);
export const creerClient = (data: ClientInput) =>
  requete<Client>("/api/clients", { method: "POST", body: JSON.stringify(data) });
export const modifierClient = (id: string, data: ClientInput) =>
  requete<Client>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerClient = (id: string) =>
  requete<{ statut: string }>(`/api/clients/${id}`, { method: "DELETE" });

// --- Devis ---
export const getDevisListe = () => requete<Devis[]>("/api/devis");
export const getDevis = (id: string) => requete<Devis>(`/api/devis/${id}`);
export const creerDevis = (data: DevisInput) =>
  requete<Devis>("/api/devis", { method: "POST", body: JSON.stringify(data) });
export const envoyerDevisPourSignature = (id: string) =>
  requete<Devis>(`/api/devis/${id}/envoyer`, { method: "POST" });

// --- Signature publique (token secret, pas d'auth TOTP) ---
export const getDevisPublic = (token: string) =>
  requete<DevisPublic>(`/api/devis/public/${token}`);
export const signerDevisPublic = (token: string, signatureImage: string) =>
  requete<DevisPublic>(`/api/devis/public/${token}/signer`, {
    method: "POST",
    body: JSON.stringify({ signature_image: signatureImage }),
  });

// --- Factures ---
export const getFacturesListe = () => requete<Facture[]>("/api/factures");
export const getFacture = (id: string) => requete<Facture>(`/api/factures/${id}`);
export const creerFacture = (data: FactureInput) =>
  requete<Facture>("/api/factures", { method: "POST", body: JSON.stringify(data) });
export const envoyerFacture = (id: string) =>
  requete<Facture>(`/api/factures/${id}/envoyer`, { method: "POST" });

// --- Google ---
export const getGoogleStatus = () =>
  requete<GoogleStatus>("/api/auth/google/status");
export const urlConnexionGoogle = () => `${API_URL}/api/auth/google/login`;

// --- Tâches ---
export const getTaches = () => requete<Tache[]>("/api/taches");
export const creerTache = (data: TacheInput) =>
  requete<Tache>("/api/taches", { method: "POST", body: JSON.stringify(data) });
export const modifierTache = (id: string, data: TacheInput) =>
  requete<Tache>(`/api/taches/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerTache = (id: string) =>
  requete<{ statut: string }>(`/api/taches/${id}`, { method: "DELETE" });

// --- Prospects ---
export const getProspects = () => requete<Prospect[]>("/api/prospects");
export const creerProspect = (data: ProspectInput) =>
  requete<Prospect>("/api/prospects", { method: "POST", body: JSON.stringify(data) });
export const modifierProspect = (id: string, data: ProspectInput) =>
  requete<Prospect>(`/api/prospects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerProspect = (id: string) =>
  requete<{ statut: string }>(`/api/prospects/${id}`, { method: "DELETE" });
export const convertirEnClient = (id: string) =>
  requete<{ statut: string; client_id: string }>(
    `/api/prospects/${id}/convertir-en-client`,
    { method: "POST" }
  );

// --- Aide calcul ---
export function calculerTotaux(lignes: Ligne[], tauxTva: number) {
  const totalHt = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
  const totalTva = totalHt * (tauxTva / 100);
  return { totalHt, totalTva, totalTtc: totalHt + totalTva };
}
