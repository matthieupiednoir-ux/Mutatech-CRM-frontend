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

  type_facturation: string; // "ponctuelle" | "abonnement"
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

  type_facturation?: string; // "ponctuelle" | "abonnement" — défaut backend: ponctuelle
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
  statut: string; // "a_venir" | "a_generer" | "brouillon" | "envoyee" | "payee"
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
  jours: number; // positif = jours de retard, négatif = jours restants
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

export interface Depense {
  id: string;
  libelle: string;
  categorie?: string | null;
  montant: number;
  type: string; // "ponctuelle" | "recurrente"
  date_depense?: string | null;
  frequence?: string | null; // "mensuelle" | "annuelle"
  date_debut?: string | null;
  date_fin?: string | null;
  actif: boolean;
  notes?: string | null;
}

export interface DepenseInput {
  libelle: string;
  categorie?: string;
  montant: number;
  type: string;
  date_depense?: string;
  frequence?: string;
  date_debut?: string;
  date_fin?: string;
  actif: boolean;
  notes?: string;
}
