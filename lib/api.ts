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
 IdelOrdonnance, IdelPatient, FicheReprise,
 IdelMe, IdelUpdateInput, OrdonnanceSaisie, PropositionCotation, ActeReferentiel,
 SeanceCotation, SimulationNGAP, ImportPatientsResultat,
 Organization, OrganizationCreateInput, OrgUserCreateInput, OrgUserCreeOut, ModuleType,
 OrgUser, OrgUserUpdateInput,
} from "./types";
import { getToken, sauvegarderAuth, sauvegarderConfig, deconnecter } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const IDEL_API_URL = process.env.NEXT_PUBLIC_IDEL_API_URL || "http://localhost:8001";

export class ApiError extends Error {}

// Message lisible à partir d'une réponse d'erreur FastAPI : { detail: "..." }
// ou, pour une saisie refusée (422), la liste des champs en erreur.
function messageErreur(corps: string, statut: number): string {
 try {
 const json = JSON.parse(corps) as { detail?: unknown };
 const d = json.detail;
 if (typeof d === "string") return d;
 if (Array.isArray(d)) {
 return d.map((e: { msg?: string; loc?: unknown[] }) => {
 const champ = Array.isArray(e.loc) ? e.loc.filter((x) => x !== "body").join(" › ") : "";
 const msg = (e.msg || "").replace(/^Value error, /, "");
 return champ ? `${champ} : ${msg}` : msg;
 }).join(" · ");
 }
 } catch { /* corps non JSON */ }
 return corps || `Erreur ${statut}`;
}

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
 throw new ApiError(messageErreur(corps, res.status));
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
 throw new ApiError(messageErreur(corps, res.status));
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
 throw new ApiError(messageErreur(corps, res.status));
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
export const marquerFacturePayee = (id: string) => requete<Facture>(`/api/factures/${id}/marquer-payee`, { method: "POST" });
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
 type_action: "creation" | "modification" | "suppression" | "restauration";
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

// --- Liaison WhatsApp (Pixel accessible depuis WhatsApp) ---
export const whatsappDemanderLiaison = (numero: string) =>
 requete<{ statut: string }>("/api/whatsapp/liaison/demander", { method: "POST", body: JSON.stringify({ numero }) });
export const whatsappVerifierLiaison = (code: string) =>
 requete<{ statut: string; numero: string }>("/api/whatsapp/liaison/verifier", { method: "POST", body: JSON.stringify({ code }) });
export const whatsappStatutLiaison = () =>
 requete<{ lie: boolean; numero: string | null }>("/api/whatsapp/liaison/statut");
export const whatsappDelierLiaison = () =>
 requete<{ statut: string }>("/api/whatsapp/liaison", { method: "DELETE" });

// --- Corbeille (clients/devis/factures supprimes, restaurables 30 jours) ---
export interface ElementCorbeille {
 type: "client" | "devis" | "facture";
 id: string;
 libelle: string;
 supprime_le: string;
}
export const getCorbeille = () => requete<ElementCorbeille[]>("/api/corbeille");
export const restaurerElementCorbeille = (type: string, id: string) =>
 requete<{ statut: string }>(`/api/corbeille/${type}/${id}/restaurer`, { method: "POST" });
export const supprimerDefinitivement = (type: string, id: string) =>
 requete<{ statut: string }>(`/api/corbeille/${type}/${id}`, { method: "DELETE" });

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
export const chatAgent = (message: string, historique: { role: string; content: string }[], voice?: boolean) =>
 requete<AgentResponse>("/api/agent/chat", { method: "POST", body: JSON.stringify({ message, historique, voice: Boolean(voice) }) });
export const agentConfirmerAction = (outil: string, args: Record<string, unknown>) =>
 requete<{ libelle: string }>("/api/agent/confirmer-action", { method: "POST", body: JSON.stringify({ outil, args }) });
export const getAgentHistorique = () => requete<AgentMessage[]>("/api/agent/history");
export const effacerAgentHistorique = () => requete<{ statut: string }>("/api/agent/history", { method: "DELETE" });

// --- IDEL ---
// perimetre "cabinet" : toutes les ordonnances du cabinet (IDEC, gérant,
// remplaçante) ; "moi" : uniquement les miennes. Sans paramètre, le
// serveur choisit selon le rôle.
export type PerimetrePipeline = "moi" | "cabinet";
export const idelGetOrdonnances = (perimetre?: PerimetrePipeline) => {
 const qs = perimetre ? `?perimetre=${perimetre}` : "";
 return Promise.all([
 requeteIdel<IdelOrdonnance[]>(`/api/reception/ordonnances${qs}`),
 requeteIdel<IdelOrdonnance[]>(`/api/encours/ordonnances${qs}`),
 requeteIdel<IdelOrdonnance[]>(`/api/traite/ordonnances${qs}`),
 ]).then(([reception, encours, traite]) => [...reception, ...encours, ...traite]);
};

