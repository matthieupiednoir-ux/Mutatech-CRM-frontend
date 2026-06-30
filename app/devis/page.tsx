"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import LigneEditor from "@/components/LigneEditor";
import SuiviAbonnement from "@/components/SuiviAbonnement";
import { Client, Devis, Ligne } from "@/lib/types";
import {
  getClients,
  getDevisListe,
  creerDevis,
  modifierDevis,
  envoyerDevisPourSignature,
  supprimerDevis,
  calculerTotaux,
  ApiError,
} from "@/lib/api";

export default function DevisPage() {
  const [devisListe, setDevisListe] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [devisEnEdition, setDevisEnEdition] = useState<Devis | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState<string | null>(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null);
  const [suiviOuvert, setSuiviOuvert] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [objet, setObjet] = useState("");
  const [contexte, setContexte] = useState("");
  const [tauxTva, setTauxTva] = useState(20);
  const [lignes, setLignes] = useState<Ligne[]>([
    { description: "", quantite: 1, prix_unitaire: 0 },
  ]);

  const [typeFacturation, setTypeFacturation] = useState<"ponctuelle" | "abonnement">("ponctuelle");
  const [montantMensuel, setMontantMensuel] = useState("");
  const [dureeMois, setDureeMois] = useState("");
  const [dateDebutAbonnement, setDateDebutAbonnement] = useState("");
  const [premierVersementDiffere, setPremierVersementDiffere] = useState(false);
  const [premierVersement, setPremierVersement] = useState("");

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

  function reinitialiserFormulaire() {
    setClientId(clients[0]?.id || "");
    setObjet("");
    setContexte("");
    setTauxTva(20);
    setLignes([{ description: "", quantite: 1, prix_unitaire: 0 }]);
    setTypeFacturation("ponctuelle");
    setMontantMensuel("");
    setDureeMois("");
    setDateDebutAbonnement(new Date().toISOString().slice(0, 10));
    setPremierVersementDiffere(false);
    setPremierVersement("");
  }

  function ouvrirNouveau() {
    setDevisEnEdition(null);
    reinitialiserFormulaire();
    setFormOuvert(true);
  }

  function ouvrirEdition(devis: Devis) {
    setDevisEnEdition(devis);
    setClientId(devis.client_id);
    setObjet(devis.objet || "");
    setContexte(devis.contexte || "");
    setTauxTva(devis.taux_tva);
    setLignes(devis.lignes.map((l) => ({ ...l })));
    setTypeFacturation(devis.type_facturation === "abonnement" ? "abonnement" : "ponctuelle");
    setMontantMensuel(devis.montant_mensuel != null ? String(devis.montant_mensuel) : "");
    setDureeMois(devis.duree_mois != null ? String(devis.duree_mois) : "");
    setDateDebutAbonnement(devis.date_debut_abonnement || "");
    const versementDiffere = devis.premier_versement != null && devis.premier_versement !== devis.montant_mensuel;
    setPremierVersementDiffere(versementDiffere);
    setPremierVersement(versementDiffere ? String(devis.premier_versement) : "");
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      const donnees: Parameters<typeof creerDevis>[0] = {
        client_id: clientId,
        objet,
        contexte: contexte || undefined,
        taux_tva: tauxTva,
        lignes: lignes.filter((l) => l.description.trim() !== ""),
        type_facturation: typeFacturation,
      };
      if (typeFacturation === "abonnement") {
        donnees.montant_mensuel = montantMensuel ? parseFloat(montantMensuel) : undefined;
        donnees.duree_mois = dureeMois ? parseInt(dureeMois, 10) : undefined;
        donnees.date_debut_abonnement = dateDebutAbonnement || undefined;
        donnees.premier_versement =
          premierVersementDiffere && premierVersement
            ? parseFloat(premierVersement)
            : undefined;
      }

      if (devisEnEdition) {
        await modifierDevis(devisEnEdition.id, donnees);
      } else {
        await creerDevis(donnees);
      }
      setFormOuvert(false);
      setDevisEnEdition(null);
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

  async function handleSupprimer(devis: Devis) {
    if (!confirm(`Supprimer définitivement le devis ${devis.numero} ?`)) return;
    setSuppressionEnCours(devis.id);
    setError(null);
    try {
      await supprimerDevis(devis.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    } finally {
      setSuppressionEnCours(null);
    }
  }

  // Aperçu du total si réglé en une fois, pour aider à la saisie
  const montantMensuelNum = parseFloat(montantMensuel) || 0;
  const dureeMoisNum = parseInt(dureeMois, 10) || 0;
  const premierNum = premierVersementDiffere && premierVersement
    ? parseFloat(premierVersement) || 0
    : montantMensuelNum;
  const totalAbonnementApercu =
    dureeMoisNum > 0 ? premierNum + montantMensuelNum * (dureeMoisNum - 1) : null;

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
              {devisEnEdition ? `Modifier ${devisEnEdition.numero}` : "Nouveau devis"}
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

            {/* --- Mode de facturation : ponctuel ou abonnement --- */}
            <div className="rounded-lg border border-line bg-surfaceAlt p-4">
              <span className="mb-2 block text-sm font-medium text-textPrimary">
                Mode de facturation
              </span>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTypeFacturation("ponctuelle")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    typeFacturation === "ponctuelle"
                      ? "border-violet bg-violet text-white"
                      : "border-line text-textMuted hover:text-textPrimary"
                  }`}
                >
                  Ponctuel (montant total classique)
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFacturation("abonnement")}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    typeFacturation === "abonnement"
                      ? "border-violet bg-violet text-white"
                      : "border-line text-textMuted hover:text-textPrimary"
                  }`}
                >
                  Abonnement (engagement mensuel)
                </button>
              </div>

              {typeFacturation === "abonnement" && (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-xs text-textMuted">
                        Montant mensuel (€ HT)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={montantMensuel}
                        onChange={(e) => setMontantMensuel(e.target.value)}
                        placeholder="ex: 350"
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-textMuted">
                        Durée (mois, optionnel)
                      </span>
                      <input
                        type="number"
                        value={dureeMois}
                        onChange={(e) => setDureeMois(e.target.value)}
                        placeholder="ex: 12"
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-textMuted">
                        Date de début
                      </span>
                      <input
                        type="date"
                        value={dateDebutAbonnement}
                        onChange={(e) => setDateDebutAbonnement(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-textMuted">
                    <input
                      type="checkbox"
                      checked={premierVersementDiffere}
                      onChange={(e) => setPremierVersementDiffere(e.target.checked)}
                    />
                    Le premier versement diffère du montant mensuel (ex: frais de mise en
                    place inclus)
                  </label>

                  {premierVersementDiffere && (
                    <label className="block max-w-xs">
                      <span className="mb-1 block text-xs text-textMuted">
                        Montant du premier versement (€ HT)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={premierVersement}
                        onChange={(e) => setPremierVersement(e.target.value)}
                        placeholder="ex: 850"
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60"
                      />
                    </label>
                  )}

                  {montantMensuelNum > 0 && (
                    <p className="text-xs text-teal">
                      Le client pourra payer {montantMensuelNum.toFixed(2)} € HT/mois
                      {totalAbonnementApercu !== null && (
                        <>
                          {" "}
                          ou {totalAbonnementApercu.toFixed(2)} € HT en une fois pour les{" "}
                          {dureeMoisNum} mois.
                        </>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {enregistrement
                  ? "Enregistrement…"
                  : devisEnEdition
                  ? "Enregistrer les modifications (PDF + Drive)"
                  : "Générer le devis (PDF + Drive)"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOuvert(false);
                  setDevisEnEdition(null);
                }}
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
              const estModifiable = devis.statut === "brouillon";
              const estAbonnement = devis.type_facturation === "abonnement";
              const suiviVisible = suiviOuvert === devis.id;
              return (
                <div
                  key={devis.id}
                  className="rounded-lg border border-line bg-surface p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-bold text-textPrimary">
                        {devis.numero}{" "}
                        <span className="ml-2 font-mono text-xs font-normal text-textMuted">
                          {devis.statut}
                        </span>
                        {estAbonnement && (
                          <span className="ml-2 rounded bg-violet/10 px-2 py-0.5 text-xs font-medium text-violet">
                            Abonnement
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-textMuted">
                        {devis.client?.nom || "—"} {devis.objet ? `· ${devis.objet}` : ""}
                      </p>
                      {estAbonnement && devis.montant_mensuel != null && (
                        <p className="mt-0.5 text-[11px] text-violet">
                          {devis.montant_mensuel.toFixed(2)} € HT / mois
                          {devis.duree_mois ? ` · ${devis.duree_mois} mois` : ""}
                          {devis.date_debut_abonnement
                            ? ` · à partir du ${new Date(devis.date_debut_abonnement).toLocaleDateString("fr-FR")}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-sm text-teal">
                        {estAbonnement
                          ? `${devis.montant_mensuel?.toFixed(2) ?? "0.00"} € HT/mois`
                          : `${totalTtc.toFixed(2)} €`}
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
                      {estModifiable && (
                        <button
                          onClick={() => ouvrirEdition(devis)}
                          className="text-xs text-violet hover:text-teal"
                        >
                          Modifier
                        </button>
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
                      <button
                        onClick={() => handleSupprimer(devis)}
                        disabled={suppressionEnCours === devis.id}
                        className="text-xs text-textMuted hover:text-amber disabled:opacity-50"
                      >
                        {suppressionEnCours === devis.id ? "…" : "✕"}
                      </button>
                    </div>
                  </div>

                  {estAbonnement && devis.signe_le && (
                    <div className="mt-2">
                      <button
                        onClick={() =>
                          setSuiviOuvert(suiviVisible ? null : devis.id)
                        }
                        className="text-[11px] text-textMuted hover:text-textPrimary"
                      >
                        {suiviVisible ? "▾ Masquer" : "▸ Voir"} le suivi des mensualités
                      </button>
                      {suiviVisible && <SuiviAbonnement devisId={devis.id} />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
