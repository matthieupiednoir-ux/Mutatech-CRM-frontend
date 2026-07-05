"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import {
  getClients, getDevisListe, creerDevis, modifierDevis, supprimerDevis,
  envoyerDevisPourSignature, getAbonnementSuivi, genererFactureMois,
  calculerTotaux, ApiError,
} from "@/lib/api";
import { Client, Devis, DevisInput, Ligne, TypeDevis, MoisAbonnement } from "@/lib/types";

const STATUT_LABEL: Record<string, string> = {
  brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé",
};
const STATUT_COULEUR: Record<string, string> = {
  brouillon: "text-textMuted", envoye: "text-amber", accepte: "text-teal", refuse: "text-red-400",
};

const LIGNE_VIDE: Ligne = { description: "", quantite: 1, prix_unitaire: 0 };

const FORFAITS: Array<{ label: string; lignes: Ligne[]; taux_tva: number }> = [
  {
    label: "Diagnostic IA",
    lignes: [{ description: "Diagnostic IA — audit organisation + rapport + restitution", quantite: 1, prix_unitaire: 490 }],
    taux_tva: 20,
  },
  {
    label: "Pack Lancement",
    lignes: [
      { description: "Diagnostic IA inclus", quantite: 1, prix_unitaire: 490 },
      { description: "Déploiement 2 outils IA + formation individuelle 2h", quantite: 1, prix_unitaire: 500 },
      { description: "Support 2 semaines", quantite: 1, prix_unitaire: 200 },
    ],
    taux_tva: 20,
  },
  {
    label: "Suivi Mensuel",
    lignes: [{ description: "Suivi mensuel IA — point visio + optimisations + messagerie prioritaire", quantite: 1, prix_unitaire: 290 }],
    taux_tva: 20,
  },
  {
    label: "Atelier Collectif",
    lignes: [{ description: "Atelier collectif IA métier — 3h (par participant)", quantite: 1, prix_unitaire: 120 }],
    taux_tva: 20,
  },
  {
    label: "Agent IA Métier",
    lignes: [{ description: "Agent IA Métier — abonnement mensuel sur-mesure", quantite: 1, prix_unitaire: 350 }],
    taux_tva: 20,
  },
  {
    label: "Diagnostic IDEL",
    lignes: [{ description: "Diagnostic IDEL — audit 2h adapté infirmier libéral", quantite: 1, prix_unitaire: 250 }],
    taux_tva: 20,
  },
  {
    label: "Suivi IDEL",
    lignes: [{ description: "Suivi IDEL mensuel — CPAM, cotation NGAP, DSI", quantite: 1, prix_unitaire: 89 }],
    taux_tva: 20,
  },
];

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function SuiviAbonnement({ devisId }: { devisId: string }) {
  const [mois, setMois] = useState<MoisAbonnement[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<number | null>(null);

  useEffect(() => {
    getAbonnementSuivi(devisId)
      .then((data) => setMois(safeArr<MoisAbonnement>(data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [devisId]);

  async function generer(idx: number) {
    setAction(idx);
    try {
      await genererFactureMois(devisId, idx);
      const data = await getAbonnementSuivi(devisId);
      setMois(safeArr<MoisAbonnement>(data));
    } catch {}
    finally { setAction(null); }
  }

  if (loading) return <p className="text-xs text-textMuted">Chargement suivi…</p>;
  if (!mois.length) return <p className="text-xs text-textMuted">Aucun mois configuré.</p>;

  return (
    <div className="mt-3 space-y-1">
      {mois.map((m) => (
        <div key={m.mois_index} className="flex items-center justify-between gap-2 rounded-lg bg-surfaceAlt px-3 py-2">
          <div>
            <span className="text-xs font-medium text-textPrimary">{m.label}</span>
            <span className="ml-2 text-xs text-textMuted">{m.montant.toFixed(0)} €</span>
          </div>
          <div className="flex items-center gap-2">
            {m.facture_numero
              ? <span className="text-[11px] text-teal">✓ {m.facture_numero}</span>
              : <button onClick={() => generer(m.mois_index)} disabled={action === m.mois_index}
                  className="rounded bg-violet px-2 py-0.5 text-[10px] text-white disabled:opacity-50">
                  {action === m.mois_index ? "…" : "Générer"}
                </button>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DevisPage() {
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);
  const [devisEnEdition, setDevisEnEdition] = useState<Devis | null>(null);
  const [suivi, setSuivi] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [suppression, setSuppression] = useState<string | null>(null);

  // Mode forfait vs sur mesure
  const [modeForfait, setModeForfait] = useState<"forfait" | "mesure">("mesure");
  const [forfaitChoisi, setForfaitChoisi] = useState(0);

  // Champs formulaire
  const [clientId, setClientId] = useState("");
  const [objet, setObjet] = useState("");
  const [typeDevis, setTypeDevis] = useState<TypeDevis>("ponctuel");
  const [tauxTva, setTauxTva] = useState(20);
  const [dateExpiration, setDateExpiration] = useState("");
  const [notes, setNotes] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([{ ...LIGNE_VIDE }]);
  // Abonnement
  const [montantMensuel, setMontantMensuel] = useState("");
  const [dureeMois, setDureeMois] = useState("");
  const [premierDiffere, setPremierDiffere] = useState(false);
  const [premierVersement, setPremierVersement] = useState("");

  const charger = useCallback(() => {
    setLoading(true);
    Promise.all([getDevisListe(), getClients()])
      .then(([d, c]) => {
        setDevisList(safeArr<Devis>(d));
        setClients(safeArr<Client>(c));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { charger(); }, [charger]);

  function resetForm() {
    setDevisEnEdition(null);
    setModeForfait("mesure");
    setForfaitChoisi(0);
    setClientId("");
    setObjet("");
    setTypeDevis("ponctuel");
    setTauxTva(20);
    setDateExpiration("");
    setNotes("");
    setLignes([{ ...LIGNE_VIDE }]);
    setMontantMensuel("");
    setDureeMois("");
    setPremierDiffere(false);
    setPremierVersement("");
  }

  function ouvrirCreation() {
    resetForm();
    setFormOuvert(true);
    setError(null);
  }

  function ouvrirEdition(d: Devis) {
    setDevisEnEdition(d);
    setModeForfait("mesure");
    setForfaitChoisi(0);
    setClientId(d.client_id ?? "");
    setObjet(d.objet ?? "");
    setTypeDevis(d.type_devis ?? "ponctuel");
    setTauxTva(d.taux_tva ?? 20);
    setDateExpiration(d.date_expiration ?? "");
    setNotes(d.notes ?? "");
    setLignes(safeArr<Ligne>(d.lignes).length > 0 ? safeArr<Ligne>(d.lignes).map((l) => ({ ...l })) : [{ ...LIGNE_VIDE }]);
    setMontantMensuel(d.montant_mensuel != null ? String(d.montant_mensuel) : "");
    setDureeMois(d.duree_mois != null ? String(d.duree_mois) : "");
    setPremierDiffere(d.premier_versement_differe ?? false);
    setPremierVersement(d.premier_versement != null ? String(d.premier_versement) : "");
    setFormOuvert(true);
    setError(null);
  }

  function appliquerForfait(idx: number) {
    const f = FORFAITS[idx];
    setLignes(f.lignes.map((l) => ({ ...l })));
    setTauxTva(f.taux_tva);
    if (!objet) setObjet(f.label);
  }

  function modifierLigne(i: number, champ: keyof Ligne, val: string) {
    setLignes((prev) => prev.map((l, idx) => {
      if (idx !== i) return l;
      if (champ === "quantite" || champ === "prix_unitaire") {
        return { ...l, [champ]: parseFloat(val) || 0 };
      }
      return { ...l, [champ]: val };
    }));
  }

  function ajouterLigne() { setLignes((p) => [...p, { ...LIGNE_VIDE }]); }
  function supprimerLigne(i: number) { setLignes((p) => p.filter((_, idx) => idx !== i)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    const lignesValides = lignes.filter((l) => l.description.trim() !== "");
    const payload: DevisInput = {
      client_id: clientId || null,
      objet: objet.trim() || null,
      type_devis: typeDevis,
      taux_tva: tauxTva,
      date_expiration: dateExpiration || null,
      notes: notes.trim() || null,
      lignes: lignesValides,
      ...(typeDevis === "abonnement" ? {
        montant_mensuel: parseFloat(montantMensuel) || null,
        duree_mois: parseInt(dureeMois) || null,
        premier_versement_differe: premierDiffere,
        premier_versement: premierDiffere && premierVersement ? parseFloat(premierVersement) : null,
      } : {}),
    };
    try {
      if (devisEnEdition) {
        await modifierDevis(devisEnEdition.id, payload);
      } else {
        await creerDevis(payload);
      }
      setFormOuvert(false);
      resetForm();
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleEnvoyer(id: string) {
    if (!confirm("Envoyer ce devis pour signature ?")) return;
    setEnvoi(id);
    try {
      await envoyerDevisPourSignature(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setEnvoi(null);
    }
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer ce devis ?")) return;
    setSuppression(id);
    try {
      await supprimerDevis(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setSuppression(null);
    }
  }

  const { totalHt, totalTva, totalTtc } = calculerTotaux(lignes.filter((l) => l.description.trim() !== ""), tauxTva);

  const devisfiltres = safeArr<Devis>(devisList).filter((d) => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      d.numero?.toLowerCase().includes(q) ||
      d.objet?.toLowerCase().includes(q) ||
      d.client?.nom?.toLowerCase().includes(q) ||
      STATUT_LABEL[d.statut]?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Devis</h1>
            <p className="mt-0.5 text-sm text-textMuted">{devisList.length} devis</p>
          </div>
          <button onClick={ouvrirCreation}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
            + Nouveau devis
          </button>
        </div>

        {error && !formOuvert && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>
        )}

        {/* FORMULAIRE */}
        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-5 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-textPrimary">
              {devisEnEdition ? "Modifier le devis" : "Nouveau devis"}
            </h2>
            {error && <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">{error}</p>}

            {/* Mode forfait / sur mesure */}
            <div>
              <p className="mb-2 text-sm font-medium text-textMuted">Type de devis</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setModeForfait("forfait")}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${modeForfait === "forfait" ? "border-violet bg-violet/10 text-violet" : "border-line text-textMuted hover:border-violet/40"}`}>
                  📦 Forfait standard
                </button>
                <button type="button" onClick={() => setModeForfait("mesure")}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${modeForfait === "mesure" ? "border-teal bg-teal/10 text-teal" : "border-line text-textMuted hover:border-teal/40"}`}>
                  ✏️ Sur mesure
                </button>
              </div>
            </div>

            {/* Sélecteur forfait */}
            {modeForfait === "forfait" && (
              <div className="rounded-xl border border-violet/20 bg-violet/5 p-4">
                <p className="mb-3 text-sm font-medium text-textPrimary">Choisir un forfait</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FORFAITS.map((f, i) => (
                    <button key={i} type="button"
                      onClick={() => { setForfaitChoisi(i); appliquerForfait(i); }}
                      className={`rounded-lg border p-3 text-left text-sm transition ${forfaitChoisi === i ? "border-violet bg-violet/15 text-textPrimary" : "border-line text-textMuted hover:border-violet/40 hover:text-textPrimary"}`}>
                      <span className="font-semibold">{f.label}</span>
                      <span className="ml-2 text-xs opacity-70">
                        {f.lignes.reduce((s, l) => s + l.quantite * l.prix_unitaire, 0).toFixed(0)} € HT
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-textMuted">Les lignes seront pré-remplies — vous pouvez les modifier ensuite.</p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Client</span>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  <option value="">— Sans client —</option>
                  {safeArr<Client>(clients).map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Objet</span>
                <input value={objet} onChange={(e) => setObjet(e.target.value)}
                  placeholder="Mission de conseil IA"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Type</span>
                <select value={typeDevis} onChange={(e) => setTypeDevis(e.target.value as TypeDevis)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  <option value="ponctuel">Ponctuel</option>
                  <option value="abonnement">Abonnement mensuel</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">TVA (%)</span>
                <input type="number" value={tauxTva} min={0} max={100}
                  onChange={(e) => setTauxTva(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Date d'expiration</span>
                <input type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
            </div>

            {/* Options abonnement */}
            {typeDevis === "abonnement" && (
              <div className="rounded-xl border border-teal/20 bg-teal/5 p-4 space-y-3">
                <p className="text-sm font-medium text-textPrimary">Configuration abonnement</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-xs text-textMuted">Montant mensuel (€ HT)</span>
                    <input type="number" value={montantMensuel} onChange={(e) => setMontantMensuel(e.target.value)}
                      placeholder="290"
                      className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-textMuted">Durée (mois)</span>
                    <input type="number" value={dureeMois} onChange={(e) => setDureeMois(e.target.value)}
                      placeholder="12"
                      className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary text-sm" />
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer pt-5">
                    <input type="checkbox" checked={premierDiffere} onChange={(e) => setPremierDiffere(e.target.checked)}
                      className="accent-violet" />
                    <span className="text-xs text-textMuted">1er versement différé</span>
                  </label>
                </div>
                {premierDiffere && (
                  <label className="block">
                    <span className="mb-1 block text-xs text-textMuted">Montant du 1er versement (€ HT)</span>
                    <input type="number" value={premierVersement} onChange={(e) => setPremierVersement(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary text-sm" />
                  </label>
                )}
              </div>
            )}

            {/* Lignes */}
            <div>
              <p className="mb-2 text-sm font-medium text-textPrimary">Lignes du devis</p>
              <div className="space-y-2">
                {lignes.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input value={l.description} onChange={(e) => modifierLigne(i, "description", e.target.value)}
                      placeholder="Description de la prestation"
                      className="col-span-6 rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
                    <input type="number" value={l.quantite} onChange={(e) => modifierLigne(i, "quantite", e.target.value)}
                      className="col-span-2 rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary text-center" />
                    <input type="number" value={l.prix_unitaire} onChange={(e) => modifierLigne(i, "prix_unitaire", e.target.value)}
                      placeholder="0"
                      className="col-span-3 rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
                    <button type="button" onClick={() => supprimerLigne(i)}
                      className="col-span-1 text-textMuted hover:text-amber text-lg leading-none">×</button>
                  </div>
                ))}
                <div className="grid grid-cols-12 gap-2 text-[11px] text-textMuted px-1">
                  <span className="col-span-6">Description</span>
                  <span className="col-span-2 text-center">Qté</span>
                  <span className="col-span-3">Prix unit. (€)</span>
                </div>
              </div>
              <button type="button" onClick={ajouterLigne}
                className="mt-2 text-xs text-violet hover:underline">+ Ajouter une ligne</button>
            </div>

            {/* Totaux */}
            <div className="rounded-lg bg-surfaceAlt p-3 text-sm space-y-1">
              <div className="flex justify-between text-textMuted"><span>Total HT</span><span>{totalHt.toFixed(2)} €</span></div>
              <div className="flex justify-between text-textMuted"><span>TVA ({tauxTva}%)</span><span>{totalTva.toFixed(2)} €</span></div>
              <div className="flex justify-between font-bold text-textPrimary border-t border-line pt-1"><span>Total TTC</span><span>{totalTtc.toFixed(2)} €</span></div>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm text-textMuted">Notes internes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Conditions particulières, contexte…"
                className="w-full resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary text-sm" />
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {enregistrement ? "Enregistrement…" : devisEnEdition ? "Mettre à jour" : "Créer le devis"}
              </button>
              <button type="button" onClick={() => { setFormOuvert(false); resetForm(); }}
                className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
            </div>
          </form>
        )}

        {/* Recherche */}
        {devisList.length > 0 && (
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par numéro, objet, client, statut…"
            className="mb-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60" />
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : devisfiltres.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">{recherche ? "Aucun devis ne correspond." : "Aucun devis encore."}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {devisfiltres.map((d) => {
              const { totalTtc: ttc } = calculerTotaux(d.lignes, d.taux_tva);
              return (
                <div key={d.id} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-sm font-bold text-textPrimary">{d.numero}</span>
                        <span className={`text-xs font-medium ${STATUT_COULEUR[d.statut]}`}>{STATUT_LABEL[d.statut]}</span>
                        {d.type_devis === "abonnement" && (
                          <span className="rounded-full bg-teal/10 border border-teal/30 px-2 py-0.5 text-[11px] text-teal">Abonnement</span>
                        )}
                      </div>
                      {d.objet && <p className="mt-0.5 text-sm text-textMuted">{d.objet}</p>}
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-textMuted">
                        {d.client?.nom && <span>👤 {d.client.nom}</span>}
                        <span className="font-medium text-textPrimary">{ttc.toFixed(2)} € TTC</span>
                        {d.date_creation && <span>{new Date(d.date_creation).toLocaleDateString("fr-FR")}</span>}
                        {d.date_expiration && <span>Exp. {new Date(d.date_expiration).toLocaleDateString("fr-FR")}</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {d.statut === "brouillon" && (
                        <button onClick={() => handleEnvoyer(d.id)} disabled={envoi === d.id}
                          className="rounded-lg border border-violet/40 bg-violet/10 px-3 py-1.5 text-xs text-violet hover:bg-violet/20 disabled:opacity-50">
                          {envoi === d.id ? "…" : "Envoyer"}
                        </button>
                      )}
                      {d.statut === "envoye" && d.token_signature && (
                        <a href={`/signer/${d.token_signature}`} target="_blank" rel="noopener noreferrer"
                          className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs text-amber hover:bg-amber/20">
                          Voir lien
                        </a>
                      )}
                      {d.type_devis === "abonnement" && d.statut === "accepte" && (
                        <button onClick={() => setSuivi(suivi === d.id ? null : d.id)}
                          className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs text-teal hover:bg-teal/20">
                          {suivi === d.id ? "Masquer" : "Suivi mensuel"}
                        </button>
                      )}
                      <button onClick={() => ouvrirEdition(d)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                        Modifier
                      </button>
                      <button onClick={() => handleSupprimer(d.id)} disabled={suppression === d.id}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:border-amber/40 hover:text-amber disabled:opacity-50">
                        {suppression === d.id ? "…" : "Supprimer"}
                      </button>
                    </div>
                  </div>
                  {suivi === d.id && <SuiviAbonnement devisId={d.id} />}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
