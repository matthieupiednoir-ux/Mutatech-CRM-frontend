import {
  Client, ClientInput,
  Devis, DevisInput, DevisPublic,
  ProduitCatalogue, ProduitCatalogueInput,
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
  Organization, OrganizationCreateInput, OrgUserCreateInput, OrgUserCreeOut, ModuleType,
  OrgUser, OrgUserUpdateInput,
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

// Comme requeteIdel, mais pour recuperer un fichier binaire (PDF, etc.) --
// necessaire car un <a href> classique ne peut pas transporter le header
// Authorization : le navigateur ferait alors une requete non authentifiee.
async function requeteBlob(chemin: string): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${chemin}`, { headers });
  if (!res.ok) {
    const corps = await res.text();
    throw new ApiError(corps || `Erreur ${res.status}`);
  }
  return res.blob();
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

// Connexion pour les comptes multi-organisation (JMS+ / PSDM), stockes
// sur le backend IDEL et non sur le backend CRM classique. Adapte la
// reponse au format AuthResponse pour reutiliser sauvegarderAuth() et
// tout le reste du systeme de session sans le dupliquer.
export const loginOrg = async (data: { email: string; mot_de_passe: string }): Promise<AuthResponse> => {
  const res = await fetch(`${IDEL_API_URL}/auth-org/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: data.email, password: data.mot_de_passe }),
  });
  if (!res.ok) {
    const corps = await res.text();
    throw new ApiError(corps || `Erreur ${res.status}`);
  }
  const brut = await res.json();
  const auth: AuthResponse = {
    access_token: brut.access_token,
    token_type: brut.token_type,
    tenant_id: brut.organization_id,
    role: brut.role,
    produit: "idel",
    nom: `${brut.prenom} ${brut.nom}`.trim(),
    email: data.email,
  };
  sauvegarderAuth(auth);
  return auth;
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

// --- Equipe cote client (le proprietaire du tenant invite ses collegues) ---
// Distinct de MembreEquipe (equipe interne Mutatech, /api/admin/equipe).
export interface MembreEquipeClient {
  id: string;
  email: string;
  nom?: string | null;
  role: string;
  actif: boolean;
  cree_le: string;
}
export const membresLister = () => requete<MembreEquipeClient[]>("/api/auth/crm/membres");
export const membresInviter = (data: { email: string; nom?: string }) =>
  requete<{ user_id: string; email: string; mot_de_passe_temporaire: string }>("/api/auth/crm/membres", { method: "POST", body: JSON.stringify(data) });
