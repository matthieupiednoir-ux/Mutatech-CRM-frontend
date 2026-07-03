import {
  Client, ClientInput,
  Devis, DevisInput, DevisPublic,
  Facture, FactureInput,
  GoogleStatus, Ligne,
  Tache, TacheInput,
  Prospect, ProspectInput,
  Depense, DepenseInput,
  MoisAbonnement, RecapEcheances,
  AuthResponse, UserMe, TenantConfig,
} from "./types";
import { getToken, sauvegarderAuth, sauvegarderConfig, deconnecter } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {}

async function requete<T>(chemin: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${chemin}`, { ...options, headers });

  // Token expiré → déconnexion automatique et redirection vers login
  if (res.status === 401 && typeof window !== "undefined" && !chemin.includes("/auth/crm/")) {
    deconnecter();
    window.location.href = "/login";
    throw new ApiError("Session expirée.");
  }

  if (!res.ok) {
    const corps = await res.text();
    throw new ApiError(corps || `Erreur ${res.status}`);
  }
  return res.json();
}

// --- Auth CRM (multi-tenant) ---
export const registerCrm = async (data: {
  email: string;
  mot_de_passe: string;
  nom?: string;
  nom_entreprise?: string;
}): Promise<AuthResponse> => {
  const auth = await requete<AuthResponse>("/api/auth/crm/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
  sauvegarderAuth(auth);
  return auth;
};

export const loginCrm = async (data: {
  email: string;
  mot_de_passe: string;
}): Promise<AuthResponse> => {
  const auth = await requete<AuthResponse>("/api/auth/crm/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
  sauvegarderAuth(auth);
  return auth;
};

export const loginGoogle = async (id_token: string): Promise<AuthResponse> => {
  const auth = await requete<AuthResponse>("/api/auth/crm/google", {
    method: "POST",
    body: JSON.stringify({ id_token }),
  });
  sauvegarderAuth(auth);
  return auth;
};

export const getMe = () => requete<UserMe>("/api/auth/crm/me");

export const getTenantConfig = async (): Promise<TenantConfig> => {
  const config = await requete<TenantConfig>("/api/auth/crm/config");
  sauvegarderConfig(config);
  return config;
};

export const updateTenantConfig = (data: Partial<TenantConfig>) =>
  requete<TenantConfig>("/api/auth/crm/config", {
    method: "PUT",
    body: JSON.stringify(data),
  });

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
export const modifierDevis = (id: string, data: DevisInput) =>
  requete<Devis>(`/api/devis/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const envoyerDevisPourSignature = (id: string) =>
  requete<Devis>(`/api/devis/${id}/envoyer`, { method: "POST" });
export const supprimerDevis = (id: string) =>
  requete<{ statut: string }>(`/api/devis/${id}`, { method: "DELETE" });
export const getAbonnementSuivi = (devisId: string) =>
  requete<MoisAbonnement[]>(`/api/devis/${devisId}/abonnement-suivi`);
export const genererFactureMois = (devisId: string) =>
  requete<Facture>(`/api/devis/${devisId}/generer-facture-mois`, { method: "POST" });

// --- Signature publique ---
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
export const modifierFacture = (id: string, data: FactureInput) =>
  requete<Facture>(`/api/factures/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const envoyerFacture = (id: string) =>
  requete<Facture>(`/api/factures/${id}/envoyer`, { method: "POST" });
export const marquerFacturePayee = (id: string) =>
  requete<Facture>(`/api/factures/${id}/marquer-payee`, { method: "POST" });
export const relancerFacture = (id: string) =>
  requete<Facture>(`/api/factures/${id}/relancer`, { method: "POST" });
export const supprimerFacture = (id: string) =>
  requete<{ statut: string }>(`/api/factures/${id}`, { method: "DELETE" });
export const getEcheances = () => requete<RecapEcheances>("/api/factures/echeances");

// --- Google (Matthieu) ---
export const getGoogleStatus = () => requete<GoogleStatus>("/api/auth/google/status");
export const urlConnexionGoogle = () => `${API_URL}/api/auth/google/login`;

// --- Tâches ---
export const getTaches = () => requete<Tache[]>("/api/taches");
export const creerTache = (data: TacheInput) =>
  requete<Tache>("/api/taches", { method: "POST", body: JSON.stringify(data) });
export const modifierTache = (id: string, data: TacheInput) =>
  requete<Tache>(`/api/taches/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerTache = (id: string) =>
  requete<{ statut: string }>(`/api/taches/${id}`, { method: "DELETE" });
export const importerTachesLot = (data: TacheInput[]) =>
  requete<Tache[]>("/api/taches/import-lot", { method: "POST", body: JSON.stringify(data) });

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
    `/api/prospects/${id}/convertir-en-client`, { method: "POST" }
  );
export const importerProspectsLot = (data: ProspectInput[]) =>
  requete<Prospect[]>("/api/prospects/import-lot", { method: "POST", body: JSON.stringify(data) });

// --- Dépenses ---
export const getDepenses = () => requete<Depense[]>("/api/depenses");
export const creerDepense = (data: DepenseInput) =>
  requete<Depense>("/api/depenses", { method: "POST", body: JSON.stringify(data) });
export const modifierDepense = (id: string, data: DepenseInput) =>
  requete<Depense>(`/api/depenses/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerDepense = (id: string) =>
  requete<{ statut: string }>(`/api/depenses/${id}`, { method: "DELETE" });

// --- Agent IA ---
export interface AgentChatResponse { reply: string; actions_effectuees: string[]; }
export interface AgentMessageHistorique {
  role: string; content: string; actions_effectuees: string[]; cree_le: string;
}
export const chatAgent = (message: string, history: { role: string; content: string }[]) =>
  requete<AgentChatResponse>("/api/agent/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
export const getAgentHistorique = () =>
  requete<AgentMessageHistorique[]>("/api/agent/history");
export const effacerAgentHistorique = () =>
  requete<{ statut: string }>("/api/agent/history", { method: "DELETE" });

// --- Aide calcul ---
export function calculerTotaux(lignes: Ligne[], tauxTva: number) {
  const totalHt = lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0);
  const totalTva = totalHt * (tauxTva / 100);
  return { totalHt, totalTva, totalTtc: totalHt + totalTva };
}
