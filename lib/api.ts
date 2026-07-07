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
  CreerClientInput, ClientCreeOut,
  AgentMessage, AgentResponse,
  IdelOrdonnance, IdelPatient, CotationOut, CotationValidationItem, FicheReprise,
  IdelMe, IdelUpdateInput,
} from "./types";
import { getToken, sauvegarderAuth, sauvegarderConfig, deconnecter } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const IDEL_API_URL = process.env.NEXT_PUBLIC_IDEL_API_URL || "http://localhost:8001";

export class ApiError extends Error {}

async function requete<T>(
  chemin: string,
  options?: RequestInit,
  baseUrl: string = API_URL
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${baseUrl}${chemin}`, { ...options, headers });
  if (res.status === 401 && typeof window !== "undefined" && !chemin.includes("/auth/")) {
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

async function requeteIdelFormData<T>(chemin: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${IDEL_API_URL}${chemin}`, { method: "POST", headers, body: formData });
  if (!res.ok) {
    const corps = await res.text();
    throw new ApiError(corps || `Erreur ${res.status}`);
  }
  return res.json();
}

function requeteIdel<T>(chemin: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options?.headers as Record<string, string>) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!options?.body || typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }
  return fetch(`${IDEL_API_URL}${chemin}`, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      const corps = await res.text();
      throw new ApiError(corps || `Erreur ${res.status}`);
    }
    return res.json() as Promise<T>;
  });
}

// Comme requeteIdel, mais pour recuperer un fichier binaire (CSV, etc.) --
// necessaire car un <a href> classique ne peut pas transporter le header
// Authorization : le navigateur ferait alors une requete non authentifiee.
async function requeteIdelBlob(chemin: string): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${IDEL_API_URL}${chemin}`, { headers });
  if (!res.ok) {
    const corps = await res.text();
    throw new ApiError(corps || `Erreur ${res.status}`);
  }
  return res.blob();
}

// --- Auth CRM ---
export const registerCrm = async (data: { email: string; mot_de_passe: string; nom?: string; nom_entreprise?: string; produit?: string }): Promise<AuthResponse> => {
  const auth = await requete<AuthResponse>("/api/auth/crm/register", { method: "POST", body: JSON.stringify(data) });
  sauvegarderAuth(auth); return auth;
};
export const loginCrm = async (data: { email: string; mot_de_passe: string }): Promise<AuthResponse> => {
  const auth = await requete<AuthResponse>("/api/auth/crm/login", { method: "POST", body: JSON.stringify(data) });
  sauvegarderAuth(auth); return auth;
};
export const loginGoogle = async (id_token: string): Promise<AuthResponse> => {
  const auth = await requete<AuthResponse>("/api/auth/crm/google", { method: "POST", body: JSON.stringify({ id_token }) });
  sauvegarderAuth(auth); return auth;
};
export const getMe = () => requete<UserMe>("/api/auth/crm/me");
export const getTenantConfig = async (): Promise<TenantConfig> => {
  const config = await requete<TenantConfig>("/api/auth/crm/config");
  sauvegarderConfig(config); return config;
};
export const updateTenantConfig = (data: Partial<TenantConfig>) =>
  requete<TenantConfig>("/api/auth/crm/config", { method: "PUT", body: JSON.stringify(data) });

// --- Admin ---
export const creerCompteClient = (data: CreerClientInput) =>
  requete<ClientCreeOut>("/api/auth/crm/clients", { method: "POST", body: JSON.stringify(data) });
export const listerComptesClients = () => requete<UserMe[]>("/api/auth/crm/clients");

// --- Clients ---
export const getClients = () => requete<Client[]>("/api/clients");
export const getClient = (id: string) => requete<Client>(`/api/clients/${id}`);
export const creerClient = (data: ClientInput) => requete<Client>("/api/clients", { method: "POST", body: JSON.stringify(data) });
export const modifierClient = (id: string, data: ClientInput) => requete<Client>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerClient = (id: string) => requete<{ statut: string }>(`/api/clients/${id}`, { method: "DELETE" });

// --- Devis ---
export const getDevisListe = () => requete<Devis[]>("/api/devis");
export const getDevis = (id: string) => requete<Devis>(`/api/devis/${id}`);
export const creerDevis = (data: DevisInput) => requete<Devis>("/api/devis", { method: "POST", body: JSON.stringify(data) });
export const modifierDevis = (id: string, data: DevisInput) => requete<Devis>(`/api/devis/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerDevis = (id: string) => requete<{ statut: string }>(`/api/devis/${id}`, { method: "DELETE" });
export const envoyerDevisPourSignature = (id: string) => requete<Devis>(`/api/devis/${id}/envoyer`, { method: "POST" });
export const getDevisPublic = (token: string) => requete<DevisPublic>(`/api/devis/public/${token}`);
export const signerDevisPublic = (token: string, signatureImage: string) =>
  requete<DevisPublic>(`/api/devis/public/${token}/signer`, { method: "POST", body: JSON.stringify({ signature_image: signatureImage }) });