export const membresModifier = (id: string, data: { actif?: boolean; nom?: string }) =>
  requete<MembreEquipeClient>(`/api/auth/crm/membres/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const membresRetirer = (id: string) =>
  requete<{ statut: string }>(`/api/auth/crm/membres/${id}`, { method: "DELETE" });

// --- Equipe Mutatech (interne, distincte des clients) ---
export interface MembreEquipe {
  id: string;
  email: string;
  nom?: string | null;
  role: "admin" | "support";
  actif: boolean;
  ajoute_le: string;
  ajoute_par_email?: string | null;
}
export const equipeLister = () => requete<MembreEquipe[]>("/api/admin/equipe");
export const equipeAjouter = (data: { email: string; nom?: string; role?: string }) =>
  requete<MembreEquipe>("/api/admin/equipe", { method: "POST", body: JSON.stringify(data) });
export const equipeModifier = (id: string, data: { nom?: string; role?: string; actif?: boolean }) =>
  requete<MembreEquipe>(`/api/admin/equipe/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const equipeRetirer = (id: string) =>
  requete<{ statut: string }>(`/api/admin/equipe/${id}`, { method: "DELETE" });

// --- Insights discrets (suggestions passives, pas de chat) ---
export interface InsightItem {
  id: string;
  label: string;
}
export interface Insight {
  module: string;
  texte: string;
  urgence: "info" | "attention" | "important";
  action_type?: "relancer_facture" | "renvoyer_devis" | "marquer_prospect_contacte";
  items?: InsightItem[];
}
export const agentInsights = () => requete<Insight[]>("/api/agent/insights");

// --- Catalogue produits/services (CRM) ---
export const catalogueLister = (actifSeulement?: boolean) =>
  requete<ProduitCatalogue[]>(`/api/catalogue${actifSeulement ? "?actif_seulement=true" : ""}`);
export const catalogueCreer = (data: ProduitCatalogueInput) =>
  requete<ProduitCatalogue>("/api/catalogue", { method: "POST", body: JSON.stringify(data) });
export const catalogueModifier = (id: string, data: Partial<ProduitCatalogueInput>) =>
  requete<ProduitCatalogue>(`/api/catalogue/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const catalogueSupprimer = (id: string) =>
  requete<{ statut: string }>(`/api/catalogue/${id}`, { method: "DELETE" });

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

// --- Bilan annuel ---
export const exporterBilanAnnuel = (annee: number) =>
  requeteBlob(`/api/bilan/annuel?annee=${annee}`);

// --- Google ---
export const getGoogleStatus = () => requete<GoogleStatus>("/api/auth/google/status");
export const urlConnexionGoogle = () => `${API_URL}/api/auth/google/login`;

// --- Journal d'activite IA (Pixel) ---
export interface EntreeJournal {
  id: string;
  auteur: string;
  type_action: "creation" | "modification" | "suppression";
  description: string;
  cree_le: string;
}
export const getJournal = (limite?: number) =>
  requete<EntreeJournal[]>(`/api/journal${limite ? `?limite=${limite}` : ""}`);

// --- Piliers (categories de taches, propres a chaque tenant) ---
export interface Pilier {
  id: string;
  numero: number;
  nom: string;
  ordre: number;
}
export const getPiliers = () => requete<Pilier[]>("/api/piliers");
export const creerPilier = (nom: string) =>
  requete<Pilier>("/api/piliers", { method: "POST", body: JSON.stringify({ nom }) });
export const modifierPilier = (id: string, nom: string) =>
  requete<Pilier>(`/api/piliers/${id}`, { method: "PUT", body: JSON.stringify({ nom }) });
export const supprimerPilier = (id: string) =>
  requete<{ statut: string }>(`/api/piliers/${id}`, { method: "DELETE" });

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
export const getAgentHistorique = () => requete<AgentMessage[]>("/api/agent/history");
export const effacerAgentHistorique = () => requete<{ statut: string }>("/api/agent/history", { method: "DELETE" });

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

// --- Admin Organisations (multi-tenant PSDM, backend IDEL) ---
// Reserve aux comptes mutatech_admin cote serveur -- la page qui appelle
// ces fonctions doit elle-meme filtrer l'acces (cf. app/admin/organisations).
export const adminListerOrganisations = () =>
  requeteIdel<Organization[]>("/admin/organizations");

export const adminCreerOrganisation = (data: OrganizationCreateInput) =>
  requeteIdel<Organization>("/admin/organizations", { method: "POST", body: JSON.stringify(data) });

export const adminVoirOrganisation = (id: string) =>
  requeteIdel<Organization>(`/admin/organizations/${id}`);

export const adminBasculerModule = (orgId: string, module: ModuleType, actif: boolean) =>
  requeteIdel<Organization>(`/admin/organizations/${orgId}/modules`, {
    method: "PUT",
    body: JSON.stringify({ module, actif }),
  });

export const adminAjouterUtilisateurOrg = (orgId: string, data: OrgUserCreateInput) =>
  requeteIdel<OrgUserCreeOut>(`/admin/organizations/${orgId}/users`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const adminListerUtilisateursOrg = (orgId: string) =>
  requeteIdel<OrgUser[]>(`/admin/organizations/${orgId}/users`);

export const adminModifierUtilisateurOrg = (orgId: string, userId: string, data: OrgUserUpdateInput) =>
  requeteIdel<OrgUser>(`/admin/organizations/${orgId}/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

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
// --- Mon organisation (self-service) ---
export interface MonOrganisation {
  id: string;
  nom: string;
  type: string;
  modules_actifs: string[];
  role: string;
  nom_utilisateur: string;
  prenom_utilisateur: string;
}
export const monOrganisation = () => requeteIdel<MonOrganisation>("/auth-org/me/organization");

// --- Module Tournees ---
export interface VisitItem {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  product_id?: string | null;
}
export interface TourneeVisit {
  id: string;
  patient_id: string;
  patient_nom: string;
  patient_prenom: string;
  patient_adresse?: string | null;
  scheduled_time: string;
  duration_minutes: number;
  prestation: string;
  status: string;
  notes?: string | null;
  ordre: number;
  items: VisitItem[];
}
export interface Tournee {
  id: string;
  date: string;
  technicien_name: string;
  status: string;
  visits: TourneeVisit[];
}
export const tourneesLister = (date?: string) =>
  requeteIdel<Tournee[]>(`/api/tournees${date ? `?date=${date}` : ""}`);
export const tourneesCreer = (data: { date: string; technicien_name: string }) =>
  requeteIdel<Tournee>("/api/tournees", { method: "POST", body: JSON.stringify(data) });
export const tourneesVoir = (id: string) => requeteIdel<Tournee>(`/api/tournees/${id}`);
export const tourneesAjouterVisite = (tourneeId: string, data: {
  patient_id: string; scheduled_time: string; duration_minutes?: number; prestation: string; notes?: string;
}) => requeteIdel<TourneeVisit>(`/api/tournees/${tourneeId}/visits`, { method: "POST", body: JSON.stringify(data) });
export const tourneesModifierVisite = (tourneeId: string, visitId: string, data: {
  status?: string; scheduled_time?: string; notes?: string; ordre?: number;
}) => requeteIdel<TourneeVisit>(`/api/tournees/${tourneeId}/visits/${visitId}`, { method: "PUT", body: JSON.stringify(data) });
export const tourneesSupprimerVisite = (tourneeId: string, visitId: string) =>
  requeteIdel<{ ok: boolean }>(`/api/tournees/${tourneeId}/visits/${visitId}`, { method: "DELETE" });

export const tourneesAjouterItem = (tourneeId: string, visitId: string, data: {
  label: string; quantity?: number; unit?: string; product_id?: string;
}) => requeteIdel<unknown>(`/api/tournees/${tourneeId}/visits/${visitId}/items`, { method: "POST", body: JSON.stringify(data) })
  .then(() => tourneesVoir(tourneeId));

export const tourneesSupprimerItem = (tourneeId: string, visitId: string, itemId: string) =>
  requeteIdel<unknown>(`/api/tournees/${tourneeId}/visits/${visitId}/items/${itemId}`, { method: "DELETE" })
  .then(() => tourneesVoir(tourneeId));

// --- Module Commandes Pharma ---
export interface Pharmacy {
  id: string; name: string; phone: string; siret?: string | null; finess?: string | null;
  adresse?: string | null; code_postal?: string | null; ville?: string | null; email?: string | null; actif: boolean;
}
export interface Product {
  id: string; name: string; category: string; code_lppr?: string | null; code_cip?: string | null;
  unit: string; actif: boolean; needs_review: boolean;
}
export interface OrderItem { id: string; product_id?: string | null; product_name: string; quantity: number; unit: string; }
export interface PharmaOrder {
  id: string; order_number: string; patient_id: string; patient_nom: string; patient_prenom: string;
  pharmacy_id: string; pharmacy_name: string; status: string; date_creation: string;
  scheduled_delivery_date?: string | null; items: OrderItem[];
}
export const pharmaListerPharmacies = () => requeteIdel<Pharmacy[]>("/api/pharma/pharmacies");
export const pharmaCreerPharmacie = (data: { name: string; phone: string; adresse?: string; ville?: string; code_postal?: string; email?: string }) =>
  requeteIdel<Pharmacy>("/api/pharma/pharmacies", { method: "POST", body: JSON.stringify(data) });
export const pharmaListerProduits = () => requeteIdel<Product[]>("/api/pharma/products");
export const pharmaCreerProduit = (data: { name: string; category: string; unit?: string; code_lppr?: string }) =>
  requeteIdel<Product>("/api/pharma/products", { method: "POST", body: JSON.stringify(data) });
export const pharmaListerCommandes = (status?: string) =>
  requeteIdel<PharmaOrder[]>(`/api/pharma/orders${status ? `?status=${status}` : ""}`);
export const pharmaCreerCommande = (data: {
  patient_id: string; pharmacy_id: string; scheduled_delivery_date?: string;
  items: { product_name: string; quantity: number; unit?: string }[];
}) => requeteIdel<PharmaOrder>("/api/pharma/orders", { method: "POST", body: JSON.stringify(data) });
export const pharmaChangerStatutCommande = (id: string, status: string, comment?: string) =>
  requeteIdel<PharmaOrder>(`/api/pharma/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status, comment }) });

// --- Module Ordonnances (suivi de validite / renouvellement) ---
export interface Prescription {
  id: string; patient_id?: string | null; patient_nom: string; patient_prenom: string;
  reference?: string | null; medecin_prescripteur?: string | null; doctor_mssante?: string | null;
  date_prescription?: string | null; date_expiration?: string | null;
  acte_prescrit_texte?: string | null; duree_traitement?: string | null;
  statut_validite?: string | null; renewal_of_id?: string | null; renewed_by_id?: string | null;
  fichier_nom_original?: string | null; confiance_ocr?: number | null;
}
export const prescriptionsLister = (statutValidite?: string) =>
  requeteIdel<Prescription[]>(`/api/prescriptions${statutValidite ? `?statut_validite=${statutValidite}` : ""}`);
export const prescriptionsCreer = (data: {
  patient_id: string; reference?: string; medecin_prescripteur?: string; doctor_mssante?: string;
  date_prescription?: string; date_expiration?: string;
}) => requeteIdel<Prescription>("/api/prescriptions", { method: "POST", body: JSON.stringify(data) });

// Depot photo/PDF avec extraction OCR automatique (Claude Vision, meme
// moteur que le pipeline IDEL classique) -- FormData, pas de JSON.stringify.
export const prescriptionsUploader = (patientId: string, file: File) => {
  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("file", file);
  const token = getToken();
  return fetch(`${IDEL_API_URL}/api/prescriptions/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const corps = await res.text();
      throw new ApiError(corps || `Erreur ${res.status}`);
    }
    return res.json() as Promise<Prescription>;
  });
};
export const prescriptionsChangerValidite = (id: string, statutValidite: string) =>
  requeteIdel<Prescription>(`/api/prescriptions/${id}/validite`, { method: "PUT", body: JSON.stringify({ statut_validite: statutValidite }) });
