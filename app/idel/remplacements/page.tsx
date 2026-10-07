"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import {
  remplacantsLister, remplacantsCreer, remplacantsModifier, remplacantsDesactiver,
  retrocessionsLister, retrocessionsCreer, retrocessionsSupprimer,
  retrocessionsGenererPdf, retrocessionsTelechargerPdf,
  Remplacant, Retrocession,
} from "@/lib/api";

interface RemplacantForm {
  nom: string; prenom: string; numero_adeli: string; siret: string; email: string; telephone: string; notes: string;
}
const REMPLACANT_VIDE: RemplacantForm = { nom: "", prenom: "", numero_adeli: "", siret: "", email: "", telephone: "", notes: "" };

interface RetrocessionForm {
  remplacant_id: string; titulaire_nom: string; titulaire_siret: string; titulaire_adresse: string;
  montant: string; date_debut: string; date_fin: string;
  virement_reference: string; banque: string; lieu_signature: string; date_signature: string;
}
const RETROCESSION_VIDE: RetrocessionForm = {
  remplacant_id: "", titulaire_nom: "", titulaire_siret: "", titulaire_adresse: "",
  montant: "", date_debut: "", date_fin: "",
  virement_reference: "", banque: "", lieu_signature: "", date_signature: "",
};

function telechargerBlob(blob: Blob, nomFichier: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function RemplacementsPage() {
  const [onglet, setOnglet] = useState<"retrocessions" | "remplacants">("retrocessions");
  const [remplacants, setRemplacants] = useState<Remplacant[]>([]);
  const [retrocessions, setRetrocessions] = useState<Retrocession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const [formRemplacant, setFormRemplacant] = useState(false);
  const [remplacantForm, setRemplacantForm] = useState<RemplacantForm>(REMPLACANT_VIDE);
  const [creationRemplacant, setCreationRemplacant] = useState(false);

  const [formRetrocession, setFormRetrocession] = useState(false);
  const [retrocessionForm, setRetrocessionForm] = useState<RetrocessionForm>(RETROCESSION_VIDE);
  const [creationRetrocession, setCreationRetrocession] = useState(false);

  const [pdfEnCours, setPdfEnCours] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    Promise.all([remplacantsLister(), retrocessionsLister()])
      .then(([r, a]) => { setRemplacants(r); setRetrocessions(a); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleCreerRemplacant(e: React.FormEvent) {
    e.preventDefault();
    setCreationRemplacant(true);
    setError(null);
    try {
      const { nom, prenom, numero_adeli, siret, email, telephone, notes } = remplacantForm;
      await remplacantsCreer({
        nom, prenom,
        numero_adeli: numero_adeli || undefined, siret: siret || undefined,
        email: email || undefined, telephone: telephone || undefined, notes: notes || undefined,
      });
      setRemplacantForm(REMPLACANT_VIDE);
      setFormRemplacant(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
    } finally {
      setCreationRemplacant(false);
    }
  }

  async function handleDesactiverRemplacant(r: Remplacant) {
    if (!confirm(`Désactiver la fiche de ${r.prenom} ${r.nom} ?`)) return;
    setError(null);
    try {
      await remplacantsDesactiver(r.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la désactivation.");
    }
  }

  async function handleReactiverRemplacant(r: Remplacant) {
    setError(null);
    try {
      await remplacantsModifier(r.id, { actif: true });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la réactivation.");
    }
  }

  async function handleCreerRetrocession(e: React.FormEvent) {
    e.preventDefault();
    setCreationRetrocession(true);
    setError(null);
    try {
      const f = retrocessionForm;
      if (!f.remplacant_id) {
        setError("Sélectionne un(e) remplaçant(e).");
        setCreationRetrocession(false);
        return;
      }
      await retrocessionsCreer({
        remplacant_id: f.remplacant_id,
        titulaire_nom: f.titulaire_nom,
        titulaire_siret: f.titulaire_siret || undefined,
        titulaire_adresse: f.titulaire_adresse || undefined,
        montant: parseFloat(f.montant) || 0,
        date_debut: f.date_debut,
        date_fin: f.date_fin,
        virement_reference: f.virement_reference || undefined,
        banque: f.banque || undefined,
        lieu_signature: f.lieu_signature || undefined,
        date_signature: f.date_signature || undefined,
      });
      setRetrocessionForm(RETROCESSION_VIDE);
      setFormRetrocession(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
    } finally {
      setCreationRetrocession(false);
    }
  }

  async function handleSupprimerRetrocession(r: Retrocession) {
    if (!confirm("Supprimer cette attestation de rétrocession ?")) return;
    setError(null);
    try {
      await retrocessionsSupprimer(r.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la suppression.");
    }
  }

  async function handleGenererPdf(r: Retrocession) {
    setPdfEnCours(r.id);
    setError(null);
    setSucces(null);
    try {
      const blob = await retrocessionsGenererPdf(r.id);
      telechargerBlob(blob, `attestation-retrocession-${r.remplacant.nom}-${r.date_debut}.pdf`);
      setSucces("PDF généré et téléchargé.");
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la génération du PDF.");
    } finally {
      setPdfEnCours(null);
    }
  }

  async function handleTelechargerPdf(r: Retrocession) {
    setPdfEnCours(r.id);
    setError(null);
    try {
      const blob = await retrocessionsTelechargerPdf(r.id);
      telechargerBlob(blob, `attestation-retrocession-${r.remplacant.nom}-${r.date_debut}.pdf`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du téléchargement.");
    } finally {
      setPdfEnCours(null);
    }
  }

  function formatMontant(m: number): string {
    return m.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }
  function formatDateFr(d: string): string {
    const [annee, mois, jour] = d.split("-");
    return jour && mois && annee ? `${jour}/${mois}/${annee}` : d;
  }

  const remplacantsActifs = remplacants.filter((r) => r.actif);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Remplacements</h1>
            <p className="mt-1 text-sm text-textMuted">
              Rétrocession d'honoraires versée aux remplaçant(e)s et génération des attestations.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOnglet(onglet === "retrocessions" ? "remplacants" : "retrocessions")}
              className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary"
            >
              {onglet === "retrocessions" ? "Remplaçant(e)s →" : "← Attestations"}
            </button>
            <button
              onClick={() => onglet === "retrocessions" ? setFormRetrocession(true) : setFormRemplacant(true)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {onglet === "retrocessions" ? "+ Attestation" : "+ Remplaçant(e)"}
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}
        {succes && <p className="mb-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{succes}</p>}

        {onglet === "remplacants" ? (
          <>
            {formRemplacant && (
              <form onSubmit={handleCreerRemplacant} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-3">
                <input required placeholder="Nom" value={remplacantForm.nom}
                  onChange={(e) => setRemplacantForm({ ...remplacantForm, nom: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <input required placeholder="Prénom" value={remplacantForm.prenom}
                  onChange={(e) => setRemplacantForm({ ...remplacantForm, prenom: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <input placeholder="N° ADELI" value={remplacantForm.numero_adeli}
                  onChange={(e) => setRemplacantForm({ ...remplacantForm, numero_adeli: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <input placeholder="SIRET" value={remplacantForm.siret}
                  onChange={(e) => setRemplacantForm({ ...remplacantForm, siret: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <input type="email" placeholder="Email" value={remplacantForm.email}
                  onChange={(e) => setRemplacantForm({ ...remplacantForm, email: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <input placeholder="Téléphone" value={remplacantForm.telephone}
                  onChange={(e) => setRemplacantForm({ ...remplacantForm, telephone: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                <textarea placeholder="Notes" value={remplacantForm.notes} rows={2}
                  onChange={(e) => setRemplacantForm({ ...remplacantForm, notes: e.target.value })}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-3" />
                <div className="flex gap-2 sm:col-span-3">
                  <button type="submit" disabled={creationRemplacant} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                    {creationRemplacant ? "..." : "Créer"}
                  </button>
                  <button type="button" onClick={() => setFormRemplacant(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
                </div>
              </form>
            )}
            {loading ? <p className="text-sm text-textMuted">Chargement...</p> : remplacants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">Aucun(e) remplaçant(e) enregistré(e).</p>
            ) : (
              <div className="space-y-2">
                {remplacants.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm text-textPrimary">
                        {r.prenom} {r.nom} {!r.actif && <span className="ml-2 text-xs text-textMuted">(désactivé(e))</span>}
                      </p>
                      <p className="text-xs text-textMuted">
                        {r.numero_adeli ? `ADELI ${r.numero_adeli}` : "—"}
                        {r.telephone ? ` · ${r.telephone}` : ""}
                        {r.email ? ` · ${r.email}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => r.actif ? handleDesactiverRemplacant(r) : handleReactiverRemplacant(r)}
                      className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary"
                    >
                      {r.actif ? "Désactiver" : "Réactiver"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {formRetrocession && (
              <form onSubmit={handleCreerRetrocession} className="mb-6 rounded-xl border border-line bg-surface p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select required value={retrocessionForm.remplacant_id}
                    onChange={(e) => setRetrocessionForm({ ...retrocessionForm, remplacant_id: e.target.value })}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary sm:col-span-2">
                    <option value="">— Remplaçant(e) —</option>
                    {remplacantsActifs.map((r) => <option key={r.id} value={r.id}>{r.prenom} {r.nom}</option>)}
                  </select>

                  <input required placeholder="Nom du titulaire" value={retrocessionForm.titulaire_nom}
                    onChange={(e) => setRetrocessionForm({ ...retrocessionForm, titulaire_nom: e.target.value })}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                  <input placeholder="SIRET du titulaire" value={retrocessionForm.titulaire_siret}
                    onChange={(e) => setRetrocessionForm({ ...retrocessionForm, titulaire_siret: e.target.value })}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                  <input placeholder="Adresse du titulaire" value={retrocessionForm.titulaire_adresse}
                    onChange={(e) => setRetrocessionForm({ ...retrocessionForm, titulaire_adresse: e.target.value })}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />

                  <input required type="number" min="0" step="0.01" placeholder="Montant (€)" value={retrocessionForm.montant}
                    onChange={(e) => setRetrocessionForm({ ...retrocessionForm, montant: e.target.value })}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                  <input placeholder="Référence virement" value={retrocessionForm.virement_reference}
                    onChange={(e) => setRetrocessionForm({ ...retrocessionForm, virement_reference: e.target.value })}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />

                  <label className="flex flex-col gap-1 text-xs text-textMuted">
                    Début du remplacement
                    <input required type="date" value={retrocessionForm.date_debut}
                      onChange={(e) => setRetrocessionForm({ ...retrocessionForm, date_debut: e.target.value })}
                      className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-textMuted">
                    Fin du remplacement
                    <input required type="date" value={retrocessionForm.date_fin}
                      onChange={(e) => setRetrocessionForm({ ...retrocessionForm, date_fin: e.target.value })}
                      className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
                  </label>

                  <input placeholder="Banque" value={retrocessionForm.banque}
                    onChange={(e) => setRetrocessionForm({ ...retrocessionForm, banque: e.target.value })}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
                  <input placeholder="Lieu de signature" value={retrocessionForm.lieu_signature}
                    onChange={(e) => setRetrocessionForm({ ...retrocessionForm, lieu_signature: e.target.value })}
                    className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />

                  <label className="flex flex-col gap-1 text-xs text-textMuted sm:col-span-2">
                    Date de signature
                    <input type="date" value={retrocessionForm.date_signature}
                      onChange={(e) => setRetrocessionForm({ ...retrocessionForm, date_signature: e.target.value })}
                      className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary sm:w-56" />
                  </label>
                </div>

                <div className="mt-4 flex gap-2">
                  <button type="submit" disabled={creationRetrocession} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                    {creationRetrocession ? "..." : "Créer l'attestation"}
                  </button>
                  <button type="button" onClick={() => setFormRetrocession(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
                </div>
              </form>
            )}

            {loading ? <p className="text-sm text-textMuted">Chargement...</p> : retrocessions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">Aucune attestation de rétrocession.</p>
            ) : (
              <div className="space-y-2">
                {retrocessions.map((r) => (
                  <div key={r.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-textPrimary">
                          {r.remplacant.prenom} {r.remplacant.nom} — {formatMontant(r.montant)}
                        </p>
                        <p className="text-xs text-textMuted">
                          Du {formatDateFr(r.date_debut)} au {formatDateFr(r.date_fin)} · titulaire : {r.titulaire_nom}
                          {r.pdf_path && <span className="ml-2 text-teal">· PDF généré</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.pdf_path ? (
                          <button
                            onClick={() => handleTelechargerPdf(r)}
                            disabled={pdfEnCours === r.id}
                            className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary disabled:opacity-50"
                          >
                            {pdfEnCours === r.id ? "..." : "⬇ Télécharger le PDF"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenererPdf(r)}
                            disabled={pdfEnCours === r.id}
                            className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary disabled:opacity-50"
                          >
                            {pdfEnCours === r.id ? "..." : "📄 Générer le PDF"}
                          </button>
                        )}
                        <button
                          onClick={() => handleSupprimerRetrocession(r)}
                          className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-amber"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