export const getAbonnementSuivi = (id: string) => requete<MoisAbonnement[]>(`/api/devis/${id}/abonnement/suivi`);
export const genererFactureMois = (id: string, moisIndex?: number) =>
  requete<Facture>(`/api/devis/${id}/abonnement/facturer`, { method: "POST", body: JSON.stringify(moisIndex !== undefined ? { mois_index: moisIndex } : {}) });

// --- Factures ---
export const getFacturesListe = () => requete<Facture[]>("/api/factures");
export const getFacture = (id: string) => requete<Facture>(`/api/factures/${id}`);
export const creerFacture = (data: FactureInput) => requete<Facture>("/api/factures", { method: "POST", body: JSON.stringify(data) });
export const modifierFacture = (id: string, data: FactureInput) => requete<Facture>(`/api/factures/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerFacture = (id: string) => requete<{ statut: string }>(`/api/factures/${id}`, { method: "DELETE" });
export const envoyerFacture = (id: string) => requete<Facture>(`/api/factures/${id}/envoyer`, { method: "POST" });
export const marquerFacturePayee = (id: string) => requete<Facture>(`/api/factures/${id}/payer`, { method: "POST" });
export const relancerFacture = (id: string) => requete<Facture>(`/api/factures/${id}/relancer`, { method: "POST" });
export const getEcheances = () => requete<RecapEcheances>("/api/factures/echeances");

// --- Dépenses ---
export const getDepenses = () => requete<Depense[]>("/api/depenses");
export const creerDepense = (data: DepenseInput) => requete<Depense>("/api/depenses", { method: "POST", body: JSON.stringify(data) });
export const modifierDepense = (id: string, data: DepenseInput) => requete<Depense>(`/api/depenses/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerDepense = (id: string) => requete<{ statut: string }>(`/api/depenses/${id}`, { method: "DELETE" });
export const getMoisAbonnements = () => requete<MoisAbonnement[]>("/api/depenses/abonnements/mois");
export const getRecapEcheances = () => requete<RecapEcheances>("/api/depenses/abonnements/recap");

// --- Google ---
export const getGoogleStatus = () => requete<GoogleStatus>("/api/auth/google/status");
export const urlConnexionGoogle = () => `${API_URL}/api/auth/google/login`;

// --- Tâches ---
export const getTaches = () => requete<Tache[]>("/api/taches");
export const creerTache = (data: TacheInput) => requete<Tache>("/api/taches", { method: "POST", body: JSON.stringify(data) });
export const modifierTache = (id: string, data: TacheInput) => requete<Tache>(`/api/taches/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerTache = (id: string) => requete<{ statut: string }>(`/api/taches/${id}`, { method: "DELETE" });
export const importerTachesLot = (data: TacheInput[]) => requete<Tache[]>("/api/taches/import-lot", { method: "POST", body: JSON.stringify(data) });

// --- Prospects ---
export const getProspects = () => requete<Prospect[]>("/api/prospects");
export const creerProspect = (data: ProspectInput) => requete<Prospect>("/api/prospects", { method: "POST", body: JSON.stringify(data) });
export const modifierProspect = (id: string, data: ProspectInput) => requete<Prospect>(`/api/prospects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const supprimerProspect = (id: string) => requete<{ statut: string }>(`/api/prospects/${id}`, { method: "DELETE" });
export const convertirEnClient = (id: string) => requete<{ statut: string; client_id: string }>(`/api/prospects/${id}/convertir-en-client`, { method: "POST" });
export const importerProspectsLot = (data: ProspectInput[]) => requete<Prospect[]>("/api/prospects/import-lot", { method: "POST", body: JSON.stringify(data) });

// --- Agent IA ---
export const chatAgent = (message: string, historique: { role: string; content: string }[]) =>
  requete<AgentResponse>("/api/agent/chat", { method: "POST", body: JSON.stringify({ message, historique }) });
export const getAgentHistorique = () => requete<AgentMessage[]>("/api/agent/historique");
export const effacerAgentHistorique = () => requete<{ statut: string }>("/api/agent/historique", { method: "DELETE" });

// --- IDEL ---
export const idelGetOrdonnances = () =>
  Promise.all([
    requeteIdel<IdelOrdonnance[]>("/api/reception/ordonnances"),
    requeteIdel<IdelOrdonnance[]>("/api/encours/ordonnances"),
    requeteIdel<IdelOrdonnance[]>("/api/traite/ordonnances"),
  ]).then(([reception, encours, traite]) => [...reception, ...encours, ...traite]);

export const idelUploaderOrdonnance = (formData: FormData) =>
  requeteIdelFormData<IdelOrdonnance>("/api/reception/ordonnances", formData);

// L'API retourne { propositions: [...], confiance: 0.55, validation_humaine_obligatoire: true }
// On normalise en tableau
export const idelProposerCotation = async (id: string): Promise<CotationOut[]> => {
  const raw = await requeteIdel<unknown>(`/api/encours/ordonnances/${id}/proposition-cotation`);
  if (Array.isArray(raw)) return raw as CotationOut[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.propositions)) return obj.propositions as CotationOut[];
  }
  return [];
};