export const idelUploaderOrdonnance = (formData: FormData) =>
 requeteIdelFormData<IdelOrdonnance>("/api/reception/ordonnances", formData);

// Saisie ou correction manuelle (médecin, date, acte, patient) : une
// ordonnance non lue automatiquement n'est plus bloquée en réception.
export const idelSaisirOrdonnance = (id: string, data: OrdonnanceSaisie) =>
 requeteIdel<IdelOrdonnance>(`/api/reception/ordonnances/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const idelPasserEnCours = (id: string) =>
 requeteIdel<IdelOrdonnance>(`/api/reception/ordonnances/${id}/passer-en-cours`, { method: "POST" });
// Scan déposé, servi par le backend authentifié (jamais d'URL publique).
export const idelFichierOrdonnance = (id: string) =>
 requeteIdelBlob(`/api/reception/ordonnances/${id}/fichier`);

export const idelProposerCotation = (id: string) =>
 requeteIdel<PropositionCotation>(`/api/encours/ordonnances/${id}/proposition-cotation`);

// Moteur NGAP unique (serveur) : l'écran affiche cette simulation telle
// quelle, et la validation enregistre exactement le même calcul.
export const idelReferentielNgap = () =>
 requeteIdel<{ actes: ActeReferentiel[]; tarifs: Record<string, unknown> }>("/api/ngap/referentiel");
export const idelSimulerCotation = (seance: SeanceCotation) =>
 requeteIdel<SimulationNGAP>("/api/ngap/simuler", { method: "POST", body: JSON.stringify(seance) });

export const idelValiderCotation = (id: string, seance: SeanceCotation, patientId: string) =>
 requeteIdel<IdelOrdonnance>(`/api/encours/ordonnances/${id}/valider-cotation`, {
 method: "POST",
 body: JSON.stringify({ ...seance, patient_id: patientId }),
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
 body: JSON.stringify({}),
 });

// Retour NOEMIE saisi par l'IDEL : payée, ou rejetée avec son motif.
export const idelRetourNoemie = (id: string, statut: "payee" | "rejetee", motif?: string) =>
 requeteIdel<IdelOrdonnance>(`/api/traite/ordonnances/${id}/retour-noemie`, {
 method: "POST",
 body: JSON.stringify({ statut_fse: statut, retour_noemie: motif || null }),
 });

// Retourne le CSV comme Blob (telechargement authentifie) -- ne peut pas
// etre un simple lien <a href>, qui ne transporterait pas le token.
export const idelExporterCsv = (id: string) =>
 requeteIdelBlob(`/api/encours/ordonnances/${id}/export-csv`);

// Renvoie la fiche de reprise structuree (JSON), a afficher a l'ecran --
// ce n'est pas un fichier, contrairement a l'export CSV.
export const idelFicheReprise = (id: string) =>
 requeteIdel<FicheReprise>(`/api/encours/ordonnances/${id}/fiche-reprise`);

// Patients du cabinet (partagés entre ses membres).
export const idelGetPatients = () => requeteIdel<IdelPatient[]>("/api/patients");
export const idelCreerPatient = (data: Partial<IdelPatient>) =>
 requeteIdel<IdelPatient>("/api/patients", { method: "POST", body: JSON.stringify(data) });
export const idelModifierPatient = (id: string, data: Partial<IdelPatient>) =>
 requeteIdel<IdelPatient>(`/api/patients/${id}`, { method: "PUT", body: JSON.stringify(data) });
// Archive le patient s'il a un historique (ordonnances, visites...), le
// supprime sinon.
export const idelSupprimerPatient = (id: string) =>
 requeteIdel<{ ok: boolean; resultat?: "archive" }>(`/api/patients/${id}`, { method: "DELETE" });
export const idelImporterPatientsLot = (data: Partial<IdelPatient>[]) =>
 requeteIdel<ImportPatientsResultat>("/api/patients/import-lot", { method: "POST", body: JSON.stringify(data) });

// --- Trésorerie IDEL ---
// vue "cabinet" réservée à la coordination (IDEC, gérant, administrateur).
export interface ComptaStatsAnnee {
 annee: number;
 nb_traitees: number;
 montant_total: number;
 par_mois: { mois: number; annee: number; nb_traitees: number; montant_total: number }[];
}
export interface ComptaFacture {
 id: string;
 numero: string;
 patient_nom: string;
 soignante?: string | null;
 montant: number;
 statut: string;
 retour_noemie?: string | null;
 date_creation?: string | null;
 date_paiement?: string | null;
}
export const idelComptaStats = (annee: number, vue: PerimetrePipeline = "moi") =>
 requeteIdel<ComptaStatsAnnee>(`/api/compta/stats?annee=${annee}&vue=${vue}`);
export const idelComptaFactures = (annee: number, vue: PerimetrePipeline = "moi") =>
 requeteIdel<ComptaFacture[]>(`/api/compta/factures?annee=${annee}&vue=${vue}`);

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
 theme: string;
 onglets_masques: string;
 siret_utilisateur?: string | null;
 adresse_utilisateur?: string | null;
}
export const monOrganisation = () => requeteIdel<MonOrganisation>("/auth-org/me/organization");
export const idelChangerTheme = (theme: string) =>
 requeteIdel<MonOrganisation>("/auth-org/me/organization/theme", { method: "PUT", body: JSON.stringify({ theme }) });
export const idelChangerOnglets = (onglets_masques: string) =>
 requeteIdel<MonOrganisation>("/auth-org/me/organization/onglets", { method: "PUT", body: JSON.stringify({ onglets_masques }) });
// Identite "titulaire" (SIRET / adresse) -- preremplit automatiquement
// les attestations de retrocession d'honoraires (module remplacements).
export const idelModifierTitulaire = (data: { siret?: string | null; adresse?: string | null }) =>
 requeteIdel<MonOrganisation>("/auth-org/me/titulaire", { method: "PUT", body: JSON.stringify(data) });

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
 technicien_id?: string | null;
 status: string;
 visits: TourneeVisit[];
}
// Soignantes actives du cabinet (pour désigner la soignante d'une tournée).
export interface MembreCabinet { id: string; nom: string; prenom: string; role: string; }
export const cabinetMembres = () => requeteIdel<MembreCabinet[]>("/auth-org/me/membres");

export const tourneesLister = (date?: string) =>
 requeteIdel<Tournee[]>(`/api/tournees${date ? `?date=${date}` : ""}`);
export const tourneesCreer = (data: { date: string; technicien_name?: string; technicien_id?: string }) =>
 requeteIdel<Tournee>("/api/tournees", { method: "POST", body: JSON.stringify(data) });
export const tourneesModifier = (id: string, data: { date?: string; technicien_name?: string; technicien_id?: string; status?: string }) =>
 requeteIdel<Tournee>(`/api/tournees/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const tourneesSupprimer = (id: string) =>
 requeteIdel<{ ok: boolean }>(`/api/tournees/${id}`, { method: "DELETE" });
// Visite terminée -> dossier prêt à coter dans le Pipeline de la soignante.
export const tourneesCoterVisite = (tourneeId: string, visitId: string) =>
 requeteIdel<{ ordonnance_id: string; statut: string }>(`/api/tournees/${tourneeId}/visits/${visitId}/coter`, { method: "POST" });
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
 treatment_duration_days?: number | null; treatment_end_date?: string | null; notes?: string | null;
}
export interface HistoriqueCommande {
 from_status?: string | null; to_status: string; changed_by: string; changed_at: string; comment?: string | null;
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
 patient_id: string; pharmacy_id: string; scheduled_delivery_date?: string; treatment_duration_days?: number;
 items: { product_name: string; quantity: number; unit?: string }[];
}) => requeteIdel<PharmaOrder>("/api/pharma/orders", { method: "POST", body: JSON.stringify(data) });
// Lignes modifiables tant que la commande est en brouillon.
export const pharmaModifierLignesCommande = (id: string, items: { product_name: string; quantity: number; unit?: string }[]) =>
 requeteIdel<PharmaOrder>(`/api/pharma/orders/${id}/items`, { method: "PUT", body: JSON.stringify({ items }) });
