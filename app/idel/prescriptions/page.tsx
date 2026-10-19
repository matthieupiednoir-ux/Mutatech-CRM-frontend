"use client";

import { useEffect, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import {
  prescriptionsLister, prescriptionsCreer, prescriptionsUploader,
  prescriptionsChangerValidite, prescriptionsRenouveler, prescriptionsModifier,
  prescriptionsDemandeRenouvellement, prescriptionsEnvoyerAuPipeline,
  Prescription, PrescriptionModification, DemandeRenouvellement,
} from "@/lib/api";
import { idelGetPatients, idelInsights } from "@/lib/api";
import { IdelPatient } from "@/lib/types";
import InsightStrip from "@/components/InsightStrip";

const VALIDITE_LABEL: Record<string, string> = {
  active: "Active", a_renouveler: "À renouveler", renouvellement_demande: "Renouvellement demandé",
  renouvelee: "Renouvelée", expiree: "Expirée",
};
const VALIDITE_COULEUR: Record<string, string> = {
  active: "#00D4AA", a_renouveler: "#F5A623", renouvellement_demande: "#a89eff",
  renouvelee: "#77778A", expiree: "#EF4444",
};

function dateFr(v?: string | null): string {
  if (!v) return "—";
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("fr-FR");
}

const PIPELINE_LABEL: Record<string, string> = { reception: "Réception", en_cours: "À coter", traite: "Traitée" };

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<string>("");

  // Depot photo/PDF (action principale)
  const [depotOuvert, setDepotOuvert] = useState(false);
  const [depotPatientId, setDepotPatientId] = useState("");
  const [depotFichier, setDepotFichier] = useState<File | null>(null);
  const [depotEnCours, setDepotEnCours] = useState(false);
  const [dernierDepot, setDernierDepot] = useState<Prescription | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saisie manuelle (repli si pas de papier)
  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState({
    patient_id: "", reference: "", medecin_prescripteur: "", date_prescription: "", date_expiration: "",
    acte_prescrit_texte: "", duree_traitement: "",
  });
  const [creation, setCreation] = useState(false);
  const [edition, setEdition] = useState<{ id: string; data: PrescriptionModification } | null>(null);
  const [demande, setDemande] = useState<DemandeRenouvellement | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    Promise.all([prescriptionsLister(filtre || undefined), idelGetPatients()])
      .then(([p, pat]) => { setPrescriptions(p); setPatients(pat); })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, [filtre]);

  async function handleDeposer(e: React.FormEvent) {
    e.preventDefault();
    if (!depotPatientId || !depotFichier) {
      setError("Sélectionne un patient et une photo/PDF de l'ordonnance.");
      return;
    }
    setDepotEnCours(true);
    setError(null);
    setDernierDepot(null);
    try {
      const resultat = await prescriptionsUploader(depotPatientId, depotFichier);
      setDernierDepot(resultat);
      setDepotFichier(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du dépôt.");
    } finally {
      setDepotEnCours(false);
    }
  }

  async function handleCreer(e: React.FormEvent) {
    e.preventDefault();
    setCreation(true);
    setError(null);
    try {
      await prescriptionsCreer(form);
      setForm({ patient_id: "", reference: "", medecin_prescripteur: "", date_prescription: "", date_expiration: "", acte_prescrit_texte: "", duree_traitement: "" });
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
    } finally {
      setCreation(false);
    }
  }

  async function handleChangerValidite(p: Prescription, statut: string) {
    setError(null);
    try {
      await prescriptionsChangerValidite(p.id, statut);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  async function handleEnregistrerEdition(e: React.FormEvent) {
    e.preventDefault();
    if (!edition) return;
    setError(null);
    try { await prescriptionsModifier(edition.id, edition.data); setEdition(null); charger(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Modification impossible."); }
  }

  async function handleDemandeRenouvellement(p: Prescription) {
    setError(null);
    try { setDemande(await prescriptionsDemandeRenouvellement(p.id)); charger(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur."); }
  }

  async function handleEnvoyerAuPipeline(p: Prescription) {
    setError(null);
    try {
      await prescriptionsEnvoyerAuPipeline(p.id);
      setInfo(`Ordonnance de ${p.patient_prenom} ${p.patient_nom} envoyée dans votre Pipeline de cotation.`);
      charger();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Envoi impossible."); }
  }

  async function handleRenouveler(p: Prescription) {
    if (!p.patient_id) return;
    const exp = prompt("Date d'expiration de la nouvelle ordonnance (JJ/MM/AAAA, facultatif) :", "");
    if (exp === null) return;
    setError(null);
    try {
      await prescriptionsRenouveler(p.id, {
        patient_id: p.patient_id, reference: p.reference || undefined,
        ...(exp.trim() ? { date_expiration: exp.trim() } : {}),
      });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du renouvellement.");
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <InsightStrip fetcher={idelInsights} module="prescriptions" />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Ordonnances</h1>
            <p className="mt-1 text-sm text-textMuted">Dépôt, extraction automatique et suivi de validité.</p>
          </div>
          {/* flex-wrap : sur téléphone, les boutons passent à la ligne au lieu de déborder de l'écran */}
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <select value={filtre} onChange={(e) => setFiltre(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
              <option value="">Tous statuts</option>
              {Object.entries(VALIDITE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button onClick={() => { setDepotOuvert(true); setFormOuvert(false); }} className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90" style={{ backgroundColor: "var(--accent)" }}>
              📷 Déposer une ordonnance
            </button>
            <button onClick={() => { setFormOuvert(true); setDepotOuvert(false); }} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted hover:text-textPrimary">
              Saisie manuelle
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}
        {info && (
          <p className="mb-4 flex justify-between gap-3 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">
            <span>{info} <a href="/idel" className="underline">Ouvrir le Pipeline</a></span>
            <button onClick={() => setInfo(null)}>✕</button>
          </p>
        )}
        {demande && (
          <div className="mb-6 space-y-2 rounded-xl border border-violet/30 bg-violet/5 p-5 text-sm">
            <p className="font-medium text-textPrimary">Message de demande de renouvellement</p>
            <p className="text-[11px] text-textMuted">
              À envoyer depuis votre messagerie sécurisée de santé (MSSanté) : Mutatech n&apos;envoie rien lui-même, une messagerie classique n&apos;étant pas adaptée aux données de santé.
            </p>
            <p className="text-xs text-textMuted">Destinataire : {demande.destinataire_mssante || demande.destinataire_email || "adresse MSSanté du médecin à renseigner"}</p>
            <p className="text-xs text-textMuted">Objet : {demande.objet}</p>
            <textarea readOnly value={demande.corps} rows={7} className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-textPrimary" />
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(`${demande.objet}\n\n${demande.corps}`)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textPrimary">Copier</button>
              <button onClick={() => setDemande(null)} className="text-xs text-textMuted">Fermer</button>
            </div>
          </div>
        )}

        {depotOuvert && (
          <form onSubmit={handleDeposer} className="mb-6 rounded-xl border border-line bg-surface p-5">
            <p className="mb-3 text-sm font-medium text-textPrimary">Déposer une photo ou un PDF</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select required value={depotPatientId} onChange={(e) => setDepotPatientId(e.target.value)}
                className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                <option value="">— Patient —</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
              </select>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
                onChange={(e) => setDepotFichier(e.target.files?.[0] || null)}
                className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary file:mr-3 file:rounded file:border-0 file:bg-surface file:px-2 file:py-1 file:text-xs"
              />
            </div>
            <p className="mt-2 text-[11px] text-textMuted">
              Photo (JPEG, PNG, WebP) ou PDF, 10 Mo maximum. L&apos;extraction automatique (médecin, date, acte prescrit) est à vérifier, et se complète à la main si besoin avec le bouton « Modifier ».
            </p>
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={depotEnCours} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {depotEnCours ? "Analyse en cours..." : "Déposer et analyser"}
              </button>
              <button type="button" onClick={() => setDepotOuvert(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
            </div>
          </form>
        )}

        {dernierDepot && (
          <div className="mb-6 rounded-xl border border-teal/40 bg-teal/10 p-5">
            <p className="mb-2 text-sm font-medium text-teal">✓ Ordonnance déposée — extraction automatique :</p>
            <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm text-textPrimary sm:grid-cols-2">
              <p><span className="text-textMuted">Médecin :</span> {dernierDepot.medecin_prescripteur || "— non détecté —"}</p>
              <p><span className="text-textMuted">Date :</span> {dernierDepot.date_prescription || "— non détectée —"}</p>
              <p className="sm:col-span-2"><span className="text-textMuted">Acte prescrit :</span> {dernierDepot.acte_prescrit_texte || "— non détecté —"}</p>
              <p><span className="text-textMuted">Durée :</span> {dernierDepot.duree_traitement || "—"}</p>
              {dernierDepot.confiance_ocr != null && (
                <p><span className="text-textMuted">Confiance :</span> {Math.round(dernierDepot.confiance_ocr * 100)}%</p>
              )}
            </div>
            <p className="mt-2 text-[11px] text-textMuted">
              Vérifie et complète ces informations si besoin — l'extraction automatique n'est jamais garantie à 100%.
            </p>
            <button onClick={() => setDernierDepot(null)} className="mt-2 text-xs text-teal hover:underline">Masquer</button>
          </div>
        )}

        {formOuvert && (
          <form onSubmit={handleCreer} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <select required value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary sm:col-span-2">
              <option value="">— Patient —</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
            </select>
            <input placeholder="Référence (ex: ORDO-Dupont-2026)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
            <input placeholder="Médecin prescripteur" value={form.medecin_prescripteur} onChange={(e) => setForm({ ...form, medecin_prescripteur: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
            <div>
              <label className="mb-1 block text-xs text-textMuted">Date prescription</label>
              <input type="date" value={form.date_prescription} onChange={(e) => setForm({ ...form, date_prescription: e.target.value })}
                className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-textMuted">Date expiration</label>
              <input type="date" value={form.date_expiration} onChange={(e) => setForm({ ...form, date_expiration: e.target.value })}
                className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
            </div>
            <textarea placeholder="Soins prescrits" value={form.acte_prescrit_texte} onChange={(e) => setForm({ ...form, acte_prescrit_texte: e.target.value })}
              rows={2} className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2" />
            <input placeholder="Durée du traitement (ex. 3 mois)" value={form.duree_traitement} onChange={(e) => setForm({ ...form, duree_traitement: e.target.value })}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50" />
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={creation} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {creation ? "..." : "Créer"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">Annuler</button>
            </div>
          </form>
        )}

        {loading ? <p className="text-sm text-textMuted">Chargement...</p> : prescriptions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">Aucune ordonnance.</p>
        ) : (
          <div className="space-y-2">
            {prescriptions.map((p) => (
              <div key={p.id} className="rounded-lg border border-line bg-surface px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-textPrimary">
                      {p.patient_prenom} {p.patient_nom} {p.reference && <span className="text-textMuted">· {p.reference}</span>}
                      {p.fichier_nom_original && <span className="ml-1.5 text-[10px] text-textMuted">📎</span>}
                    </p>
                    <p className="text-xs text-textMuted">
                      {p.medecin_prescripteur || "—"}
                      {p.acte_prescrit_texte && ` · ${p.acte_prescrit_texte}`}
                      {" · expire le "}{dateFr(p.date_expiration)}
                    </p>
                    {p.statut_pipeline && <p className="text-[11px] text-teal">Pipeline : {PIPELINE_LABEL[p.statut_pipeline] ?? p.statut_pipeline}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={p.statut_validite || "active"}
                      onChange={(e) => handleChangerValidite(p, e.target.value)}
                      className="rounded-full border-0 px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${VALIDITE_COULEUR[p.statut_validite || "active"]}22`, color: VALIDITE_COULEUR[p.statut_validite || "active"] }}
                    >
                      {Object.entries(VALIDITE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {(p.statut_validite === "a_renouveler" || p.statut_validite === "expiree") && !p.renewed_by_id && (
                      <>
                        <button onClick={() => handleDemandeRenouvellement(p)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary">
                          Demander au médecin
                        </button>
                        <button onClick={() => handleRenouveler(p)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary">
                          Enregistrer le renouvellement
                        </button>
                      </>
                    )}
                    {p.statut_validite === "renouvellement_demande" && !p.renewed_by_id && (
                      <button onClick={() => handleRenouveler(p)} className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary">
                        Enregistrer le renouvellement
                      </button>
                    )}
                    {!p.statut_pipeline && (
                      <button onClick={() => handleEnvoyerAuPipeline(p)} className="rounded-lg border border-teal/40 px-2.5 py-1 text-xs text-teal">→ Coter</button>
                    )}
                    <button onClick={() => setEdition(edition?.id === p.id ? null : { id: p.id, data: {
                      reference: p.reference ?? "", medecin_prescripteur: p.medecin_prescripteur ?? "", doctor_mssante: p.doctor_mssante ?? "",
                      doctor_email: p.doctor_email ?? "", date_prescription: p.date_prescription ?? "", date_expiration: p.date_expiration ?? "",
                      acte_prescrit_texte: p.acte_prescrit_texte ?? "", duree_traitement: p.duree_traitement ?? "",
                    } })} className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary">✎ Modifier</button>
                  </div>
                </div>
                {edition?.id === p.id && (
                  <form onSubmit={handleEnregistrerEdition} className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-surfaceAlt p-3 sm:grid-cols-2">
                    {([
                      ["medecin_prescripteur", "Médecin prescripteur"], ["reference", "Référence"],
                      ["doctor_mssante", "Adresse MSSanté du médecin"], ["doctor_email", "Email du médecin"],
                      ["duree_traitement", "Durée du traitement"],
                    ] as const).map(([cle, label]) => (
                      <input key={cle} placeholder={label} value={edition.data[cle] ?? ""}
                        onChange={(e) => setEdition({ ...edition, data: { ...edition.data, [cle]: e.target.value } })}
                        className="rounded border border-line bg-surface px-2 py-1.5 text-xs text-textPrimary" />
                    ))}
                    <label className="text-[11px] text-textMuted">Date de prescription
                      <input type="date" value={edition.data.date_prescription ?? ""} onChange={(e) => setEdition({ ...edition, data: { ...edition.data, date_prescription: e.target.value } })}
                        className="w-full rounded border border-line bg-surface px-2 py-1.5 text-xs text-textPrimary" />
                    </label>
                    <label className="text-[11px] text-textMuted">Date d&apos;expiration
                      <input type="date" value={edition.data.date_expiration ?? ""} onChange={(e) => setEdition({ ...edition, data: { ...edition.data, date_expiration: e.target.value } })}
                        className="w-full rounded border border-line bg-surface px-2 py-1.5 text-xs text-textPrimary" />
                    </label>
                    <textarea placeholder="Soins prescrits" value={edition.data.acte_prescrit_texte ?? ""} rows={2}
                      onChange={(e) => setEdition({ ...edition, data: { ...edition.data, acte_prescrit_texte: e.target.value } })}
                      className="rounded border border-line bg-surface px-2 py-1.5 text-xs text-textPrimary sm:col-span-2" />
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="submit" className="rounded px-3 py-1.5 text-xs font-medium text-white" style={{ backgroundColor: "var(--accent)" }}>Enregistrer</button>
                      <button type="button" onClick={() => setEdition(null)} className="text-xs text-textMuted">Annuler</button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
