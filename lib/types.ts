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
}

export interface DevisInput {
  client_id: string;
  objet?: string;
  contexte?: string;
  taux_tva: number;
  lignes: Ligne[];
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

export interface GoogleStatus {
  connecte: boolean;
}