// Le backend exige : { patient_id, lignes } -- "lignes" est le SEUL champ lu
// cote serveur (routers/encours.py -> valider_cotation), tout autre nom
// de cle serait silencieusement ignore par Pydantic sans jamais creer de
// ligne de cotation en base.
export const idelValiderCotation = (
  id: string,
  items: CotationValidationItem[],
  patientId?: string | null
) =>
  requeteIdel<IdelOrdonnance>(`/api/encours/ordonnances/${id}/valider-cotation`, {
    method: "POST",
    body: JSON.stringify({
      ...(patientId ? { patient_id: patientId } : {}),
      lignes: items,
    }),
  });

// Annule une cotation validee par erreur, pour la refaire depuis zero.
// Uniquement possible tant que l'ordonnance est encore 'en_cours'.
export const idelAnnulerCotation = (id: string) =>
  requeteIdel<IdelOrdonnance>(`/api/encours/ordonnances/${id}/cotation`, {
    method: "DELETE",
  });

export const idelMarquerTransmis = (id: string) =>
  requeteIdel<IdelOrdonnance>(`/api/traite/ordonnances/${id}/marquer-transmis`, {
    method: "POST",
    body: JSON.stringify({ lps_choisi: "logiciel_metier" }),
  });

// Retourne le CSV comme Blob (telechargement authentifie) -- ne peut pas
// etre un simple lien <a href>, qui ne transporterait pas le token.
export const idelExporterCsv = (id: string) =>
  requeteIdelBlob(`/api/encours/ordonnances/${id}/export-csv`);

// Renvoie la fiche de reprise structuree (JSON), a afficher a l'ecran --
// ce n'est pas un fichier, contrairement a l'export CSV.
export const idelFicheReprise = (id: string) =>
  requeteIdel<FicheReprise>(`/api/encours/ordonnances/${id}/fiche-reprise`);

export const idelGetPatients = () => requeteIdel<IdelPatient[]>("/api/patients");
export const idelCreerPatient = (data: Partial<IdelPatient>) =>
  requeteIdel<IdelPatient>("/api/patients", { method: "POST", body: JSON.stringify(data) });
export const idelImporterPatientsLot = (data: Partial<IdelPatient>[]) =>
  requeteIdel<IdelPatient[]>("/api/patients/import-lot", { method: "POST", body: JSON.stringify(data) });

// Profil IDEL (notamment le LPS utilise, pour un affichage honnete dans
// le pipeline -- Mutatech ne transmet jamais rien elle-meme).
export const idelGetMe = () => requeteIdel<IdelMe>("/api/auth/me");
export const idelUpdateMe = (data: IdelUpdateInput) =>
  requeteIdel<IdelMe>("/api/auth/me", { method: "PUT", body: JSON.stringify(data) });

// --- Aide calcul ---
export function calculerTotaux(lignes: Ligne[] | null | undefined, tauxTva: number) {
  try {
    const lignesSures = Array.isArray(lignes) ? lignes : [];
    const totalHt = lignesSures.reduce((s, l) => s + (l?.quantite ?? 0) * (l?.prix_unitaire ?? 0), 0);
    const totalTva = totalHt * ((tauxTva ?? 0) / 100);
    return { totalHt, totalTva, totalTtc: totalHt + totalTva };
  } catch {
    return { totalHt: 0, totalTva: 0, totalTtc: 0 };
  }
}
