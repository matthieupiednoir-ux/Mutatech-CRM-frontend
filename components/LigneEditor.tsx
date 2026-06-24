"use client";

import { Ligne } from "@/lib/types";
import { calculerTotaux } from "@/lib/api";

export default function LigneEditor({
  lignes,
  tauxTva,
  onChange,
  onTauxTvaChange,
}: {
  lignes: Ligne[];
  tauxTva: number;
  onChange: (lignes: Ligne[]) => void;
  onTauxTvaChange: (taux: number) => void;
}) {
  function majLigne(index: number, champ: keyof Ligne, valeur: string) {
    onChange(
      lignes.map((l, i) =>
        i === index
          ? {
              ...l,
              [champ]:
                champ === "description" ? valeur : parseFloat(valeur) || 0,
            }
          : l
      )
    );
  }

  function ajouterLigne() {
    onChange([...lignes, { description: "", quantite: 1, prix_unitaire: 0 }]);
  }

  function retirerLigne(index: number) {
    onChange(lignes.filter((_, i) => i !== index));
  }

  const { totalHt, totalTva, totalTtc } = calculerTotaux(lignes, tauxTva);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm text-textPrimary">
          Lignes de prestation
        </h3>
        <button
          type="button"
          onClick={ajouterLigne}
          className="text-sm text-violet hover:text-teal"
        >
          + Ajouter une ligne
        </button>
      </div>

      {lignes.map((ligne, i) => (
        <div
          key={i}
          className="grid grid-cols-12 gap-2 rounded-lg border border-line bg-surface p-3"
        >
          <input
            value={ligne.description}
            onChange={(e) => majLigne(i, "description", e.target.value)}
            placeholder="Description"
            className="col-span-12 rounded border border-line bg-surfaceAlt px-2 py-1.5 text-sm text-textPrimary placeholder:text-textMuted/60 sm:col-span-6"
          />
          <input
            type="number"
            min={0}
            step="0.5"
            value={ligne.quantite}
            onChange={(e) => majLigne(i, "quantite", e.target.value)}
            placeholder="Qté"
            className="col-span-4 rounded border border-line bg-surfaceAlt px-2 py-1.5 text-sm text-textPrimary sm:col-span-2"
          />
          <input
            type="number"
            min={0}
            step="0.01"
            value={ligne.prix_unitaire}
            onChange={(e) => majLigne(i, "prix_unitaire", e.target.value)}
            placeholder="Prix U."
            className="col-span-5 rounded border border-line bg-surfaceAlt px-2 py-1.5 text-sm text-textPrimary sm:col-span-3"
          />
          <button
            type="button"
            onClick={() => retirerLigne(i)}
            className="col-span-3 rounded border border-line text-xs text-textMuted hover:border-amber hover:text-amber sm:col-span-1"
          >
            ✕
          </button>
        </div>
      ))}

      <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-3">
        <label className="flex items-center gap-2 text-sm text-textMuted">
          Taux TVA
          <input
            type="number"
            min={0}
            step="0.1"
            value={tauxTva}
            onChange={(e) => onTauxTvaChange(parseFloat(e.target.value) || 0)}
            className="w-16 rounded border border-line bg-surfaceAlt px-2 py-1 text-center text-textPrimary"
          />
          %
        </label>
        <div className="text-right text-sm">
          <p className="text-textMuted">
            Total HT : <span className="text-textPrimary">{totalHt.toFixed(2)} €</span>
          </p>
          <p className="text-textMuted">
            TVA : <span className="text-textPrimary">{totalTva.toFixed(2)} €</span>
          </p>
          <p className="font-display font-bold text-teal">
            Total TTC : {totalTtc.toFixed(2)} €
          </p>
        </div>
      </div>
    </div>
  );
}
