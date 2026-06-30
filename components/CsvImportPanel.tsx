"use client";

import { useState } from "react";

export interface ChampImportCSV {
  cle: string;
  label: string;
  requis?: boolean;
}

interface CsvImportPanelProps {
  titre: string;
  champs: ChampImportCSV[];
  // Reçoit les lignes mappées (objets { cle: valeur }) — c'est à l'appelant
  // de les transformer en objet typé (parsing nombre/date/etc.) puis
  // d'appeler l'API d'import en lot correspondante.
  onImporter: (lignes: Record<string, string>[]) => Promise<void>;
  onFermer: () => void;
  modeleColonnes?: string[]; // pour afficher un exemple d'en-têtes attendues
}

// --- Parseur CSV minimal mais robuste : gère guillemets, virgules ou
// points-virgules comme séparateur (détecté automatiquement), et les
// guillemets échappés (""). Pas de dépendance externe à ajouter au
// projet (papaparse nécessiterait une modification de package.json). ---
function parserCsv(texte: string): string[][] {
  const texteNettoye = texte.replace(/^\uFEFF/, ""); // retire le BOM Excel si présent
  const premiereLigne = texteNettoye.split(/\r\n|\n/)[0] || "";
  const nbVirgules = (premiereLigne.match(/,/g) || []).length;
  const nbPointsVirgules = (premiereLigne.match(/;/g) || []).length;
  const separateur = nbPointsVirgules > nbVirgules ? ";" : ",";

  const lignes: string[][] = [];
  let ligneActuelle: string[] = [];
  let champActuel = "";
  let dansGuillemets = false;

  for (let i = 0; i < texteNettoye.length; i++) {
    const c = texteNettoye[i];
    const suivant = texteNettoye[i + 1];

    if (dansGuillemets) {
      if (c === '"' && suivant === '"') {
        champActuel += '"';
        i++;
      } else if (c === '"') {
        dansGuillemets = false;
      } else {
        champActuel += c;
      }
    } else {
      if (c === '"') {
        dansGuillemets = true;
      } else if (c === separateur) {
        ligneActuelle.push(champActuel);
        champActuel = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && suivant === "\n") continue;
        ligneActuelle.push(champActuel);
        if (ligneActuelle.some((v) => v.trim() !== "")) lignes.push(ligneActuelle);
        ligneActuelle = [];
        champActuel = "";
      } else {
        champActuel += c;
      }
    }
  }
  if (champActuel !== "" || ligneActuelle.length > 0) {
    ligneActuelle.push(champActuel);
    if (ligneActuelle.some((v) => v.trim() !== "")) lignes.push(ligneActuelle);
  }
  return lignes.map((l) => l.map((v) => v.trim()));
}

