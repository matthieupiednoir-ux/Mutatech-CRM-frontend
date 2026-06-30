"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import LigneEditor from "@/components/LigneEditor";
import { Client, Devis, Facture, Ligne } from "@/lib/types";
import {
  getClients,
  getDevisListe,
  getFacturesListe,
  creerFacture,
  envoyerFacture,
  marquerFacturePayee,
  supprimerFacture,
  calculerTotaux,
  ApiError,
} from "@/lib/api";

const STATUT_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  payee: "Payée",
};
const STATUT_COULEUR: Record<string, string> = {
  brouillon: "text-textMuted border-line",
  envoyee: "text-amber border-amber/40 bg-amber/10",
  payee: "text-teal border-teal/40 bg-teal/10",
};

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [devisListe, setDevisListe] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  const [paiementEnCours, setPaiementEnCours] = useState<string | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null);

  const [origineDevisId, setOrigineDevisId] = useState<string>("");
  const [clientId, setClientId] = useState("");
  const [objet, setObjet] = useState("");
  const [tauxTva, setTauxTva] = useState(20);
  const [dateEcheance, setDateEcheance] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([
    { description: "", quantite: 1, prix_unitaire: 0 },
  ]);

  function charger() {
    setLoading(true);
    Promise.all([getFacturesListe(), getClients(), getDevisListe()])
      .then(([f, c, d]) => {
        setFactures(f);
        setClients(c);
        setDevisListe(d);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function ouvrirNouveau() {
    setOrigineDevisId("");
    setClientId(clients[0]?.id || "");
    setObjet("");
    setTauxTva(20);
    setDateEcheance("");
    setLignes([{ description: "", quantite: 1, prix_unitaire: 0 }]);
    setFormOuvert(true);
  }

  function handleChoixDevis(devisId: string) {
    setOrigineDevisId(devisId);
    if (!devisId) return;
    const devis = devisListe.find((d) => d.id === devisId);
    if (devis) {
      setClientId(devis.client_id);
      setObjet(devis.objet || "");
      setTauxTva(devis.taux_tva);
      setLignes(devis.lignes.map((l) => ({ ...l })));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      await creerFacture({
        client_id: clientId,
        devis_id: origineDevisId || undefined,
        objet,
        taux_tva: tauxTva,
        date_echeance: dateEcheance || undefined,
        lignes: lignes.filter((l) => l.description.trim() !== ""),
      });
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleEnvoyer(id: string) {
    setEnvoiEnCours(id);
    setError(null);
    try {
      await envoyerFacture(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'envoi");
    } finally {
      setEnvoiEnCours(null);
    }
  }

  async function handleMarquerPayee(id: string) {
    if (!confirm("Marquer cette facture comme payée aujourd'hui ?")) return;
    setPaiementEnCours(id);
    setError(null);
    try {
      await marquerFacturePayee(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de mise à jour");
    } finally {
      setPaiementEnCours(null);
    }
  }

  async function handleSupprimer(facture: Facture) {
    if (!confirm(`Supprimer définitivement la facture ${facture.numero} ?`)) return;
    setSuppressionEnCours(facture.id);
    setError(null);
    try {
      await supprimerFacture(facture.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    } finally {
      setSuppressionEnCours(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl text-textPrimary">Factures</h1>
          <button
            onClick={ouvrirNouveau}
            disabled={clients.length === 0}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
          >
            + Nouvelle facture
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        {formOuvert && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 space-y-5 rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-display text-lg text-textPrimary">
              Nouvelle facture
            </h2>

            <label className="block">
              <span className="mb-1 block text-sm text-textMuted">
                Créer à partir d'un devis (optionnel)
              </span>
              <select
                value={origineDevisId}
                onChange={(e) => handleChoixDevis(e.target.value)}
                className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
              >
                <option value="">— Nouvelle facture de zéro —</option>
                {devisListe.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.numero} — {d.client?.nom}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Client
                </span>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  disabled={!!origineDevisId}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary disabled:opacity-60"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Objet</span>
                <input
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Date d'échéance
                </span>
                <input
                  type="date"
                  value={dateEcheance}
                  onChange={(e) => setDateEcheance(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
            </div>

            <LigneEditor
              lignes={lignes}
              tauxTva={tauxTva}
              onChange={setLignes}
              onTauxTvaChange={setTauxTva}
            />

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {enregistrement ? "Génération…" : "Générer la facture (PDF + Drive)"}
              </button>
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="text-sm text-textMuted hover:text-textPrimary"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : factures.length === 0 ? (
          <p className="text-sm text-textMuted">Aucune facture pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {factures.map((facture) => {
              const { totalTtc } = calculerTotaux(facture.lignes, facture.taux_tva);
              return (
                <div
                  key={facture.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4"
                >
                  <div>
                    <p className="font-display text-sm font-bold text-textPrimary">
                      {facture.numero}{" "}
                      <span
                        className={`ml-2 rounded border px-2 py-0.5 font-mono text-xs font-normal ${STATUT_COULEUR[facture.statut]}`}
                      >
                        {STATUT_LABEL[facture.statut] || facture.statut}
                      </span>
                    </p>
                    <p className="text-xs text-textMuted">
                      {facture.client?.nom || "—"} {facture.objet ? `· ${facture.objet}` : ""}
                    </p>
                    {facture.payee_le && (
                      <p className="mt-0.5 text-[11px] text-teal">
                        Encaissée le{" "}
                        {new Date(facture.payee_le).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm text-teal">
                      {totalTtc.toFixed(2)} €
                    </span>
                    {facture.drive_file_url && (
                      <a
                        href={facture.drive_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet hover:text-teal"
                      >
                        PDF (Drive) →
                      </a>
                    )}
                    {facture.statut === "brouillon" && (
                      <button
                        onClick={() => handleEnvoyer(facture.id)}
                        disabled={envoiEnCours === facture.id}
                        className="rounded bg-violet px-3 py-1.5 text-xs font-medium text-white hover:bg-violet/90 disabled:opacity-50"
                      >
                        {envoiEnCours === facture.id ? "Envoi…" : "Envoyer"}
                      </button>
                    )}
                    {facture.statut !== "payee" && (
                      <button
                        onClick={() => handleMarquerPayee(facture.id)}
                        disabled={paiementEnCours === facture.id}
                        className="rounded bg-teal px-3 py-1.5 text-xs font-medium text-ink hover:bg-teal/90 disabled:opacity-50"
                      >
                        {paiementEnCours === facture.id ? "…" : "Marquer payée"}
                      </button>
                    )}
                    <button
                      onClick={() => handleSupprimer(facture)}
                      disabled={suppressionEnCours === facture.id}
                      className="text-xs text-textMuted hover:text-amber disabled:opacity-50"
                    >
                      {suppressionEnCours === facture.id ? "…" : "✕"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
