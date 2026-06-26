"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import LigneEditor from "@/components/LigneEditor";
import { Client, Devis, Ligne } from "@/lib/types";
import { getClients, getDevisListe, creerDevis, envoyerDevisPourSignature, calculerTotaux, ApiError } from "@/lib/api";

export default function DevisPage() {
  const [devisListe, setDevisListe] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [objet, setObjet] = useState("");
  const [contexte, setContexte] = useState("");
  const [tauxTva, setTauxTva] = useState(20);
  const [lignes, setLignes] = useState<Ligne[]>([
    { description: "", quantite: 1, prix_unitaire: 0 },
  ]);

  const clientSelectionne = clients.find((c) => c.id === clientId);

  function charger() {
    setLoading(true);
    Promise.all([getDevisListe(), getClients()])
      .then(([d, c]) => {
        setDevisListe(d);
        setClients(c);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function ouvrirNouveau() {
    setClientId(clients[0]?.id || "");
    setObjet("");
    setContexte("");
    setTauxTva(20);
    setLignes([{ description: "", quantite: 1, prix_unitaire: 0 }]);
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      await creerDevis({
        client_id: clientId,
        objet,
        contexte: contexte || undefined,
        taux_tva: tauxTva,
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
      await envoyerDevisPourSignature(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'envoi");
    } finally {
      setEnvoiEnCours(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl text-textPrimary">Devis</h1>
          <button
            onClick={ouvrirNouveau}
            disabled={clients.length === 0}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
          >
            + Nouveau devis
          </button>
        </div>

        {clients.length === 0 && !loading && (
          <p className="mb-4 text-sm text-amber">
            Crée d'abord un client avant de pouvoir générer un devis.
          </p>
        )}

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
              Nouveau devis
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Client
                </span>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
                {clientSelectionne?.secteur === "SSIAD" && (
                  <p className="mt-1 text-xs text-amber">
                    ⚠ Secteur SSIAD — la mention HDS/RGPD santé sera ajoutée
                    automatiquement au PDF.
                  </p>
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Objet</span>
                <input
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                  placeholder="ex: Déploiement Orchestrateur IA"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/60"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">
                  Contexte (paragraphe narratif, optionnel)
                </span>
                <textarea
                  value={contexte}
                  onChange={(e) => setContexte(e.target.value)}
                  rows={2}
                  placeholder="ex: Ce devis accompagne le déploiement pilote IA pour ce client, avec un focus sur la réduction de la charge administrative."
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/60"
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
                {enregistrement ? "Génération…" : "Générer le devis (PDF + Drive)"}
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
        ) : devisListe.length === 0 ? (
          <p className="text-sm text-textMuted">Aucun devis pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {devisListe.map((devis) => {
              const { totalTtc } = calculerTotaux(devis.lignes, devis.taux_tva);
              return (
                <div
                  key={devis.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-surface p-4"
                >
                  <div>
                    <p className="font-display text-sm font-bold text-textPrimary">
                      {devis.numero}{" "}
                      <span className="ml-2 font-mono text-xs font-normal text-textMuted">
                        {devis.statut}
                      </span>
                    </p>
                    <p className="text-xs text-textMuted">
                      {devis.client?.nom || "—"} {devis.objet ? `· ${devis.objet}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-display text-sm text-teal">
                      {totalTtc.toFixed(2)} €
                    </span>
                    {devis.drive_file_url ? (
                      <a
                        href={devis.drive_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-violet hover:text-teal"
                      >
                        Voir le PDF (Drive) →
                      </a>
                    ) : (
                      <span className="text-xs text-textMuted">
                        Pas encore sur Drive
                      </span>
                    )}
                    {devis.signe_le ? (
                      <span className="rounded bg-teal/10 px-2 py-1 text-xs font-medium text-teal">
                        ✓ Signé
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEnvoyer(devis.id)}
                        disabled={envoiEnCours === devis.id}
                        className="rounded bg-violet px-3 py-1.5 text-xs font-medium text-white hover:bg-violet/90 disabled:opacity-50"
                      >
                        {envoiEnCours === devis.id
                          ? "Envoi…"
                          : "Envoyer pour signature"}
                      </button>
                    )}
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
