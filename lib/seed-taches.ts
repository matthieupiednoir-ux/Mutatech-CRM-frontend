// Données reprises de Mutatech-Todo-Liste.html (Piliers 1 à 9) — pour
// import unique vers la base de données (bouton "Importer les anciennes
// données" sur la page Tâches).

import { TacheInput } from "./types";

export const TACHES_SEED: TacheInput[] = [
  // --- Pilier 1 : Structure juridique & administrative ---
  { pilier: 1, titre: "Créer la micro-entreprise (INPI)", description: "Demande soumise. SIRET reçu.", statut: "done", ordre: 0 },
  { pilier: 1, titre: "Recevoir le SIRET et finaliser l'immatriculation", description: "SIRET 106 418 619 00016 — micro-entreprise officiellement immatriculée.", statut: "done", ordre: 1 },
  { pilier: 1, titre: "Ouvrir un compte bancaire professionnel", description: "Shine (shine.fr) ou Qonto (qonto.com).", statut: "todo", ordre: 2 },
  { pilier: 1, titre: "Acheter le domaine mutatech.fr", description: "Domaine acheté via Squarespace. Google Workspace configuré.", statut: "done", ordre: 3 },
  { pilier: 1, titre: "Créer l'email contact@mutatech.fr", description: "Google Workspace configuré.", statut: "done", ordre: 4 },

  // --- Pilier 2 : Identité de marque & site web ---
  { pilier: 2, titre: "Définir l'identité de marque Mutatech", description: "Palette violet/teal, typographies Syne + Inter.", statut: "done", ordre: 0 },
  { pilier: 2, titre: "Créer et déployer le site web une page", description: "Largeur élargie (1180px) et typo des chiffres clés corrigée.", statut: "done", ordre: 1 },
  { pilier: 2, titre: "Connecter mutatech.fr à Netlify (DNS)", description: "Domaine rattaché, déploiement GitHub.", statut: "done", ordre: 2 },
  { pilier: 2, titre: "Créer le logo final", description: "Icône éclair dégradé violet/vert + typographie Syne.", statut: "done", ordre: 3 },
  { pilier: 2, titre: "Créer la page LinkedIn Mutatech", description: "Lien ajouté dans le footer (linkedin.com/company/mutatech).", statut: "done", ordre: 4 },
  { pilier: 2, titre: "Ajouter Instagram et LinkedIn sur le site", description: "@mutatech06 sur Instagram, ajoutés dans le footer.", statut: "done", ordre: 5 },
  { pilier: 2, titre: "Créer le simulateur IA interactif", description: "Page simulateur.html — 3 questions, recommandation personnalisée.", statut: "done", ordre: 6 },
  { pilier: 2, titre: "Intégrer Google Analytics", description: "Suivi installé + événements personnalisés.", statut: "done", ordre: 7 },
  { pilier: 2, titre: "Sécuriser l'espace collaborateur (2FA)", description: "Authentification TOTP, Google Authenticator.", statut: "done", ordre: 8 },
  { pilier: 2, titre: "Migrer le déploiement vers GitHub", description: "Repo mutatech-site, déploiement continu Netlify.", statut: "done", ordre: 9 },
  { pilier: 2, titre: "Créer le Google Business Profile", description: "Fiche Google Maps pour la visibilité locale en PACA.", statut: "todo", ordre: 10 },

  // --- Pilier 3 : Documents commerciaux ---
  { pilier: 3, titre: "Offres tarifaires & pitchs (Médical + Artisans)", description: "4 offres par niche, 3 pitchs, objections.", statut: "done", ordre: 0 },
  { pilier: 3, titre: "Proposition commerciale type (devis)", description: "Générée automatiquement depuis le CRM (PDF + signature électronique).", statut: "done", ordre: 1 },
  { pilier: 3, titre: "Kit onboarding client (guide de bienvenue)", description: "Contacts, checklist, déroulement, FAQ.", statut: "done", ordre: 2 },
  { pilier: 3, titre: "Plan de lancement 90 jours", description: "13 semaines, checklist, KPIs, budget.", statut: "done", ordre: 3 },
  { pilier: 3, titre: "Dossier de référence 10 outils IA SSIAD", description: "60+ pages, fiche par outil.", statut: "done", ordre: 4 },
  { pilier: 3, titre: "Business plan financier 3 ans", description: "Curseurs, projections, 3 scénarios.", statut: "done", ordre: 5 },
  { pilier: 3, titre: "Emails de prospection prêts à envoyer", description: "Séquences IDEC/SSIAD, médecins, artisans.", statut: "todo", ordre: 6 },
  { pilier: 3, titre: "Modèle de rapport de diagnostic", description: "Document remis au client après chaque diagnostic.", statut: "todo", ordre: 7 },

  // --- Pilier 4 : Présentations client ---
  { pilier: 4, titre: "Présentation IDEC SSIAD (10 slides)", description: "Défis, méthode, résultats, sécurité, CTA.", statut: "done", ordre: 0 },
  { pilier: 4, titre: "Présentation Artisans (9 slides)", description: "Problèmes, offres, outils, financement OPCO.", statut: "done", ordre: 1 },
  { pilier: 4, titre: "Présentation stratégie IA SSIAD JMS+ (11 slides)", description: "ROI chiffré, tarifs, sécurité HDS — contrat signé.", statut: "done", ordre: 2 },
  { pilier: 4, titre: "Présentation cabinets médicaux libéraux", description: "Médecins, kinés, dentistes.", statut: "todo", ordre: 3 },
  { pilier: 4, titre: "Présentation générique PME (toutes niches)", description: "Version universelle hors niches médicale/artisanale.", statut: "todo", ordre: 4 },

  // --- Pilier 5 : Documents juridiques & conformité ---
  { pilier: 5, titre: "Contrat de prestation de services", description: "12 articles : objet, tarifs, RGPD santé, résiliation.", statut: "done", ordre: 0 },
  { pilier: 5, titre: "DPA — Accord de Traitement des Données", description: "Conforme Article 28 RGPD.", statut: "done", ordre: 1 },
  { pilier: 5, titre: "Politique de confidentialité (mutatech.fr)", description: "Collecte, durées, droits RGPD, cookies.", statut: "done", ordre: 2 },
  { pilier: 5, titre: "Charte usage IA, Registre EU AI Act & RGPD santé", description: "Réalisé pour JMS+, réutilisable.", statut: "done", ordre: 3 },
  { pilier: 5, titre: "Faire relire les documents juridiques par un avocat", description: "Avocat RGPD/droit numérique — 300-800€.", statut: "todo", ordre: 4 },
  { pilier: 5, titre: "Souscrire une assurance RC Professionnelle", description: "Hiscox.fr ou Simplis.com — obligatoire.", statut: "todo", ordre: 5 },

  // --- Pilier 6 : Prospection & acquisition clients ---
  { pilier: 6, titre: "Créer la page LinkedIn Mutatech", description: "Page entreprise créée, premier post publié.", statut: "done", ordre: 0 },
  { pilier: 6, titre: "Décrocher le premier client signé — SSIAD JMS+", description: "Contrat remporté, devis signé via le CRM.", statut: "done", ordre: 1 },
  { pilier: 6, titre: "Envoyer 20 emails de prospection", description: "10 médicaux + 10 artisans.", statut: "todo", ordre: 2 },
  { pilier: 6, titre: "Appeler la CMA 06 (Chambre des Métiers)", description: "RDV responsable numérique.", statut: "todo", ordre: 3 },
  { pilier: 6, titre: "Contacter l'URPS médecins / infirmiers PACA", description: "Proposer une intervention 20 min.", statut: "todo", ordre: 4 },
  { pilier: 6, titre: "Réaliser 2 diagnostics offerts (réseau proche)", description: "Diagnostics gratuits → témoignages.", statut: "todo", ordre: 5 },
  { pilier: 6, titre: "Lancer la stratégie LinkedIn (plan 30 posts)", description: "Calendrier éditorial complet.", statut: "done", ordre: 6 },

  // --- Pilier 7 : Partenariats & financement client ---
  { pilier: 7, titre: "Devenir prestataire référencé OPCO AKTO", description: "Formations financées pour les artisans clients.", statut: "todo", ordre: 0 },
  { pilier: 7, titre: "Dossier BPI France — Diag IA", description: "Clients PME financés jusqu'à 5 000€.", statut: "todo", ordre: 1 },
  { pilier: 7, titre: "Accréditation DPC (secteur médical)", description: "Formations soignants financées par l'État.", statut: "todo", ordre: 2 },
  { pilier: 7, titre: "Partenariat expert-comptable local", description: "Accord apporteur d'affaires.", statut: "todo", ordre: 3 },

  // --- Pilier 8 : Outil Orchestrateur IA & Audit ---
  { pilier: 8, titre: "POC Audit → Stratégie IA → Cockpit (Orchestrator)", description: "Next.js + FastAPI, analyse réelle via Claude.", statut: "done", ordre: 0 },
  { pilier: 8, titre: "Authentification TOTP sur l'Orchestrator", description: "Cookie httpOnly côté serveur.", statut: "done", ordre: 1 },
  { pilier: 8, titre: "Construire l'outil Audit Diagnostic (PDF)", description: "Données embarquées dans les métadonnées du PDF.", statut: "done", ordre: 2 },
  { pilier: 8, titre: "Import du PDF diagnostic dans l'Orchestrateur", description: "Pré-remplissage automatique + contexte à l'IA.", statut: "done", ordre: 3 },
  { pilier: 8, titre: "Mutualisation infra IA (backend)", description: "Whisper/LLM mutualisés entre clients.", statut: "done", ordre: 4 },
  { pilier: 8, titre: "Connecter une vraie base Postgres persistante (Railway)", description: "Confirmé fonctionnel.", statut: "done", ordre: 5 },
  { pilier: 8, titre: "Sécuriser l'API backend avec un token", description: "Empêcher les appels directs hors frontend.", statut: "todo", ordre: 6 },
  { pilier: 8, titre: "Premier provisionnement OVHcloud réel", description: "Compte + clés S3 + jeton API pour JMS+.", statut: "todo", ordre: 7 },

  // --- Pilier 9 : CRM Mutatech ---
  { pilier: 9, titre: "Gestion des clients (CRUD)", description: "Fiche complète + contexte d'activité (SSIAD).", statut: "done", ordre: 0 },
  { pilier: 9, titre: "Génération de devis (PDF + sauvegarde Drive)", description: "Bloc émetteur légal, mention HDS automatique.", statut: "done", ordre: 1 },
  { pilier: 9, titre: "Signature électronique des devis", description: "Lien sécurisé par email, copie au client + Matthieu.", statut: "done", ordre: 2 },
  { pilier: 9, titre: "Facturation (devis ou de zéro, envoi Gmail)", description: "Reprise automatique des lignes du devis.", statut: "done", ordre: 3 },
  { pilier: 9, titre: "Connexion Google OAuth (Drive + Gmail)", description: "Refresh_token persistant en base.", statut: "done", ordre: 4 },
  { pilier: 9, titre: "Migrer la To-do et la Prospection vers la base", description: "Pages Tâches/Prospects créées — import des données en cours.", statut: "done", ordre: 5 },
  { pilier: 9, titre: "Ajouter une carte interactive sur Prospects", description: "L'ancien outil avait une carte Leaflet — à reproduire.", statut: "todo", ordre: 6 },
  { pilier: 9, titre: "Agent IA dans l'espace collaborateur", description: "Assistant Claude avec accès aux outils, confirmation avant action.", statut: "todo", ordre: 7 },
];