function normaliser(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export default function CsvImportPanel({
  titre,
  champs,
  onImporter,
  onFermer,
  modeleColonnes,
}: CsvImportPanelProps) {
  const [entetes, setEntetes] = useState<string[]>([]);
  const [lignesBrutes, setLignesBrutes] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // cle champ -> index colonne CSV (en string)
  const [erreur, setErreur] = useState<string | null>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [nomFichier, setNomFichier] = useState<string | null>(null);

  function handleFichier(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setErreur(null);
    setNomFichier(fichier.name);

    const lecteur = new FileReader();
    lecteur.onload = () => {
      try {
        const texte = String(lecteur.result || "");
        const lignes = parserCsv(texte);
        if (lignes.length < 1) {
          setErreur("Le fichier semble vide ou illisible.");
          return;
        }
        const [premiere, ...reste] = lignes;
        setEntetes(premiere);
        setLignesBrutes(reste);

        // Auto-mapping : associe chaque champ cible à la première colonne
        // CSV dont l'en-tête correspond (comparaison insensible aux
        // accents/casse/espaces).
        const auto: Record<string, string> = {};
        champs.forEach((champ) => {
          const indexTrouve = premiere.findIndex(
            (entete) => normaliser(entete) === normaliser(champ.label) || normaliser(entete) === normaliser(champ.cle)
          );
          if (indexTrouve > -1) auto[champ.cle] = String(indexTrouve);
        });
        setMapping(auto);
      } catch {
        setErreur("Impossible de lire ce fichier — vérifie que c'est bien un CSV.");
      }
    };
    lecteur.onerror = () => setErreur("Erreur de lecture du fichier.");
    lecteur.readAsText(fichier, "UTF-8");
  }

  function changerMapping(cleChamp: string, indexColonne: string) {
    setMapping((prev) => ({ ...prev, [cleChamp]: indexColonne }));
  }

  const champsRequisManquants = champs.filter(
    (c) => c.requis && (mapping[c.cle] === undefined || mapping[c.cle] === "")
  );

  async function handleImporter() {
    if (champsRequisManquants.length > 0) {
      setErreur(
        `Associe d'abord une colonne aux champs obligatoires : ${champsRequisManquants
          .map((c) => c.label)
          .join(", ")}.`
      );
      return;
    }
    setErreur(null);
    setImportEnCours(true);
    try {
      const lignesMappees: Record<string, string>[] = lignesBrutes.map((ligne) => {
        const objet: Record<string, string> = {};
        champs.forEach((champ) => {
          const idx = mapping[champ.cle];
          if (idx !== undefined && idx !== "") {
            objet[champ.cle] = ligne[parseInt(idx, 10)] ?? "";
          }
        });
        return objet;
      });
      await onImporter(lignesMappees);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur pendant l'import.");
    } finally {
      setImportEnCours(false);
    }
  }

  return (
    <div className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-textPrimary">Importer un CSV — {titre}</h2>
        <button onClick={onFermer} className="text-sm text-textMuted hover:text-textPrimary">
          ✕ Fermer
        </button>
      </div>

      {entetes.length === 0 ? (
        <div>
          <label className="block">
            <span className="mb-2 block text-sm text-textMuted">
              Sélectionne un fichier .csv (export Excel ou Google Sheets fonctionne — séparateur
              virgule ou point-virgule détecté automatiquement)
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFichier}
              className="block w-full text-sm text-textPrimary file:mr-4 file:rounded-lg file:border-0 file:bg-violet file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-violet/90"
            />
          </label>
          {modeleColonnes && (
            <p className="mt-3 text-xs text-textMuted">
              Colonnes attendues (l'ordre n'a pas d'importance) : {modeleColonnes.join(", ")}
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-textMuted">
            {nomFichier} · {lignesBrutes.length} ligne(s) détectée(s)
          </p>

          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-surfaceAlt">
                  {champs.map((champ) => (
                    <th key={champ.cle} className="px-3 py-2 text-left font-medium text-textPrimary">
                      {champ.label}
                      {champ.requis && <span className="text-amber"> *</span>}
                      <select
                        value={mapping[champ.cle] ?? ""}
                        onChange={(e) => changerMapping(champ.cle, e.target.value)}
                        className="mt-1 block w-full rounded border border-line bg-surface px-1 py-1 text-[11px] text-textPrimary"
                      >
                        <option value="">— Ignorer —</option>
                        {entetes.map((entete, i) => (
                          <option key={i} value={i}>
                            {entete || `Colonne ${i + 1}`}
                          </option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lignesBrutes.slice(0, 5).map((ligne, i) => (
                  <tr key={i} className="border-b border-line/50">
                    {champs.map((champ) => {
                      const idx = mapping[champ.cle];
                      const valeur = idx !== undefined && idx !== "" ? ligne[parseInt(idx, 10)] : "";
                      return (
                        <td key={champ.cle} className="truncate px-3 py-2 text-textMuted">
                          {valeur || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lignesBrutes.length > 5 && (
            <p className="text-[11px] text-textMuted">
              Aperçu des 5 premières lignes sur {lignesBrutes.length} au total.
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleImporter}
              disabled={importEnCours}
              className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
            >
              {importEnCours
                ? "Import en cours…"
                : `Importer ${lignesBrutes.length} ligne(s)`}
            </button>
            <button
              onClick={() => {
                setEntetes([]);
                setLignesBrutes([]);
                setMapping({});
                setNomFichier(null);
              }}
              className="text-sm text-textMuted hover:text-textPrimary"
            >
              Choisir un autre fichier
            </button>
          </div>
        </>
      )}

      {erreur && (
        <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
          {erreur}
        </p>
      )}
    </div>
  );
}