export const pharmaHistoriqueCommande = (id: string) =>
 requeteIdel<HistoriqueCommande[]>(`/api/pharma/orders/${id}/historique`);
export const pharmaChangerStatutCommande = (id: string, status: string, comment?: string) =>
 requeteIdel<PharmaOrder>(`/api/pharma/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status, comment }) });

// --- Module Remplacements (retrocession d'honoraires) ---
export interface Remplacant {
 id: string; nom: string; prenom: string;
 numero_adeli?: string | null; siret?: string | null; email?: string | null;
 telephone?: string | null; notes?: string | null; actif: boolean;
}
export interface Retrocession {
 id: string; remplacant_id: string; remplacant: Remplacant;
 titulaire_nom: string; titulaire_siret?: string | null; titulaire_adresse?: string | null;
 montant: number; date_debut: string; date_fin: string;
 virement_reference?: string | null; banque?: string | null;
 lieu_signature?: string | null; date_signature?: string | null;
 pdf_path?: string | null;
 // Numéro RETRO-AAAA-NNN ; une attestation est verrouillée dès que son
 // PDF est généré (pièce comptable), et archivée plutôt que supprimée.
 numero?: string | null; user_id?: string | null; verrouille?: boolean; archive?: boolean;
}
export const remplacantsLister = (actif?: boolean) =>
 requeteIdel<Remplacant[]>(`/api/remplacants${actif !== undefined ? `?actif=${actif}` : ""}`);
export const remplacantsCreer = (data: {
 nom: string; prenom: string; numero_adeli?: string; siret?: string; email?: string; telephone?: string; notes?: string;
}) => requeteIdel<Remplacant>("/api/remplacants", { method: "POST", body: JSON.stringify(data) });
export const remplacantsModifier = (id: string, data: Partial<{
 nom: string; prenom: string; numero_adeli: string; siret: string; email: string; telephone: string; notes: string; actif: boolean;
}>) => requeteIdel<Remplacant>(`/api/remplacants/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const remplacantsDesactiver = (id: string) =>
 requeteIdel<{ ok: boolean }>(`/api/remplacants/${id}`, { method: "DELETE" });

export const retrocessionsLister = (remplacantId?: string, inclureArchives = false) => {
 const qs = new URLSearchParams();
 if (remplacantId) qs.set("remplacant_id", remplacantId);
 if (inclureArchives) qs.set("inclure_archives", "true");
 const q = qs.toString();
 return requeteIdel<Retrocession[]>(`/api/remplacements${q ? `?${q}` : ""}`);
};
export const retrocessionsCreer = (data: {
 remplacant_id: string; titulaire_nom: string; titulaire_siret?: string; titulaire_adresse?: string;
 montant: number; date_debut: string; date_fin: string;
 virement_reference?: string; banque?: string; lieu_signature?: string; date_signature?: string;
}) => requeteIdel<Retrocession>("/api/remplacements", { method: "POST", body: JSON.stringify(data) });
export const retrocessionsVoir = (id: string) => requeteIdel<Retrocession>(`/api/remplacements/${id}`);
export const retrocessionsModifier = (id: string, data: Partial<{
 titulaire_nom: string; titulaire_siret: string; titulaire_adresse: string;
 montant: number; date_debut: string; date_fin: string;
 virement_reference: string; banque: string; lieu_signature: string; date_signature: string;
}>) => requeteIdel<Retrocession>(`/api/remplacements/${id}`, { method: "PUT", body: JSON.stringify(data) });
// Archive l'attestation (elle n'est jamais effacée).
export const retrocessionsSupprimer = (id: string) =>
 requeteIdel<{ ok: boolean; resultat?: string }>(`/api/remplacements/${id}`, { method: "DELETE" });
// Genere (ou regenere) le PDF puis retourne le fichier comme Blob --
// meme raison que requeteIdelBlob : un <a href> classique ne peut pas
// transporter le header Authorization.
export const retrocessionsGenererPdf = async (id: string): Promise<Blob> => {
 const token = getToken();
 const headers: Record<string, string> = {};
 if (token) headers["Authorization"] = `Bearer ${token}`;
 const res = await fetch(`${IDEL_API_URL}/api/remplacements/${id}/pdf`, { method: "POST", headers });
 if (!res.ok) {
 const corps = await res.text();
 throw new ApiError(corps || `Erreur ${res.status}`);
 }
 return res.blob();
};
export const retrocessionsTelechargerPdf = (id: string) =>
 requeteIdelBlob(`/api/remplacements/${id}/pdf`);

// --- Module Ordonnances (suivi de validite / renouvellement) ---
export interface Prescription {
 id: string; patient_id?: string | null; patient_nom: string; patient_prenom: string;
 reference?: string | null; medecin_prescripteur?: string | null; doctor_mssante?: string | null;
 date_prescription?: string | null; date_expiration?: string | null;
 acte_prescrit_texte?: string | null; duree_traitement?: string | null;
 statut_validite?: string | null; renewal_of_id?: string | null; renewed_by_id?: string | null;
 fichier_nom_original?: string | null; confiance_ocr?: number | null;
 doctor_email?: string | null;
 // Étape du Pipeline de cotation (reception, en_cours, traite), null si
 // l'ordonnance n'y a pas été envoyée.
 statut_pipeline?: string | null;
}
export interface PrescriptionModification {
 reference?: string | null; medecin_prescripteur?: string | null; doctor_mssante?: string | null; doctor_email?: string | null;
 date_prescription?: string | null; date_expiration?: string | null; acte_prescrit_texte?: string | null; duree_traitement?: string | null;
}
export interface DemandeRenouvellement {
 destinataire_mssante?: string | null; destinataire_email?: string | null; objet: string; corps: string; statut_validite: string;
}
export const prescriptionsModifier = (id: string, data: PrescriptionModification) =>
 requeteIdel<Prescription>(`/api/prescriptions/${id}`, { method: "PUT", body: JSON.stringify(data) });
// Prépare le message au médecin (à envoyer depuis la messagerie sécurisée
// MSSanté de l'IDEL : Mutatech n'envoie rien lui-même).
export const prescriptionsDemandeRenouvellement = (id: string) =>
 requeteIdel<DemandeRenouvellement>(`/api/prescriptions/${id}/demande-renouvellement`, { method: "POST" });
export const prescriptionsEnvoyerAuPipeline = (id: string) =>
 requeteIdel<Prescription>(`/api/prescriptions/${id}/envoyer-au-pipeline`, { method: "POST" });
export const prescriptionsLister = (statutValidite?: string) =>
 requeteIdel<Prescription[]>(`/api/prescriptions${statutValidite ? `?statut_validite=${statutValidite}` : ""}`);
export const prescriptionsCreer = (data: {
 patient_id: string; reference?: string; medecin_prescripteur?: string; doctor_mssante?: string;
 date_prescription?: string; date_expiration?: string; acte_prescrit_texte?: string; duree_traitement?: string;
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
 throw new ApiError(messageErreur(corps, res.status));
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

// Lien d'abonnement ICS personnel (jeton secret, révocable).
export const agendaLienIcs = () => requeteIdel<{ url: string }>("/api/agenda/ics-lien");
export const agendaRegenererLienIcs = () => requeteIdel<{ url: string }>("/api/agenda/ics-lien/regenerer", { method: "POST" });

// --- Insights discrets IDEL/PSDM (tournees, pharma, prescriptions, agenda) ---
export const idelInsights = () => requeteIdel<Insight[]>("/api/insights");

// --- Nova : agent IA conversationnel cote IDEL/PSDM (equivalent de Pixel) ---
export const novaChat = (message: string, historique: { role: string; content: string }[], voice?: boolean) =>
 requeteIdel<AgentResponse>("/api/nova/chat", { method: "POST", body: JSON.stringify({ message, historique, voice: Boolean(voice) }) });
export const novaConfirmerAction = (outil: string, args: Record<string, unknown>) =>
 requeteIdel<{ libelle: string }>("/api/nova/confirmer-action", { method: "POST", body: JSON.stringify({ outil, args }) });
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
export interface EvenementPlanningModifierInput extends EvenementPlanningInput {
 event_id: string;
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
export const planningModifierEvenement = (data: EvenementPlanningModifierInput) =>
 requete<EvenementPlanning>("/api/planning/evenements", { method: "PUT", body: JSON.stringify(data) });
export const planningSupprimerEvenement = (eventId: string, assigneAContexte: string) =>
 requete<{ statut: string }>("/api/planning/evenements", {
 method: "DELETE",
 body: JSON.stringify({ event_id: eventId, assigne_a_contexte: assigneAContexte }),
 });

// --- Journal d'activite IA (Nova, cote IDEL) ---
export const idelGetJournal = (limite?: number) =>
 requeteIdel<EntreeJournal[]>(`/api/journal${limite ? `?limite=${limite}` : ""}`);

// Journal des accès aux dossiers (qui a consulté ou modifié quoi), réservé
// à la coordination du cabinet. Ne contient jamais le contenu des dossiers.
export interface EntreeAcces { id: string; utilisateur: string; action: string; ressource: string; ressource_id?: string | null; cree_le: string; }
export const idelJournalAcces = (limite = 200) => requeteIdel<EntreeAcces[]>(`/api/journal/acces?limite=${limite}`);

// IDEL (memes formes, endpoints relayes cote backend IDEL)
export const idelPlanningLoginPersonnelUrl = () => requeteIdel<{ url: string }>("/api/planning/login-personnel-url");
export const idelPlanningStatutPersonnel = () => requeteIdel<{ connecte: boolean; email_google?: string | null }>("/api/planning/statut-personnel");
export const idelPlanningDeconnexionPersonnelle = () => requeteIdel<{ statut: string }>("/api/planning/deconnexion-personnelle", { method: "DELETE" });
export const idelPlanningMembres = () => requeteIdel<MembrePlanning[]>("/api/planning/membres");
export const idelPlanningEvenements = (debut: string, fin: string) =>
 requeteIdel<EvenementPlanning[]>(`/api/planning/evenements?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`);
export const idelPlanningCreerEvenement = (data: EvenementPlanningInput) =>
 requeteIdel<EvenementPlanning>("/api/planning/evenements", { method: "POST", body: JSON.stringify(data) });
export const idelPlanningModifierEvenement = (data: EvenementPlanningModifierInput) =>
 requeteIdel<EvenementPlanning>("/api/planning/evenements", { method: "PUT", body: JSON.stringify(data) });
export const idelPlanningSupprimerEvenement = (eventId: string, assigneAContexte: string) =>
 requeteIdel<{ statut: string }>("/api/planning/evenements", {
 method: "DELETE",
 body: JSON.stringify({ event_id: eventId, assigne_a_contexte: assigneAContexte }),
 });

// --- E-learning (formation IA par abonnement) ---
export interface ElearningStatut {
 abonnement_statut: "inactif" | "en_attente_paiement" | "actif" | "impaye" | "resilie";
 a_acces: boolean;
 est_proprietaire: boolean;
 est_admin: boolean;
 paiement_en_ligne_disponible: boolean;
 accepte_le?: string | null;
 periode_fin?: string | null;
}
export interface ElearningModule {
 num: number;
 titre: string;
 sous_titre: string;
 sequences: string[];
 duree_heures: number;
 termine: boolean;
}
export interface ElearningAccesMembre {
 user_id: string;
 email: string;
 nom?: string | null;
 role: string;
 actif: boolean;
 a_acces: boolean;
}
export interface ElearningAbonnementAdmin {
 tenant_id: string;
 nom: string;
 statut: string;
 mode?: string | null;
 periode_fin?: string | null;
}

// Le contenu d'un module est un document HTML (pas du JSON) : lu en texte
// avec le meme header Authorization que les autres appels.
async function requeteTexte(chemin: string): Promise<string> {
 const token = getToken();
 const headers: Record<string, string> = {};
 if (token) headers["Authorization"] = `Bearer ${token}`;
 const res = await fetch(`${API_URL}${chemin}`, { headers });
 if (!res.ok) {
 const corps = await res.text();
 throw new ApiError(corps || `Erreur ${res.status}`);
 }
 return res.text();
}

export const elearningStatut = () => requete<ElearningStatut>("/api/elearning/statut");
export const elearningSouscrire = (accepte_conditions: boolean) =>
 requete<{ url: string }>("/api/elearning/abonnement/checkout", { method: "POST", body: JSON.stringify({ accepte_conditions }) });
export const elearningPortail = () => requete<{ url: string }>("/api/elearning/abonnement/portail", { method: "POST" });
export const elearningModules = () => requete<ElearningModule[]>("/api/elearning/modules");
export const elearningContenuModule = (num: number) => requeteTexte(`/api/elearning/modules/${num}`);
export const elearningProgression = (num: number, termine: boolean) =>
 requete<{ num: number; termine: boolean }>(`/api/elearning/modules/${num}/progression`, { method: "PUT", body: JSON.stringify({ termine }) });
export const elearningAccesLister = () => requete<ElearningAccesMembre[]>("/api/elearning/acces");
export const elearningAccesModifier = (userId: string, acces: boolean) =>
 requete<ElearningAccesMembre>(`/api/elearning/acces/${userId}`, { method: "PUT", body: JSON.stringify({ acces }) });
export const elearningAdminAbonnements = () => requete<ElearningAbonnementAdmin[]>("/api/elearning/admin/abonnements");
export const elearningAdminModifier = (tenantId: string, statut: "actif" | "resilie" | "inactif") =>
 requete<{ tenant_id: string; statut: string; mode?: string | null }>(`/api/elearning/admin/abonnements/${tenantId}`, { method: "PUT", body: JSON.stringify({ statut }) });