export const prescriptionsRenouveler = (id: string, data: {
  patient_id: string; reference?: string; date_prescription?: string; date_expiration?: string;
}) => requeteIdel<Prescription>(`/api/prescriptions/${id}/renouveler`, { method: "POST", body: JSON.stringify(data) });

// --- Module Agenda ---
export interface CalendarEvent {
  id: string; title: string; event_type: string; start_datetime: string; end_datetime: string;
  all_day: boolean; status: string; location?: string | null; description?: string | null; patient_id?: string | null;
}
export const agendaListerEvenements = (start?: string, end?: string) => {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const qs = params.toString();
  return requeteIdel<CalendarEvent[]>(`/api/agenda/events${qs ? `?${qs}` : ""}`);
};
export const agendaCreerEvenement = (data: {
  title: string; event_type: string; start_datetime: string; end_datetime: string;
  location?: string; description?: string; patient_id?: string;
}) => requeteIdel<CalendarEvent>("/api/agenda/events", { method: "POST", body: JSON.stringify(data) });
export const agendaModifierEvenement = (id: string, data: {
  status?: string; title?: string; start_datetime?: string; end_datetime?: string;
  location?: string; description?: string;
}) => requeteIdel<CalendarEvent>(`/api/agenda/events/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const agendaSupprimerEvenement = (id: string) =>
  requeteIdel<{ ok: boolean }>(`/api/agenda/events/${id}`, { method: "DELETE" });

// --- Insights discrets IDEL/PSDM (tournees, pharma, prescriptions, agenda) ---
export const idelInsights = () => requeteIdel<Insight[]>("/api/insights");

// --- Nova : agent IA conversationnel cote IDEL/PSDM (equivalent de Pixel) ---
export const novaChat = (message: string, historique: { role: string; content: string }[]) =>
  requeteIdel<AgentResponse>("/api/nova/chat", { method: "POST", body: JSON.stringify({ message, historique }) });
export const novaHistorique = () => requeteIdel<AgentMessage[]>("/api/nova/history");
export const novaEffacerHistorique = () => requeteIdel<{ statut: string }>("/api/nova/history", { method: "DELETE" });

// --- Catalogue prestations (IDEL/PSDM) ---
export interface PrestationCatalogue {
  id: string;
  nom: string;
  description?: string | null;
  type_facturation: "ponctuelle" | "abonnement";
  prix: number;
  actif: boolean;
}
export const prestationsCatalogueLister = () => requeteIdel<PrestationCatalogue[]>("/api/catalogue");
export const prestationsCatalogueCreer = (data: {
  nom: string; description?: string; type_facturation?: string; prix: number;
}) => requeteIdel<PrestationCatalogue>("/api/catalogue", { method: "POST", body: JSON.stringify(data) });
export const prestationsCatalogueModifier = (id: string, data: {
  nom?: string; description?: string; type_facturation?: string; prix?: number; actif?: boolean;
}) => requeteIdel<PrestationCatalogue>(`/api/catalogue/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const prestationsCatalogueSupprimer = (id: string) =>
  requeteIdel<{ ok: boolean }>(`/api/catalogue/${id}`, { method: "DELETE" });

// --- Resume IDEL pour le dashboard combine (comptes crm+idel) ---
export interface IdelResume {
  patients: number;
  tournees_aujourdhui: number;
  commandes_en_attente: number;
  ordonnances_actives: number;
}
export const idelDashboardResume = () => requeteIdel<IdelResume>("/api/dashboard-resume");

// --- Planning partage (Google Calendar personnel par utilisateur) ---
export interface MembrePlanning {
  contexte: string;
  nom: string;
  connecte: boolean;
  email_google?: string | null;
}
export interface EvenementPlanning {
  id: string;
  titre: string;
  debut?: string | null;
  fin?: string | null;
  lieu?: string | null;
  proprietaire_contexte: string;
  proprietaire_nom: string;
}
export interface EvenementPlanningInput {
  titre: string;
  debut: string;
  fin: string;
  description?: string;
  lieu?: string;
  assigne_a_contexte: string;
}

// CRM
export const planningLoginPersonnelUrl = () => requete<{ url: string }>("/api/auth/google/login-personnel-url");
export const planningStatutPersonnel = () => requete<{ connecte: boolean; email_google?: string | null }>("/api/auth/google/statut-personnel");
export const planningDeconnexionPersonnelle = () => requete<{ statut: string }>("/api/auth/google/deconnexion-personnelle", { method: "DELETE" });
export const planningMembres = () => requete<MembrePlanning[]>("/api/planning/membres");
export const planningEvenements = (debut: string, fin: string) =>
  requete<EvenementPlanning[]>(`/api/planning/evenements?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`);
export const planningCreerEvenement = (data: EvenementPlanningInput) =>
  requete<EvenementPlanning>("/api/planning/evenements", { method: "POST", body: JSON.stringify(data) });

// --- Journal d'activite IA (Nova, cote IDEL) ---
export const idelGetJournal = (limite?: number) =>
  requeteIdel<EntreeJournal[]>(`/api/journal${limite ? `?limite=${limite}` : ""}`);

// IDEL (memes formes, endpoints relayes cote backend IDEL)
export const idelPlanningLoginPersonnelUrl = () => requeteIdel<{ url: string }>("/api/planning/login-personnel-url");
export const idelPlanningStatutPersonnel = () => requeteIdel<{ connecte: boolean; email_google?: string | null }>("/api/planning/statut-personnel");
export const idelPlanningDeconnexionPersonnelle = () => requeteIdel<{ statut: string }>("/api/planning/deconnexion-personnelle", { method: "DELETE" });
export const idelPlanningMembres = () => requeteIdel<MembrePlanning[]>("/api/planning/membres");
export const idelPlanningEvenements = (debut: string, fin: string) =>
  requeteIdel<EvenementPlanning[]>(`/api/planning/evenements?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`);
export const idelPlanningCreerEvenement = (data: EvenementPlanningInput) =>
  requeteIdel<EvenementPlanning>("/api/planning/evenements", { method: "POST", body: JSON.stringify(data) });
