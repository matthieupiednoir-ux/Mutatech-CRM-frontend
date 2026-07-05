// types.ts — Types TypeScript pour le CRM Mutatech SaaS

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  tenant_id: string | null;
  role: string;
  produit: string;
  nom: string | null;
  email: string;
}

export interface UserMe {
  id: string;
  email: string;
  nom: string | null;
  role: string;
  tenant_id: string | null;
  produit: string;
}

export interface TenantConfig {
  nom_entreprise: string | null;
  logo_url: string | null;
  couleur_primaire: string | null;
  couleur_secondaire: string | null;
}

// --- Admin ---
export interface CreerClientInput {
  email: string;
  nom?: string;
  nom_entreprise?: string;
  produit: string;
  envoyer_email?: boolean;
}

export interface ClientCreeOut {
  tenant_id: string;
  user_id: string;
  email: string;
  mot_de_passe_temporaire: string;
  produit: string;
}

// --- CRM ---
export interface Client {
  id: string;
  nom: string;
  secteur?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  siret?: string | null;
  notes?: string | null;
  activite_description?: string | null;
  cree_le: string;
}

export interface ClientInput {
  nom: string;
  secteur?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  siret?: string;
  notes?: string;
  activite_description?: string;
}

export interface Ligne {
  id?: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
}

export interface Devis {
  id: string;
  numero: string;
  client_id: string;
  objet?: string | null;
  contexte?: string | null;
  date_creation: string;
  taux_tva: number;
  statut: string;
  drive_file_url?: string | null;
  signe_le?: string | null;
  lignes: Ligne[];
  client?: Client | null;
  type_facturation: string;
  montant_mensuel?: number | null;
  duree_mois?: number | null;
  date_debut_abonnement?: string | null;
  premier_versement?: number | null;
}

export interface DevisPublic {
  numero: string;
  objet?: string | null;
  contexte?: string | null;
  date_creation: string;
  taux_tva: number;
  statut: string;
  signature_image?: string | null;
  signe_le?: string | null;
  lignes: Ligne[];
  client_nom: string;
  type_facturation: string;
  montant_mensuel?: number | null;
  duree_mois?: number | null;
  date_debut_abonnement?: string | null;
  premier_versement?: number | null;
}

export interface DevisInput {
  client_id: string;
  objet?: string;
  contexte?: string;
  taux_tva: number;
  lignes: Ligne[];
  type_facturation?: string;
  montant_mensuel?: number;
  duree_mois?: number;
  date_debut_abonnement?: string;
  premier_versement?: number;
}

export interface MoisAbonnement {
  mois_index: number;
  date_prevue: string;
  montant: number;
  facture_id?: string | null;
  facture_numero?: string | null;
  statut: string;
}

export interface Facture {
  id: string;
  numero: string;
  client_id: string;
  devis_id?: string | null;
  objet?: string | null;
  date_creation: string;
  date_echeance?: string | null;
  taux_tva: number;
  statut: string;
  drive_file_url?: string | null;
  envoyee_le?: string | null;
  payee_le?: string | null;
  derniere_relance_le?: string | null;
  lignes: Ligne[];
  client?: Client | null;
}

export interface FactureInput {
  client_id: string;
  devis_id?: string;
  objet?: string;
  taux_tva: number;
  date_echeance?: string;
  lignes: Ligne[];
}

export interface EcheanceFacture {
  id: string;
  numero: string;
  client_nom: string;
  montant_ttc: number;
  date_echeance: string;
  jours: number;
  derniere_relance_le?: string | null;
}

export interface AbonnementAFacturer {
  devis_id: string;
  devis_numero: string;
  client_nom: string;
  mois_index: number;
  montant: number;
  date_prevue: string;
}

export interface RecapEcheances {
  en_retard: EcheanceFacture[];
  a_venir: EcheanceFacture[];
  abonnements_a_facturer: AbonnementAFacturer[];
}

export interface GoogleStatus {
  connecte: boolean;
}

export interface Depense {
  id: string;
  libelle: string;
  montant: number;
  categorie: string;
  date_depense: string;
  type?: string | null;
  recurrente: boolean;
  periodicite?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  notes?: string | null;
}

export interface DepenseInput {
  libelle: string;
  montant: number;
  categorie: string;
  date_depense: string;
  recurrente: boolean;
  periodicite?: string;
  date_fin?: string;
  notes?: string;
}

export interface Tache {
  id: string;
  pilier: number;
  titre: string;
  description?: string | null;
  statut: string;
  ordre: number;
}

export interface TacheInput {
  pilier: number;
  titre: string;
  description?: string;
  statut: string;
  ordre: number;
}

export interface Prospect {
  id: string;
  nom: string;
  secteur?: string | null;
  email?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  statut: string;
  notes?: string | null;
}

export interface ProspectInput {
  nom: string;
  secteur?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  latitude?: number;
  longitude?: number;
  statut: string;
  notes?: string;
}

// --- Agent IA ---
export interface AgentMessage {
  role: string;
  content: string;
  actions_effectuees?: string[];
}

export interface AgentResponse {
  reply: string;
  actions_effectuees: string[];
}

// --- IDEL ---
export interface IdelPatient {
  id: string;
  nom: string;
  prenom: string;
  date_naissance?: string | null;
  numero_secu?: string | null;
  adresse?: string | null;
  telephone?: string | null;
  medecin_traitant?: string | null;
}

export interface CotationOut {
  code_acte: string;
  libelle: string;
  coefficient?: number | null;
  quantite?: number | null;
  modificateurs?: string[] | null;
  montant_unitaire?: number | null;
  montant_total?: number | null;
}

export interface CotationValidationItem {
  code_acte: string;
  quantite: number;
  modificateurs: string[];
}

export interface IdelOrdonnance {
  id: string;
  statut: string;
  patient?: IdelPatient | null;
  medecin_prescripteur?: string | null;
  date_prescription?: string | null;
  acte_prescrit_texte?: string | null;
  confiance_ocr?: number | null;
  necessite_validation?: boolean;
  cotations?: CotationOut[] | null;
  created_at?: string | null;
}
