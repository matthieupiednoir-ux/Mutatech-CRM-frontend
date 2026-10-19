// --- Auth ---
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id?: string;
  produit?: string;
  nom?: string;
  email?: string;
  tenant_id?: string;
  role?: string;
}

export interface UserMe {
  id: string;
  email: string;
  nom?: string;
  produit?: string;
  tenant_id?: string;
  role?: string;
}

export interface TenantConfig {
  nom_entreprise?: string;
  logo_url?: string;
  couleur_principale?: string;
  couleur_primaire?: string;
  couleur_secondaire?: string;
  siret?: string;
  tva_intracommunautaire?: string;
  adresse?: string;
  telephone?: string;
  email_contact?: string;
  site_web?: string;
  mentions_legales?: string;
  taux_tva_defaut?: number;
  // Liste d'identifiants d'onglets masques, separes par des virgules
  // (ex: "prospects,depenses") -- pilote l'affichage de la navigation
  // CRM selon le metier du tenant (ex: une coiffeuse n'a pas besoin de
  // Prospects). Null/vide = tous les onglets sont affiches.
  onglets_masques?: string | null;
  // Theme visuel choisi par le tenant (voir /parametres) -- "defaut" si
  // non renseigne. Pilote body[data-theme] dans NavBar.tsx, qui bascule
  // toute la palette de couleurs via des variables CSS (globals.css).
  theme?: string | null;
}

// --- Catalogue produits/services ---
export type TypeFacturationProduit = "ponctuelle" | "abonnement";

export interface ProduitCatalogue {
  id: string;
  nom: string;
  description?: string | null;
  type_facturation: TypeFacturationProduit;
  prix: number;
  taux_tva: number;
  actif: boolean;
  cree_le?: string;
}

export interface ProduitCatalogueInput {
  nom: string;
  description?: string | null;
  type_facturation?: TypeFacturationProduit;
  prix: number;
  taux_tva?: number;
  actif?: boolean;
}

export interface GoogleStatus {
  connecte: boolean;
  email?: string;
}

export interface CreerClientInput {
  email: string;
  nom?: string;
  nom_entreprise?: string;
  produit?: string;
  mot_de_passe?: string;
}

export interface ClientCreeOut {
  id: string;
  email: string;
  nom?: string;
  nom_entreprise?: string;
  produit?: string;
  invitation_url?: string;
}

// --- Ligne commune devis / facture ---
export interface Ligne {
  description: string;
  quantite: number;
  prix_unitaire: number;
  unite?: string | null;
}

