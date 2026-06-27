// Données reprises de Mutatech-Prospection-Manager.html — pour import unique
// vers la base de données (bouton "Importer les anciennes données").

export interface ProspectBrut {
  niche: "med" | "art";
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  rating: string;
  status: "todo" | "contacted" | "rdv";
}

export const PROSPECTS_BRUTS: ProspectBrut[] = [
  { niche: "med", name: "SSIAD Mutuelles du Soleil", category: "SSIAD", address: "33 Av. George V, 06000 Nice", phone: "+33493530279", website: "", rating: "★ 3.7 (3 avis)", status: "todo" },
  { niche: "med", name: "Association Sud Services", category: "Soins à domicile", address: "86 Bis Bd Jean Behra, 06100 Nice", phone: "+33493529237", website: "", rating: "★ 3.0 (2 avis)", status: "todo" },
  { niche: "med", name: "Cabinet KINESTEA — Adelina Nistea", category: "Kinésithérapeute", address: "26 Av. du Maréchal Foch, 06000 Nice", phone: "+33493804494", website: "https://calendly.com/kinestea-hc/20min", rating: "★ 5.0 (29 avis)", status: "todo" },
  { niche: "med", name: "Aqua Kiné Azur", category: "Centre kiné", address: "2 Av. Baquis, 06000 Nice", phone: "+33493850502", website: "https://www.doctolib.fr/cabinet-de-kinesitherapie/nice/aquakine-azur", rating: "★ 4.8 (529 avis)", status: "todo" },
  { niche: "med", name: "Centre kiné'thérapie — Stéphanie Sibony", category: "Kinésithérapeute", address: "4 Rue Châteauneuf, 06000 Nice", phone: "+33493968943", website: "http://www.centre-stephanie-sibony.com/", rating: "★ 4.8 (75 avis)", status: "todo" },
  { niche: "med", name: "Kinésithérapeute Bigand Amandine", category: "Kinésithérapeute", address: "34 Rue Paul Déroulède, 06000 Nice", phone: "+33782045285", website: "", rating: "★ 5.0 (802 avis)", status: "todo" },
  { niche: "med", name: "Cabinet Physio·Lab'", category: "Kinésithérapeute", address: "41 Bd Gambetta, 06000 Nice", phone: "+33955907261", website: "", rating: "★ 5.0 (126 avis)", status: "todo" },
  { niche: "med", name: "Maison médicale de Carros — MMF Santé", category: "Centre médical", address: "5 Bd de la Colle Belle, 06510 Carros", phone: "+33412050210", website: "https://www.mmf-sante.fr/maison-medicale-carros/", rating: "★ 4.3 (296 avis)", status: "todo" },
  { niche: "art", name: "Votre Artisan Français — Plombier", category: "Plombier", address: "2 Rue Antoine Gautier, 06300 Nice", phone: "+33422131845", website: "https://www.vaf-plombier.fr/", rating: "★ 5.0 (160 avis)", status: "todo" },
  { niche: "art", name: "Plombier Nice — Ets Millo & Fils", category: "Plombier", address: "227 Av. de Fabron, 06200 Nice", phone: "+33483453212", website: "http://plomberie-millo.fr/", rating: "★ 5.0 (35 avis)", status: "todo" },
  { niche: "art", name: "FT Plomberie", category: "Plombier", address: "1 Rue Cais de Gilette, 06300 Nice", phone: "+33658616701", website: "https://www.ft-plomberie.fr/", rating: "★ 4.9 (647 avis)", status: "todo" },
  { niche: "art", name: "Ets Visery — Plombier", category: "Plombier", address: "12 Quai Papacino, 06300 Nice", phone: "+33782616680", website: "https://lgp-plomberie.fr/", rating: "★ 4.8 (186 avis)", status: "todo" },
  { niche: "art", name: "AAPC — Azur Artisan Plombier Chauffagiste", category: "Plombier chauffagiste", address: "99 Chem. des Salles, 06800 Cagnes-sur-Mer", phone: "+33953899145", website: "http://azurartisan.fr/", rating: "★ 5.0 (83 avis)", status: "todo" },
  { niche: "art", name: "j.a.m.s électricité", category: "Électricien", address: "11 B Rue Marceau, 06000 Nice", phone: "+33623533451", website: "https://jams-electricite.fr/", rating: "★ 5.0 (54 avis)", status: "todo" },
  { niche: "art", name: "Supevolution Électricien", category: "Électricien", address: "3 Pl. Masséna, 06000 Nice", phone: "+33699373869", website: "https://www.electricien-06.fr/", rating: "★ 4.9 (83 avis)", status: "todo" },
  { niche: "art", name: "Fab Electric", category: "Électricien", address: "659 Rte de Bellet, 06200 Nice", phone: "+33661410571", website: "https://fabelectric.jimdo.com/", rating: "★ 5.0 (60 avis)", status: "todo" },
  { niche: "med", name: "Association Vésubienne de Soins à Domicile", category: "SSIAD", address: "Pl. de la Mairie, 06450 Lantosque", phone: "+33493030505", website: "", rating: "", status: "todo" },
  { niche: "art", name: "Ciarlet Électricité Climatisation", category: "Électricien", address: "Loupp, 06450 Lantosque", phone: "+33672492802", website: "", rating: "★ 5.0 (35 avis)", status: "todo" },
  { niche: "art", name: "3S Électricité", category: "Électricien", address: "06450 Lantosque", phone: "+33766773365", website: "", rating: "★ 5.0 (6 avis)", status: "todo" },
  { niche: "med", name: "Franco Serge", category: "Kinésithérapeute", address: "3 Rue de la Justice, 06450 Roquebillière", phone: "+33493035085", website: "", rating: "★ 4.3 (6 avis)", status: "todo" },
  { niche: "med", name: "Bourgin Pascale", category: "Kinésithérapeute", address: "1 Rue de la Placette, 06450 Roquebillière", phone: "+33493034464", website: "", rating: "★ 4.3 (6 avis)", status: "todo" },
  { niche: "med", name: "Cabinet infirmier DELAIRON", category: "Infirmier", address: "13 Rue Dr Matteo, 06450 Roquebillière", phone: "+33610099048", website: "", rating: "", status: "todo" },
  { niche: "art", name: "Électricité dépannage vésubien", category: "Électricien", address: "1 rue des fleurs, 06450 Roquebillière", phone: "+33661228828", website: "", rating: "★ 5.0 (1 avis)", status: "todo" },
  { niche: "art", name: "Gatti Georges", category: "Électricien", address: "8 Rue Alfred Corniglion, 06450 Roquebillière", phone: "+33493034342", website: "", rating: "★ 5.0 (4 avis)", status: "todo" },
  { niche: "art", name: "Guintrand Didier", category: "Électricien", address: "Rue du Vallon, 06450 Roquebillière", phone: "+33627390979", website: "", rating: "", status: "todo" },
  { niche: "art", name: "C.I.P.S Plomberie", category: "Plombier", address: "71 Quartier Les Vignols, 06450 Belvédère", phone: "+33643114990", website: "", rating: "★ 5.0 (33 avis)", status: "todo" },
  { niche: "med", name: "Dadoun Jacques", category: "Médecin généraliste", address: "All. du Dr Fulconis, 06450 Saint-Martin-Vésubie", phone: "+33493033341", website: "", rating: "", status: "todo" },
  { niche: "art", name: "SARL Plomberie Palumbo Laurent", category: "Plombier", address: "1213 Av. Charles Boissier, 06450 Saint-Martin-Vésubie", phone: "+33641804121", website: "", rating: "★ 4.3 (10 avis)", status: "todo" },
  { niche: "art", name: "Eusebi Rénov", category: "Électricien / Plombier", address: "117 Rue Dr Cagnoli, 06450 Saint-Martin-Vésubie", phone: "+33617133896", website: "", rating: "", status: "todo" },
  { niche: "art", name: "Vésubie Peinture", category: "Peintre", address: "73 Av. Charles de Caqueray, 06450 Saint-Martin-Vésubie", phone: "+33612463325", website: "", rating: "", status: "todo" },
  { niche: "med", name: "Infirmières Orsini Audrey & Lapenna Maëva", category: "Infirmier", address: "219 B Chem. Camp Di Monaco, 06670 Levens", phone: "+33607765611", website: "", rating: "★ 5.0 (21 avis)", status: "todo" },
  { niche: "med", name: "Cabinet infirmier Levens", category: "Infirmier", address: "2 Rue de la Terrasse, 06670 Levens", phone: "+33493798215", website: "", rating: "★ 4.7 (13 avis)", status: "todo" },
  { niche: "med", name: "Infirmiers Cabinet La Rosa", category: "Infirmier", address: "461 Av. Général de Gaulle, 06670 Levens", phone: "+33623812727", website: "", rating: "★ 5.0 (2 avis)", status: "todo" },
  { niche: "med", name: "Infirmière libérale Mony Séverine", category: "Infirmier", address: "974C Chem. du Vignal, 06670 Levens", phone: "+33777955635", website: "", rating: "★ 5.0 (9 avis)", status: "todo" },
  { niche: "med", name: "Cabinet kinésithérapie Boffa Dabbene", category: "Kinésithérapeute", address: "645 Av. Général de Gaulle, 06670 Levens", phone: "+33493541213", website: "", rating: "★ 5.0 (2 avis)", status: "todo" },
  { niche: "med", name: "Alfocea Thierry kinésithérapeute", category: "Kinésithérapeute", address: "4 Av. Charles David, 06670 Levens", phone: "+33493794185", website: "", rating: "★ 4.3 (10 avis)", status: "todo" },
  { niche: "art", name: "LCF Energie", category: "Électricien / Plombier", address: "1468 Chem. René Pouchol, 06670 Levens", phone: "+33616355255", website: "", rating: "★ 4.2 (6 avis)", status: "todo" },
  { niche: "art", name: "Plomberie Eureka", category: "Plombier", address: "205 Chemin Louis Masseglia, 06670 Levens", phone: "+33493547422", website: "", rating: "", status: "todo" },
  { niche: "art", name: "Sarl SFB Elec", category: "Électricien", address: "67 Chem. du Vignal, 06670 Levens", phone: "+33609571046", website: "", rating: "★ 5.0 (5 avis)", status: "todo" },
  { niche: "art", name: "LM Tech", category: "Électricien", address: "123 Rte de la Piscine, 06670 Levens", phone: "+33761413106", website: "", rating: "", status: "todo" },
  { niche: "art", name: "Ribas Électricité Générale", category: "Électricien", address: "12 Rue Laurens, 06670 Levens", phone: "+33422165738", website: "", rating: "", status: "todo" },
  { niche: "art", name: "David Terrassement Rénovation Construction", category: "Terrassement / Construction", address: "10 Sainte-Anne, 06670 Levens", phone: "+33624668339", website: "", rating: "★ 5.0 (10 avis)", status: "todo" },
  { niche: "art", name: "Marrale Construction", category: "Maçonnerie", address: "1027 Chem. de l'Ordalena, 06670 Levens", phone: "+33622761680", website: "", rating: "★ 5.0 (10 avis)", status: "todo" },
  { niche: "art", name: "SAS ANT Constructions", category: "Construction", address: "1161 Av. Général de Gaulle, 06670 Levens", phone: "+33603113012", website: "", rating: "★ 5.0 (3 avis)", status: "todo" },
  { niche: "art", name: "Ébénisterie Nouvelle Tradition", category: "Ébéniste", address: "4 Av. Charles David, 06670 Levens", phone: "+33493797560", website: "", rating: "★ 5.0 (1 avis)", status: "todo" },
  { niche: "art", name: "JLO menuiserie", category: "Menuisier", address: "79 Chem. de la Môle, 06670 Levens", phone: "+33668911119", website: "", rating: "★ 5.0 (1 avis)", status: "todo" },
  { niche: "med", name: "Boquel Angélique Infirmière", category: "Infirmier", address: "248 Bd Léon Sauvan, 06690 Tourrette-Levens", phone: "+33749192016", website: "", rating: "★ 5.0 (4 avis)", status: "todo" },
  { niche: "med", name: "Tonkovic Aline", category: "Kinésithérapeute", address: "1716 Chem. du Frogier Supérieur, 06690 Tourrette-Levens", phone: "+33619287754", website: "", rating: "★ 5.0 (12 avis)", status: "todo" },
  { niche: "art", name: "Entreprise Farsetti", category: "Plombier", address: "67 Chem. du Barbe, 06690 Tourrette-Levens", phone: "+33767611847", website: "", rating: "★ 5.0 (15 avis)", status: "todo" },
  { niche: "art", name: "EDP Energy", category: "Électricien", address: "264 Bd Léon Sauvan, 06690 Tourrette-Levens", phone: "+33768243912", website: "", rating: "", status: "todo" },
  { niche: "art", name: "CG Rénovation", category: "Rénovation", address: "65 Chem. du Colombier, 06690 Tourrette-Levens", phone: "+33760904294", website: "", rating: "★ 5.0 (14 avis)", status: "todo" },
  { niche: "art", name: "Sannier Ébénisterie", category: "Ébéniste", address: "414 Rte de Châteauneuf-Villevieille, 06690 Tourrette-Levens", phone: "+33493548351", website: "", rating: "★ 5.0 (4 avis)", status: "todo" },
  { niche: "art", name: "JD Bois Concept", category: "Menuisier", address: "1029 Rte de Châteauneuf-Villevieille, 06690 Tourrette-Levens", phone: "+33616945813", website: "", rating: "★ 5.0 (3 avis)", status: "todo" },
  { niche: "art", name: "INERGIES", category: "Génie climatique RGE", address: "241 Av. du Canton de Levens, 06690 Tourrette-Levens", phone: "+33489033039", website: "", rating: "★ 4.7 (30 avis)", status: "todo" },
  { niche: "art", name: "Julien Contat Menuiserie et Agencement", category: "Menuisier", address: "3 Rue de l'Orangeraie, 06670 Saint-Martin-du-Var", phone: "+33615443088", website: "", rating: "★ 5.0 (2 avis)", status: "todo" },
  { niche: "med", name: "Cassagnabère Patricia / Bouvier Isabelle", category: "Infirmier", address: "1 Rue Gaspard Clerissi, 06790 Aspremont", phone: "+33782650694", website: "", rating: "★ 5.0 (3 avis)", status: "todo" },
  { niche: "med", name: "Cabinet de Kinésithérapie Aspremont", category: "Kinésithérapeute", address: "7 Rte de Castagniers, 06790 Aspremont", phone: "+33493739412", website: "", rating: "★ 4.3 (11 avis)", status: "todo" },
  { niche: "art", name: "Plomberie Obih et Climatisation", category: "Plombier", address: "110 Chem. des Cabanes Inférieures, 06790 Aspremont", phone: "+33620274529", website: "", rating: "★ 5.0 (7 avis)", status: "todo" },
  { niche: "art", name: "All Elec Energy", category: "Électricien", address: "Imp. de l'Escairan, 06790 Aspremont", phone: "+33613964028", website: "", rating: "★ 3.0 (4 avis)", status: "todo" },
  { niche: "art", name: "Dotti Daniel", category: "Électricien", address: "6 Chem. de Campoun, 06790 Aspremont", phone: "+33609775939", website: "", rating: "", status: "todo" },
  { niche: "med", name: "Service infirmier à domicile Cedro/Lesbros", category: "Infirmier", address: "1976 Bd du Mercantour, 06670 Castagniers", phone: "+33779494610", website: "", rating: "", status: "todo" },
  { niche: "art", name: "Fred Torres Électricité Générale", category: "Électricien", address: "Rte de Castagniers, 06670 Castagniers", phone: "+33664916328", website: "", rating: "★ 5.0 (11 avis)", status: "todo" },
  { niche: "med", name: "Risacher Stéphanie", category: "Infirmier", address: "12 Rue Etienne Curti, 06670 Colomars", phone: "+33493379796", website: "", rating: "", status: "todo" },
  { niche: "med", name: "Infirmière Colomars Mateu/Ginouse", category: "Infirmier", address: "6 Rue Etienne Curti, 06670 Colomars", phone: "+33624769932", website: "", rating: "", status: "todo" },
  { niche: "art", name: "M.D.E EIRL Électricité", category: "Électricien", address: "160 Chem. du Génie, 06670 Colomars", phone: "+33624661534", website: "", rating: "★ 5.0 (14 avis)", status: "todo" },
  { niche: "med", name: "Sophie Pertin Kinésithérapeute", category: "Kinésithérapeute", address: "9 Rue de l'Église, 06950 Falicon", phone: "+33643166807", website: "", rating: "★ 5.0 (1 avis)", status: "todo" },
  { niche: "med", name: "Scm Saint Michel (Dos Santos / Bes)", category: "Praticiens santé", address: "1013 Rte de l'Aire Saint-Michel, 06950 Falicon", phone: "+33493984918", website: "", rating: "★ 5.0 (1 avis)", status: "todo" },
  { niche: "med", name: "Selarl Infirmière Vissian-Cauvin Sabrina", category: "Infirmier", address: "1 Bd François Suarez, 06340 La Trinité", phone: "+33622799586", website: "", rating: "★ 5.0 (2 avis)", status: "todo" },
  { niche: "med", name: "Infirmière libérale Messai", category: "Infirmier", address: "27-29 Bd François Suarez, 06340 La Trinité", phone: "+33766958171", website: "", rating: "★ 5.0 (12 avis)", status: "todo" },
  { niche: "med", name: "Ariane Infirmiers — Pôle Libéral Santé", category: "Infirmier", address: "27 Bd François Suarez, 06340 La Trinité", phone: "+33493540104", website: "", rating: "", status: "todo" },
  { niche: "med", name: "Cabinet kinésithérapie de la Vallée", category: "Kinésithérapeute", address: "27 Bd François Suarez, 06340 La Trinité", phone: "+33493540104", website: "", rating: "★ 4.5 (8 avis)", status: "todo" },
  { niche: "med", name: "Chevallier Karine Infirmière", category: "Infirmier", address: "96 Bd du Général de Gaulle, 06340 La Trinité", phone: "+33664782686", website: "", rating: "", status: "todo" },
  { niche: "med", name: "Cabinet kiné/ostéopathie Gal/Macavei", category: "Kinésithérapeute", address: "29 Bd François Suarez, 06340 La Trinité", phone: "+33492154750", website: "", rating: "★ 4.2 (37 avis)", status: "todo" },
  { niche: "med", name: "Masseur-kinésithérapeute", category: "Kinésithérapeute", address: "3 Bd François Suarez, 06340 La Trinité", phone: "+33651496146", website: "", rating: "★ 3.7 (3 avis)", status: "todo" },
  { niche: "med", name: "Racine Hélène", category: "Kinésithérapeute", address: "66 bis Bd du Général de Gaulle, 06340 La Trinité", phone: "+33620603400", website: "", rating: "★ 5.0 (5 avis)", status: "todo" },
  { niche: "art", name: "Air & Eau Concept", category: "Plombier / Climatisation", address: "26 Av. de la Plage, 06340 La Trinité", phone: "+33606658150", website: "", rating: "★ 5.0 (31 avis)", status: "todo" },
  { niche: "art", name: "JCG Bâti Plomberie", category: "Plombier", address: "12 Rte de Villefranche, 06340 La Trinité", phone: "+33769072662", website: "", rating: "★ 4.2 (6 avis)", status: "todo" },
  { niche: "art", name: "MERAT Établissements", category: "Plombier", address: "4 Rte de Villefranche, 06340 La Trinité", phone: "+33493542504", website: "", rating: "★ 4.6 (32 avis)", status: "todo" },
  { niche: "art", name: "Francky Plomberie", category: "Plombier", address: "06340 La Trinité", phone: "+33613580668", website: "", rating: "★ 4.3 (12 avis)", status: "todo" },
  { niche: "art", name: "EDV Électricité Des Vallées", category: "Électricien", address: "Imp. de l'Oli, 06340 La Trinité", phone: "+33662482078", website: "", rating: "★ 4.9 (68 avis)", status: "todo" },
  { niche: "art", name: "A.F.E Électricité", category: "Électricien", address: "7 Rue Antoine Scoffier, 06340 La Trinité", phone: "+33676538039", website: "", rating: "", status: "todo" },
  { niche: "art", name: "HO.ELEC", category: "Électricien", address: "Bd de l'Oli, 06340 La Trinité", phone: "+33621833603", website: "", rating: "★ 5.0 (1 avis)", status: "todo" },
  { niche: "med", name: "Nassim Belounis Ziane", category: "Kinésithérapeute", address: "103 Quai de la Banquière, 06730 Saint-André-de-la-Roche", phone: "+33770032198", website: "", rating: "★ 5.0 (17 avis)", status: "todo" },
  { niche: "med", name: "Infirmière L'Abadie — Célia Dacmine", category: "Infirmier", address: "15 Bd du 8 Mai 1945, 06730 Saint-André-de-la-Roche", phone: "+33651384675", website: "", rating: "★ 5.0 (2 avis)", status: "todo" },
  { niche: "med", name: "Mallaury Dose Infirmière", category: "Infirmier", address: "15 Bd du 8 Mai 1945, 06730 Saint-André-de-la-Roche", phone: "+33659692160", website: "", rating: "★ 5.0 (1 avis)", status: "todo" },
  { niche: "med", name: "Zolezzi Christine", category: "Infirmier", address: "17 Bd du 8 Mai 1945, 06300 Saint-André-de-la-Roche", phone: "+33493270886", website: "", rating: "", status: "todo" },
  { niche: "art", name: "GL Plomberie", category: "Plombier", address: "63 Rte Stratégique du Mont-Macaron, 06730 Saint-André-de-la-Roche", phone: "+33629586601", website: "", rating: "★ 5.0 (11 avis)", status: "todo" },
  { niche: "med", name: "Cabinet Infirmière Chavrier-Pavillard Tiphanie", category: "Infirmier", address: "209 Cor des Oliviers, 06000 Nice", phone: "+33614699496", website: "", rating: "★ 5.0 (25 avis)", status: "todo" },
  { niche: "med", name: "Infirmière Saint-Pancrace Lebras Marie-Madeleine", category: "Infirmier", address: "209 Cor des Oliviers, 06100 Nice", phone: "+33673050216", website: "", rating: "★ 4.8 (21 avis)", status: "todo" },
  { niche: "med", name: "Cabinet Infirmier Sainte Colette — Nice Cimiez", category: "Infirmier", address: "14 Av. Cap-de-Croix, 06100 Nice", phone: "+33619344351", website: "", rating: "★ 5.0 (27 avis)", status: "todo" },
  { niche: "med", name: "Infirmière Rose Elodie", category: "Infirmier", address: "156 Cor des Oliviers, 06000 Nice", phone: "+33663633745", website: "", rating: "★ 5.0 (13 avis)", status: "todo" },
  { niche: "med", name: "Lebrun Anne-Marie", category: "Infirmier", address: "75 Rte Aspremont Gairaut Sup, 06100 Nice", phone: "+33492098083", website: "", rating: "", status: "todo" },
  { niche: "med", name: "Cabinet Infirmier Libéral Nice Saint-Roch — Pietrapiana", category: "Infirmier", address: "15 Bd Saint-Roch, 06300 Nice", phone: "+33695988670", website: "", rating: "★ 5.0 (2 avis)", status: "todo" },
  { niche: "med", name: "Cabinet d'Infirmier libéral — Mickael Pellegrini", category: "Infirmier", address: "13 Bd Saint-Roch, 06300 Nice", phone: "+33760186265", website: "", rating: "★ 5.0 (1 avis)", status: "todo" },
  { niche: "med", name: "Infirmier Nice Est (Kamel)", category: "Infirmier", address: "15 Rue Acchiardi de Saint-Léger, 06300 Nice", phone: "+33651293825", website: "", rating: "★ 5.0 (6 avis)", status: "todo" },
  { niche: "med", name: "Infirmier libéral Jean Michel Letroublon", category: "Infirmier", address: "6 Rue Barla, 06300 Nice", phone: "+33663826501", website: "", rating: "★ 5.0 (6 avis)", status: "todo" },
  { niche: "med", name: "Cabinet de soins infirmiers Nice Centre", category: "Infirmier", address: "62 Rue Gioffredo, 06000 Nice", phone: "+33640092441", website: "", rating: "★ 4.4 (7 avis)", status: "todo" },
  { niche: "med", name: "RééducaNice", category: "Kinésithérapeute", address: "17 Bd de Riquier, 06300 Nice", phone: "+33493316700", website: "", rating: "★ 4.0 (25 avis)", status: "todo" },
  { niche: "med", name: "Kinelogik", category: "Kinésithérapeute", address: "14 Rue Edouard Scoffier, 06300 Nice", phone: "+33493260326", website: "", rating: "★ 4.6 (19 avis)", status: "todo" },
  { niche: "med", name: "LOPES Eduardo — Kinésithérapie Riquier", category: "Kinésithérapeute", address: "4 Rue Pierre Blancon, 06300 Nice", phone: "+33493890598", website: "", rating: "★ 4.0 (8 avis)", status: "todo" },
  { niche: "med", name: "ADNET — Cabinet d'ostéopathie et kinésithérapie", category: "Kinésithérapeute / Ostéopathe", address: "42 Rue Smolett, 06300 Nice", phone: "+33493079535", website: "", rating: "★ 4.9 (36 avis)", status: "todo" },
  { niche: "med", name: "Mathilde Roussel — Kinésithérapeute pédiatrique", category: "Kinésithérapeute", address: "24 Rue Smolett, 06300 Nice", phone: "+33608361542", website: "", rating: "★ 5.0 (5 avis)", status: "todo" },
  { niche: "art", name: "Plombier Azur", category: "Plombier", address: "18 Imp. des Liserons, 06300 Nice", phone: "+33422130875", website: "", rating: "★ 4.9 (215 avis)", status: "todo" },
  { niche: "art", name: "agua plombier chauffagiste pro gaz", category: "Plombier chauffagiste", address: "51 Rue Guiglionda de Sainte-Agathe, 06300 Nice", phone: "+33659996515", website: "", rating: "★ 5.0 (53 avis)", status: "todo" },
  { niche: "art", name: "EM Plomberie", category: "Plombier", address: "8 Rue du Comté Vert Amédée VI, 06300 Nice", phone: "+33629981063", website: "", rating: "★ 4.6 (79 avis)", status: "todo" },
  { niche: "art", name: "Plombier Nice : Azur Energie Distribution", category: "Plombier / Électricien", address: "7 Rue du Comté Vert Amédée VI, 06300 Nice", phone: "+33493507138", website: "", rating: "★ 4.6 (26 avis)", status: "todo" },
  { niche: "art", name: "Azur Service 06", category: "Plombier", address: "23 Av. Raymond Comboul, 06000 Nice", phone: "+33422461221", website: "", rating: "★ 5.0 (526 avis)", status: "todo" },
  { niche: "art", name: "Chrono Plomberie", category: "Plombier", address: "3 Pl. Masséna, 06000 Nice", phone: "+33493161610", website: "", rating: "★ 5.0 (611 avis)", status: "todo" },
  { niche: "art", name: "Azur Dépannage Service Plomberie", category: "Plombier", address: "7 Rue Assalit, 06000 Nice", phone: "+33422130045", website: "", rating: "★ 4.9 (326 avis)", status: "todo" },
  { niche: "art", name: "Électricité ARMANINI", category: "Électricien", address: "66 Rue Barberis, 06300 Nice", phone: "+33493894002", website: "", rating: "★ 4.8 (38 avis)", status: "todo" },
  { niche: "art", name: "MS Électricité", category: "Électricien", address: "27 Bd de Riquier, 06300 Nice", phone: "+33611301153", website: "", rating: "★ 4.8 (5 avis)", status: "todo" },
  { niche: "art", name: "AZURELECT", category: "Électricien", address: "9 Rue du Dr Pierre Richelmi, 06300 Nice", phone: "+33679258860", website: "", rating: "★ 5.0 (39 avis)", status: "todo" },
  { niche: "art", name: "Perselec Électricité", category: "Électricien", address: "50 Bd Stalingrad, 06300 Nice", phone: "+33650424148", website: "", rating: "★ 4.9 (71 avis)", status: "todo" },
  { niche: "art", name: "Novelec Électricité Générale", category: "Électricien", address: "57 Rue Barberis, 06300 Nice", phone: "+33680947225", website: "", rating: "", status: "todo" },
  { niche: "art", name: "Michaël Hammou (GEPM Rénovation)", category: "Rénovation générale", address: "13 Rue Guiglia, 06000 Nice", phone: "+33615013507", website: "", rating: "★ 4.9 (112 avis)", status: "todo" },
  { niche: "art", name: "SEVOL Rénovation", category: "Rénovation générale", address: "37 Bd Dubouchage, 06000 Nice", phone: "+33756884465", website: "", rating: "★ 5.0 (32 avis)", status: "todo" },
  { niche: "art", name: "JMD Maçonnerie Nice", category: "Maçonnerie", address: "4 Chem. des Chênes Blancs, 06000 Nice", phone: "+33601276362", website: "", rating: "★ 5.0 (8 avis)", status: "todo" },
  { niche: "art", name: "Côte d'Azur Bâtiment", category: "Peinture / Bâtiment", address: "37 Rue Vernier, 06000 Nice", phone: "+33489148487", website: "", rating: "★ 5.0 (137 avis)", status: "todo" },
  { niche: "med", name: "Oxance - SAD", category: "Services à domicile", address: "9 Rue Alfred Mortier, 06000 Nice", phone: "+33493878660", website: "", rating: "★ 4.2 (5 avis)", status: "todo" },
  { niche: "med", name: "Cassagnabère / Bouvier infirmières (annexe)", category: "Infirmier", address: "1 Rue Gaspard Clerissi, 06790 Aspremont", phone: "+33782650694", website: "", rating: "", status: "todo" },
];

export function mapperProspect(p: ProspectBrut) {
  const estDomicile = /domicile|ssiad/i.test(p.category);
  const secteur =
    p.niche === "art" ? "Artisan" : estDomicile ? "SSIAD" : "Cabinet médical";
  const statut =
    p.status === "contacted"
      ? "contacte"
      : p.status === "rdv"
      ? "rdv_planifie"
      : "a_contacter";
  const notes = [p.category, p.rating, p.website].filter(Boolean).join(" · ");

  return {
    nom: p.name,
    secteur,
    telephone: p.phone || undefined,
    adresse: p.address || undefined,
    statut,
    notes: notes || undefined,
  };
}