// --- Clients ---
export interface Client {
  id: string;
  nom: string;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  secteur?: string | null;
  activite_description?: string | null;
  siret?: string | null;
  tva_intracommunautaire?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface ClientInput {
  nom: string;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  secteur?: string | null;
  activite_description?: string | null;
  siret?: string | null;
  tva_intracommunautaire?: string | null;
  notes?: string | null;
}

// --- Devis ---
// IMPORTANT : ces champs sont alignes exactement sur schemas_crm.py
// (DevisCreate / DevisOut) cote backend CRM. Ne pas renommer sans
// verifier le schema serveur -- un ecart ici cause un 422 silencieux
// ou une perte de donnees (champ envoye mais jamais persiste).
export type StatutDevis = "brouillon" | "envoye" | "accepte" | "refuse";
export type TypeFacturation = "ponctuelle" | "abonnement";

export interface Devis {
  id: string;
  numero: string;
  statut: StatutDevis;
  type_facturation?: TypeFacturation | null;
  client?: Client | null;
  client_id: string;
  objet?: string | null;
  contexte?: string | null;
  lignes: Ligne[];
  taux_tva: number;
  date_creation?: string;
  drive_file_url?: string | null;
  token_signature?: string | null;
  signe_le?: string | null;
  montant_mensuel?: number | null;
  duree_mois?: number | null;
  date_debut_abonnement?: string | null;
  premier_versement?: number | null;
}

export interface DevisInput {
  client_id: string;
  objet?: string | null;
  contexte?: string | null;
  taux_tva: number;
  lignes: Ligne[];
  type_facturation?: TypeFacturation;
  montant_mensuel?: number | null;
  duree_mois?: number | null;
  date_debut_abonnement?: string | null;
  premier_versement?: number | null;
}

export interface DevisPublic {
  id: string;
  numero: string;
  statut: StatutDevis;
  objet?: string | null;
  contexte?: string | null;
  lignes: Ligne[];
  taux_tva: number;
  client?: Client | null;
  client_nom?: string | null;
  date_creation?: string;
  signature_image?: string | null;
  signe_le?: string | null;
  nom_entreprise?: string | null;
  logo_url?: string | null;
  mentions_legales?: string | null;
  type_facturation?: TypeFacturation | null;
  montant_mensuel?: number | null;
  duree_mois?: number | null;
}

// --- Factures ---
export type StatutFacture = "brouillon" | "envoyee" | "payee";

export interface Facture {
  id: string;
  numero: string;
  statut: StatutFacture;
  client?: Client | null;
  client_id?: string | null;
  devis_id?: string | null;
  objet?: string | null;
  lignes: Ligne[];
  taux_tva: number;
  date_creation?: string;
  date_envoi?: string | null;
  date_echeance?: string | null;
  payee_le?: string | null;
  notes?: string | null;
}

export interface FactureInput {
  client_id?: string | null;
  devis_id?: string | null;
  objet?: string | null;
  lignes: Ligne[];
  taux_tva: number;
  date_echeance?: string | null;
  notes?: string | null;
}

// --- Abonnements & Échéances ---
export interface MoisAbonnement {
  mois_index: number;
  label: string;
  montant: number;
  facture_id?: string | null;
  facture_numero?: string | null;
  statut?: string | null;
  date_prevue?: string | null;
}

export interface EcheanceFacture {
  id: string;
  numero: string;
  client_nom: string;
  montant_ttc?: number | null;
  date_echeance?: string | null;
  jours?: number | null;
}

export interface AbonnementAFacturer {
  devis_id: string;
  devis_numero: string;
  client_nom: string;
  montant_mensuel: number;
  mois_index: number;
}

export interface RecapEcheances {
  en_retard: EcheanceFacture[];
  a_venir: EcheanceFacture[];
  abonnements_a_facturer: AbonnementAFacturer[];
}

// --- Dépenses ---
export type TypeDepense = "ponctuelle" | "recurrente";
export type FrequenceDepense = "mensuelle" | "annuelle";

export interface Depense {
  id: string;
  libelle: string;
  montant: number;
  categorie?: string | null;
  type?: TypeDepense | null;
  frequence?: FrequenceDepense | null;
  actif?: boolean | null;
  date_depense?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  notes?: string | null;
}

export interface DepenseInput {
  libelle: string;
  montant: number;
  categorie?: string | null;
  type?: string | null;
  frequence?: string | null;
  actif?: boolean | null;
  date_depense?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  notes?: string | null;
}

// --- Tâches ---
export type StatutTache = "todo" | "prog" | "done";

export interface Tache {
  id: string;
  titre: string;
  statut: StatutTache;
  priorite?: number | null;
  pilier?: number | null;
  ordre?: number | null;
  description?: string | null;
  date_echeance?: string | null;
  client_id?: string | null;
  client?: Client | null;
  created_at?: string;
}

export interface TacheInput {
  titre: string;
  statut?: StatutTache;
  priorite?: number | null;
  pilier?: number | null;
  ordre?: number | null;
  description?: string | null;
  date_echeance?: string | null;
  client_id?: string | null;
}

// --- Prospects ---
export type StatutProspect = "a_contacter" | "contacte" | "rdv_planifie" | "converti" | "perdu";

export interface Prospect {
  id: string;
  nom: string;
  statut: StatutProspect;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  secteur?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string;
}

export interface ProspectInput {
  nom: string;
  statut?: StatutProspect;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  secteur?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// --- Agent IA ---
export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  actions_effectuees?: string[];
}

export interface ConfirmationRequise {
  outil: string;
  args: Record<string, unknown>;
  libelle: string;
}

export interface AgentResponse {
  reply: string;
  actions_effectuees?: string[];
  confirmation_requise?: ConfirmationRequise | null;
}

// --- IDEL ---
export type ZoneDeplacement = "plaine" | "montagne" | "tres_montagneux" | "pied_ski";

export type LpsChoisi =
  | "vega" | "albus" | "simply_vitale" | "agathe_you"
  | "ozzen" | "desmos" | "carecare" | "infimax" | "autre";

export interface IdelMe {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  lps_utilise: LpsChoisi;
  ville?: string | null;
  telephone?: string | null;
  numero_adeli_rpps?: string | null;
}

export interface IdelUpdateInput {
  lps_utilise?: LpsChoisi;
  ville?: string | null;
  telephone?: string | null;
  numero_adeli_rpps?: string | null;
}

export interface IdelPatient {
  id: string;
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  numero_secu?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  medecin_traitant?: string | null;
  notes?: string | null;
  // Déplacement NGAP
  zone_deplacement?: ZoneDeplacement | null;
  distance_km?: number | null;
  idel_id?: string | null;
}

// Résultat de POST /api/patients/import-lot : les doublons (même NIR, ou
// même nom + prénom + date de naissance) sont ignorés, pas recréés.
export interface ImportPatientsResultat {
  crees: IdelPatient[];
  doublons_ignores: string[];
}

export interface CotationOut {
  id?: string;
  code_acte: string;
  libelle?: string | null;
  coefficient?: number | null;
  quantite?: number | null;
  montant_unitaire?: number | null;
  montant_total?: number | null;
  majoration_dimanche_ferie?: boolean;
  majoration_nuit?: boolean;
  date_soin?: string | null;
}

// Une ligne d'acte saisie par l'IDEL (code AMI/AIS avec coefficient, ou
// forfait BSA/BSB/BSC). Les majorations et déplacements sont portés par
// la séance (SeanceCotation), pas par chaque ligne.
export interface ActeSaisi {
  code_acte: string;
  libelle?: string | null;
  coefficient?: number | null;
}

export type NuitPlage = "20h_23h_5h_8h" | "23h_5h";
export type ZoneIk = "plaine" | "montagne" | "pied_ski";

export interface SeanceCotation {
  lignes: ActeSaisi[];
  dimanche_ferie: boolean;
  nuit: NuitPlage | null;
  domicile: boolean;
  distance_km: number;
  zone: ZoneIk;
  mci: boolean;
  nb_seances: number;
  date_soin?: string | null;
}

// Calcul renvoyé par le moteur NGAP unique du serveur (POST /api/ngap/simuler) :
// l'écran l'affiche tel quel, la validation enregistre exactement le même.
export interface LigneSimulee {
  code_acte: string;
  libelle: string;
  type: "acte" | "forfait" | "majoration" | "deplacement";
  coefficient?: number | null;
  taux: number;
  quantite: number;
  montant_unitaire: number;
  montant_total: number;
  detail?: string;
}

export interface SimulationNGAP {
  lignes: LigneSimulee[];
  montant_seance: number;
  nb_seances: number;
  montant_total: number;
  regles: string[];
  alertes: string[];
  tarifs: string;
}

export interface ActeReferentiel {
  id: string;
  code_acte: string;
  libelle: string;
  lettre_cle: string;
  coefficient: number;
}

export interface PropositionCotation {
  acte_prescrit_texte?: string | null;
  propositions: (ActeReferentiel & { quantite: number })[];
  passages_par_jour: number;
  mci_suggeree: boolean;
  alertes: string[];
  simulation: SimulationNGAP | null;
  confiance: number;
}

export type StatutFse = "non_transmise" | "transmise" | "payee" | "rejetee";

export interface FactureResume {
  id: string;
  montant_total: number;
  statut_fse: StatutFse;
  numero?: string | null;
  date_transmission_lps?: string | null;
  date_paiement?: string | null;
  retour_noemie?: string | null;
}

export interface IdelOrdonnance {
  id: string;
  statut: "reception" | "en_cours" | "traite";
  idel_id?: string | null;
  soignante?: string | null;
  patient?: IdelPatient | null;
  medecin_prescripteur?: string | null;
  rpps_prescripteur?: string | null;
  date_prescription?: string | null;
  acte_prescrit_texte?: string | null;
  duree_traitement?: string | null;
  cotations?: CotationOut[] | null;
  confiance_ocr?: number | null;
  necessite_validation?: boolean | null;
  date_reception?: string | null;
  fichier_nom_original?: string | null;
  a_fichier?: boolean;
  facture?: FactureResume | null;
}

export interface OrdonnanceSaisie {
  patient_id?: string | null;
  medecin_prescripteur?: string | null;
  rpps_prescripteur?: string | null;
  date_prescription?: string | null;
  acte_prescrit_texte?: string | null;
  duree_traitement?: string | null;
}

// --- Fiche de reprise assistée (point 3 : ressaisie manuelle dans le LPS) ---
export interface FicheRepriseActe {
  code: string;
  libelle?: string | null;
  coefficient?: number | null;
  quantite?: number | null;
  majorations: { dimanche_ferie: boolean; nuit: boolean };
  date_soin?: string | null;
  montant?: number | null;
}

export interface FicheReprise {
  idel: string;
  rpps_idel?: string | null;
  lps_cible: string;
  patient: {
    nom: string;
    prenom: string;
    date_naissance?: string | null;
    numero_secu?: string | null;
  };
  prescription: {
    medecin?: string | null;
    rpps?: string | null;
    date?: string | null;
  };
  actes_a_saisir: FicheRepriseActe[];
  montant_total_estime: number;
  instructions: string;
}


// --- Organisations multi-tenant PSDM (backend IDEL) ---
export type OrganizationType = "idel_independant" | "psdm" | "autre";

export type ModuleType =
  | "idel_ngap"
  | "tournees"
  | "commandes_pharma"
  | "ordonnances_vision"
  | "agenda";

export type OrgUserRole = "mutatech_admin" | "org_admin" | "gerant" | "idec" | "idel";

export interface Organization {
  id: string;
  nom: string;
  type: OrganizationType;
  actif: boolean;
  date_creation: string;
  modules_actifs: ModuleType[];
}

export interface OrganizationCreateInput {
  nom: string;
  type: OrganizationType;
}

export interface OrgUserCreateInput {
  email: string;
  password: string;
  role: OrgUserRole;
  nom: string;
  prenom: string;
}

export interface OrgUserCreeOut {
  id: string;
  email: string;
  role: OrgUserRole;
}

export const MODULE_LABELS: Record<ModuleType, string> = {
  idel_ngap: "NGAP / Cotation",
  tournees: "Tournées",
  commandes_pharma: "Commandes Pharma",
  ordonnances_vision: "Ordonnances (IA)",
  agenda: "Agenda",
};

export interface OrgUser {
  id: string;
  email: string;
  role: OrgUserRole;
  nom: string;
  prenom: string;
  actif: boolean;
  date_creation: string;
}

export interface OrgUserUpdateInput {
  role?: OrgUserRole;
  nom?: string;
  prenom?: string;
  actif?: boolean;
  password?: string;
}
