"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import {
  idelGetOrdonnances, idelUploaderOrdonnance, idelSaisirOrdonnance, idelPasserEnCours,
  idelFichierOrdonnance, idelProposerCotation, idelReferentielNgap, idelSimulerCotation,
  idelValiderCotation, idelAnnulerCotation, idelMarquerTransmis, idelRetourNoemie,
  idelExporterCsv, idelFicheReprise, idelGetPatients, idelCreerPatient, idelGetMe,
  monOrganisation, ApiError, PerimetrePipeline,
} from "@/lib/api";
import {
  IdelOrdonnance, CotationOut, IdelPatient, FicheReprise, IdelMe, ZoneDeplacement,
  ActeReferentiel, ActeSaisi, SeanceCotation, SimulationNGAP, NuitPlage, ZoneIk, StatutFse,
} from "@/lib/types";

// Recette du 19/10/2026 : l'écran n'a plus son propre calcul NGAP (C7,
// O2). Il envoie la séance au moteur unique du serveur (POST
// /api/ngap/simuler) et affiche le résultat tel quel ; la validation
// enregistre exactement le même calcul. L'« Assistant NGAP » qui passait
// par l'agent du CRM avec des tarifs faux a été retiré (I18).

// ===== TYPES LOCAUX =====
interface PatientForm {
  nom: string; prenom: string; date_naissance: string; numero_secu: string;
  telephone: string; adresse: string; medecin_traitant: string; notes: string;
  zone_deplacement: ZoneDeplacement; distance_km: string;
}
interface SaisieForm {
  medecin_prescripteur: string; rpps_prescripteur: string; date_prescription: string;
  acte_prescrit_texte: string; duree_traitement: string;
}
interface TourneeItem { patientId: string; heure: string; ordre: number; note: string; }

const ZONES: { value: ZoneDeplacement; label: string }[] = [
  { value: "plaine", label: "Plaine" },
  { value: "montagne", label: "Montagne" },
  { value: "tres_montagneux", label: "Très montagneux (IK montagne)" },
  { value: "pied_ski", label: "À pied ou à ski" },
];
const NUITS: { value: NuitPlage | ""; label: string }[] = [
  { value: "", label: "Pas de nuit" },
  { value: "20h_23h_5h_8h", label: "Nuit 20h-23h ou 5h-8h" },
  { value: "23h_5h", label: "Nuit 23h-5h" },
];

function zoneIk(z?: ZoneDeplacement | null): ZoneIk {
  if (z === "montagne" || z === "tres_montagneux") return "montagne";
  if (z === "pied_ski") return "pied_ski";
  return "plaine";
}

function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function estDimanche(dateIso: string): boolean {
  const d = new Date(`${dateIso}T12:00:00`);
  return !Number.isNaN(d.getTime()) && d.getDay() === 0;
}

function safeArr<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : []; }

function euros(n?: number | null): string {
  return `${(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function dateFr(v?: string | null): string {
  if (!v) return "";
  const d = new Date(v.length === 10 ? `${v}T12:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("fr-FR");
}

const VIDE_PATIENT: PatientForm = {
  nom: "", prenom: "", date_naissance: "", numero_secu: "",
  telephone: "", adresse: "", medecin_traitant: "", notes: "",
  zone_deplacement: "plaine", distance_km: "",
};

function seanceInitiale(patient?: IdelPatient | null): SeanceCotation {
  const jour = aujourdhui();
  return {
    lignes: [], dimanche_ferie: estDimanche(jour), nuit: null, domicile: true,
    distance_km: patient?.distance_km ?? 0, zone: zoneIk(patient?.zone_deplacement),
    mci: false, nb_seances: 1, date_soin: jour,
  };
}

const STATUT_LABEL: Record<string, string> = { reception: "Réception", en_cours: "En cours", traite: "Traité" };
const STATUT_COL: Record<string, string> = {
  reception: "border-line text-textMuted",
  en_cours: "border-amber/40 bg-amber/10 text-amber",
  traite: "border-teal/40 bg-teal/10 text-teal",
};
const FSE_LABEL: Record<StatutFse, string> = {
  non_transmise: "Non transmise", transmise: "Transmise, en attente NOEMIE", payee: "Payée", rejetee: "Rejetée",
};
const FSE_COL: Record<StatutFse, string> = {
  non_transmise: "bg-surfaceAlt text-textMuted", transmise: "bg-amber/20 text-amber",
  payee: "bg-teal/20 text-teal", rejetee: "bg-red-500/15 text-red-400",
};
const ROLES_COORDINATION = ["org_admin", "gerant", "mutatech_admin", "idec"];

const LPS_LABELS: Record<string, string> = {
  vega: "Vega", albus: "Albus", simply_vitale: "Simply Vitale", agathe_you: "Agathe&You",
  ozzen: "Ozzen", desmos: "Desmos", carecare: "CareCare", infimax: "Infimax", autre: "votre logiciel",
};

const champ = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary";

export default function IdelPage() {
  const [vue, setVue] = useState<"pipeline" | "tournee">("pipeline");
  const [ordonnances, setOrdonnances] = useState<IdelOrdonnance[]>([]);
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [upload, setUpload] = useState(false);
  const [panneau, setPanneau] = useState<IdelOrdonnance | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [moi, setMoi] = useState<IdelMe | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [perimetre, setPerimetre] = useState<PerimetrePipeline>("moi");
  const [referentiel, setReferentiel] = useState<ActeReferentiel[]>([]);

  // Export CSV / Fiche de reprise
  const [ficheReprise, setFicheReprise] = useState<FicheReprise | null>(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Saisie manuelle de l'ordonnance (C9)
  const [saisie, setSaisie] = useState<SaisieForm | null>(null);
  const [saisieErr, setSaisieErr] = useState<string | null>(null);

  // Cotation : séance éditable + simulation renvoyée par le serveur
  const [seance, setSeance] = useState<SeanceCotation>(seanceInitiale());
  const [simulation, setSimulation] = useState<SimulationNGAP | null>(null);
  const [simErr, setSimErr] = useState<string | null>(null);
  const [propAlertes, setPropAlertes] = useState<string[]>([]);
  const [cotLoading, setCotLoading] = useState(false);
  const [cotErr, setCotErr] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [codeLibre, setCodeLibre] = useState("");

  // Création patient inline
  const [creerMode, setCreerMode] = useState(false);
  const [patForm, setPatForm] = useState<PatientForm>({ ...VIDE_PATIENT });
  const [patSaving, setPatSaving] = useState(false);
  const [patErr, setPatErr] = useState<string | null>(null);

  // Tournée du jour (aide-mémoire local, non enregistré : le module
  // Tournées enregistre et partage les tournées du cabinet).
  const [tournee, setTournee] = useState<TourneeItem[]>([]);
  const [tourneePatient, setTourneePatient] = useState("");
  const [tourneeHeure, setTourneeHeure] = useState("08:00");
  const [tourneeNote, setTourneeNote] = useState("");

  const coordination = role ? ROLES_COORDINATION.includes(role) : false;

  function charger(p: PerimetrePipeline = perimetre): Promise<IdelOrdonnance[]> {
    setLoading(true);
    return Promise.all([
      idelGetOrdonnances(p),
      idelGetPatients().catch(() => [] as IdelPatient[]),
    ])
      .then(([ordo, pts]) => {
        const ordoArr = safeArr<IdelOrdonnance>(ordo);
        setOrdonnances(ordoArr);
        setPatients(safeArr<IdelPatient>(pts));
        return ordoArr;
      })
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "Erreur de chargement");
        return [] as IdelOrdonnance[];
      })
      .finally(() => setLoading(false));
  }

  async function rafraichirPanneau(id: string) {
    const fraiches = await charger();
    const maj = fraiches.find((o) => o.id === id);
    if (maj) ouvrirPanneau(maj, false); else setPanneau(null);
  }

  useEffect(() => {
    idelGetMe().then(setMoi).catch(() => setMoi(null));
    idelReferentielNgap().then((r) => setReferentiel(safeArr<ActeReferentiel>(r.actes))).catch(() => setReferentiel([]));
    monOrganisation()
      .then((org) => {
        setRole(org.role);
        const p: PerimetrePipeline = ROLES_COORDINATION.includes(org.role) ? "cabinet" : "moi";
        setPerimetre(p);
        charger(p);
      })
      .catch(() => { setRole(null); charger("moi"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulation par le serveur à chaque modification de la séance.
  useEffect(() => {
    if (!panneau || panneau.statut !== "en_cours" || seance.lignes.length === 0) { setSimulation(null); setSimErr(null); return; }
    const t = setTimeout(() => {
      idelSimulerCotation(seance)
        .then((r) => { setSimulation(r); setSimErr(null); })
        .catch((e) => { setSimulation(null); setSimErr(e instanceof ApiError ? e.message : "Calcul impossible"); });
    }, 300);
    return () => clearTimeout(t);
  }, [seance, panneau]);

  function ouvrirPanneau(o: IdelOrdonnance, reinitialiser = true) {
    setPanneau(o);
    setPatientId(o.patient?.id ?? "");
    setSaisieErr(null);
    setSaisie(o.statut === "reception" ? {
      medecin_prescripteur: o.medecin_prescripteur ?? "", rpps_prescripteur: o.rpps_prescripteur ?? "",
      date_prescription: o.date_prescription ?? "", acte_prescrit_texte: o.acte_prescrit_texte ?? "",
      duree_traitement: o.duree_traitement ?? "",
    } : null);
    if (reinitialiser) {
      setSeance(seanceInitiale(o.patient));
      setSimulation(null); setSimErr(null); setPropAlertes([]);
      setCotErr(null); setCodeLibre("");
      setCreerMode(false); setPatErr(null);
      setPatForm({ ...VIDE_PATIENT, medecin_traitant: o.medecin_prescripteur ?? "" });
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUpload(true); setError(null);
    try {
      const fd = new FormData(); fd.append("file", f);
      await idelUploaderOrdonnance(fd);
      setInfo("Ordonnance déposée. La lecture automatique remplit les champs dans quelques secondes ; vous pouvez aussi les saisir vous-même.");
      charger();
    }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur d'envoi"); }
    finally { setUpload(false); e.target.value = ""; }
  }

  async function handleVoirScan(id: string) {
    try {
      const blob = await idelFichierOrdonnance(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) { setError(e instanceof ApiError ? e.message : "Fichier indisponible"); }
  }

  async function handleEnregistrerSaisie(passer: boolean) {
    if (!panneau || !saisie) return;
    setActionId(panneau.id); setSaisieErr(null);
    try {
      await idelSaisirOrdonnance(panneau.id, {
        medecin_prescripteur: saisie.medecin_prescripteur.trim() || null,
        rpps_prescripteur: saisie.rpps_prescripteur.trim() || null,
        date_prescription: saisie.date_prescription || null,
        acte_prescrit_texte: saisie.acte_prescrit_texte.trim() || null,
        duree_traitement: saisie.duree_traitement.trim() || null,
        ...(patientId && patientId !== panneau.patient?.id ? { patient_id: patientId } : {}),
      });
      if (passer) await idelPasserEnCours(panneau.id);
      await rafraichirPanneau(panneau.id);
    } catch (e) { setSaisieErr(e instanceof ApiError ? e.message : "Enregistrement impossible"); }
    finally { setActionId(null); }
  }

  async function handleProposerCotation(id: string) {
    setCotLoading(true); setCotErr(null);
    try {
      const p = await idelProposerCotation(id);
      const lignes: ActeSaisi[] = safeArr<{ code_acte: string; libelle: string }>(p.propositions)
        .map((a) => ({ code_acte: a.code_acte, libelle: a.libelle }));
      setSeance((s) => ({ ...s, lignes, mci: p.mci_suggeree || s.mci }));
      setPropAlertes(safeArr<string>(p.alertes));
      if (lignes.length === 0) setCotErr("Aucun acte reconnu dans le texte : ajoutez les actes à la main ci-dessous.");
    }
    catch (e) { setCotErr(e instanceof ApiError ? e.message : "Erreur"); }
    finally { setCotLoading(false); }
  }

  function ajouterActe(a: ActeSaisi) {
    setSeance((s) => s.lignes.length >= 10 ? s : ({ ...s, lignes: [...s.lignes, a] }));
  }
  function retirerActe(i: number) {
    setSeance((s) => ({ ...s, lignes: s.lignes.filter((_, j) => j !== i) }));
  }
  function ajouterCodeLibre() {
    const code = codeLibre.trim().toUpperCase().replace(/\s+/g, "");
    if (!code) return;
    ajouterActe({ code_acte: code });
    setCodeLibre("");
  }

  async function handleValiderCotation(id: string) {
    const pid = patientId || panneau?.patient?.id;
    if (!pid) { setCotErr("Sélectionnez ou créez un patient."); return; }
    if (seance.lignes.length === 0 || !simulation) return;
    if (actionId) return; // déjà en cours d'envoi (double clic)
    setActionId(id); setCotErr(null);
    try {
      await idelValiderCotation(id, seance, pid);
      await rafraichirPanneau(id);
    } catch (e) { setCotErr(e instanceof ApiError ? e.message : "Erreur de validation"); }
    finally { setActionId(null); }
  }

  async function handleMarquerTransmis(id: string) {
    const lpsLabel = moi?.lps_utilise ? LPS_LABELS[moi.lps_utilise] ?? "votre LPS" : "votre LPS";
    if (!confirm(
      `Mutatech ne transmet rien à la CPAM elle-même : confirmez uniquement que VOUS avez déjà transmis cette FSE depuis ${lpsLabel}.`
    )) return;
    setActionId(id);
    try { await idelMarquerTransmis(id); await rafraichirPanneau(id); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur"); }
    finally { setActionId(null); }
  }

  async function handleRetourNoemie(id: string, statut: "payee" | "rejetee") {
    let motif: string | undefined;
    if (statut === "rejetee") {
      const m = prompt("Motif du rejet indiqué par le retour NOEMIE :");
      if (m === null) return;
      if (!m.trim()) { setError("Le motif du rejet est obligatoire."); return; }
      motif = m.trim();
    }
    setActionId(id);
    try { await idelRetourNoemie(id, statut, motif); await rafraichirPanneau(id); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur"); }
    finally { setActionId(null); }
  }

  async function handleAnnulerCotation(id: string) {
    if (!confirm("Annuler cette cotation et repartir de zéro ?")) return;
    setActionId(id);
    try {
      const miseAJour = await idelAnnulerCotation(id);
      ouvrirPanneau(miseAJour);
      charger();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Erreur lors de l'annulation"); }
    finally { setActionId(null); }
  }

  async function handleExporterCsv(id: string) {
    setExportLoading(true);
    try {
      const blob = await idelExporterCsv(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_idel_${id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'export CSV");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleFicheReprise(id: string) {
    setFicheLoading(true);
    try { setFicheReprise(await idelFicheReprise(id)); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur lors du chargement de la fiche"); }
    finally { setFicheLoading(false); }
  }

  async function handleCreerPatient(e: React.FormEvent) {
    e.preventDefault();
    setPatSaving(true); setPatErr(null);
    const payload: Partial<IdelPatient> = {
      nom: patForm.nom.trim(), prenom: patForm.prenom.trim(),
      date_naissance: patForm.date_naissance || null,
      numero_secu: patForm.numero_secu.replace(/\s+/g, "") || null,
      telephone: patForm.telephone.trim() || null,
      adresse: patForm.adresse.trim() || null,
      medecin_traitant: patForm.medecin_traitant.trim() || null,
      notes: patForm.notes.trim() || null,
      zone_deplacement: patForm.zone_deplacement,
      distance_km: patForm.distance_km ? parseFloat(patForm.distance_km) : null,
    };
    try {
      const newPat = await idelCreerPatient(payload);
      setPatients((prev) => [...prev, newPat]);
      setPatientId(newPat.id);
      setSeance((s) => ({ ...s, distance_km: newPat.distance_km ?? 0, zone: zoneIk(newPat.zone_deplacement) }));
      setCreerMode(false);
    } catch (e) { setPatErr(e instanceof ApiError ? e.message : "Erreur de création"); }
    finally { setPatSaving(false); }
  }

  function choisirPatient(id: string) {
    setPatientId(id);
    const p = patients.find((x) => x.id === id);
    if (p) setSeance((s) => ({ ...s, distance_km: p.distance_km ?? 0, zone: zoneIk(p.zone_deplacement) }));
  }

  function changerPerimetre(p: PerimetrePipeline) { setPerimetre(p); charger(p); }

  function ajouterTournee() {
    if (!tourneePatient || tournee.find((t) => t.patientId === tourneePatient)) return;
    setTournee((p) => [...p, { patientId: tourneePatient, heure: tourneeHeure, ordre: p.length + 1, note: tourneeNote }]);
    setTourneePatient(""); setTourneeNote("");
  }
  function retirerTournee(id: string) { setTournee((p) => p.filter((t) => t.patientId !== id)); }
  function monterOrdre(idx: number) {
    if (idx === 0) return;
    setTournee((p) => { const n = [...p]; [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]]; return n.map((x, i) => ({ ...x, ordre: i + 1 })); });
  }
  function descendreOrdre(idx: number) {
    setTournee((p) => { if (idx >= p.length - 1) return p; const n = [...p]; [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]]; return n.map((x, i) => ({ ...x, ordre: i + 1 })); });
  }

  const patientResolu = patients.find((p) => p.id === patientId) ?? panneau?.patient ?? null;
  const cotExist = safeArr<CotationOut>(panneau?.cotations);
  const colonnes: Array<"reception" | "en_cours" | "traite"> = ["reception", "en_cours", "traite"];
  const facture = panneau?.facture ?? null;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Onglets */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {([["pipeline", "Pipeline"], ["tournee", "Tournée du jour"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setVue(v)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${vue === v ? "border-violet bg-violet/10 text-violet" : "border-line text-textMuted hover:text-textPrimary"}`}>
                {l}
              </button>
            ))}
          </div>
          {vue === "pipeline" && (
            <div className="flex flex-wrap items-center gap-2">
              {coordination && (
                <select value={perimetre} onChange={(e) => changerPerimetre(e.target.value as PerimetrePipeline)}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-xs text-textPrimary">
                  <option value="cabinet">Tout le cabinet</option>
                  <option value="moi">Mes ordonnances</option>
                </select>
              )}
              <label className={`cursor-pointer rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 ${upload ? "opacity-50 pointer-events-none" : ""}`}>
                {upload ? "Envoi…" : "+ Déposer ordonnance"}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleUpload} disabled={upload} />
              </label>
            </div>
          )}
        </div>

        {error && (
          <p className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            <span>{error}</span><button onClick={() => setError(null)} className="shrink-0">✕</button>
          </p>
        )}
        {info && (
          <p className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">
            <span>{info}</span><button onClick={() => setInfo(null)} className="shrink-0">✕</button>
          </p>
        )}

        {/* ===== PIPELINE ===== */}
        {vue === "pipeline" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {colonnes.map((statut) => {
              const items = safeArr<IdelOrdonnance>(ordonnances).filter((o) => o.statut === statut);
              return (
                <div key={statut} className="rounded-xl border border-line bg-surface p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-display text-sm font-bold text-textPrimary">{STATUT_LABEL[statut]}</h2>
                    <span className="rounded-full bg-surfaceAlt px-2 py-0.5 text-xs text-textMuted">{items.length}</span>
                  </div>
                  {loading ? <p className="text-xs text-textMuted">Chargement…</p>
                    : items.length === 0 ? <p className="text-xs text-textMuted">Aucune ordonnance.</p>
                    : (
                      <div className="space-y-2">
                        {items.map((o) => (
                          <button key={o.id} onClick={() => ouvrirPanneau(o)}
                            className={`w-full rounded-lg border p-3 text-left transition hover:border-violet/40 ${STATUT_COL[o.statut]}`}>
                            <p className="text-xs font-medium text-textPrimary">
                              {o.patient ? `${o.patient.nom} ${o.patient.prenom}` : "⚠ Patient non associé"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-textMuted truncate">
                              {o.medecin_prescripteur ?? (o.statut === "reception" ? "À compléter" : "Médecin non renseigné")}
                              {o.date_prescription ? ` · ${dateFr(o.date_prescription)}` : ""}
                            </p>
                            {perimetre === "cabinet" && o.soignante && (
                              <p className="mt-0.5 text-[10px] text-textMuted">👩‍⚕️ {o.soignante}</p>
                            )}
                            {o.statut === "en_cours" && safeArr(o.cotations).length === 0 && (
                              <span className="mt-1 inline-block rounded bg-amber/20 px-1.5 py-0.5 text-[10px] text-amber">À coter</span>
                            )}
                            {o.facture && (
                              <span className={`mt-1 mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] ${FSE_COL[o.facture.statut_fse]}`}>
                                {o.facture.numero ? `${o.facture.numero} · ` : ""}{FSE_LABEL[o.facture.statut_fse]}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== TOURNÉE DU JOUR (aide-mémoire local) ===== */}
        {vue === "tournee" && (
          <div className="space-y-4">
            <p className="rounded-lg border border-line bg-surfaceAlt px-4 py-3 text-xs text-textMuted">
              Aide-mémoire du jour, gardé sur cet écran uniquement. Pour une tournée enregistrée, partagée avec le cabinet et envoyée à la cotation, utilisez l&apos;onglet Tournées.
            </p>
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="font-display text-base font-bold text-textPrimary mb-3">Ajouter une visite</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <select value={tourneePatient} onChange={(e) => setTourneePatient(e.target.value)}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                  <option value="">— Patient —</option>
                  {patients.filter((p) => !tournee.find((t) => t.patientId === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
                  ))}
                </select>
                <input type="time" value={tourneeHeure} onChange={(e) => setTourneeHeure(e.target.value)}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
                <input value={tourneeNote} onChange={(e) => setTourneeNote(e.target.value)} placeholder="Note"
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
              </div>
              <button onClick={ajouterTournee} disabled={!tourneePatient}
                className="mt-3 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-40">
                + Ajouter
              </button>
            </div>
            {tournee.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-8 text-center">
                <p className="text-sm text-textMuted">Aucune visite planifiée.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tournee.map((item, idx) => {
                  const pt = patients.find((p) => p.id === item.patientId);
                  return (
                    <div key={item.patientId} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => monterOrdre(idx)} disabled={idx === 0} className="text-textMuted hover:text-textPrimary disabled:opacity-20 text-xs">▲</button>
                        <button onClick={() => descendreOrdre(idx)} disabled={idx === tournee.length - 1} className="text-textMuted hover:text-textPrimary disabled:opacity-20 text-xs">▼</button>
                      </div>
                      <span className="text-lg font-bold text-violet/30 w-6 shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-textPrimary">{pt ? `${pt.nom} ${pt.prenom}` : "—"}</p>
                        {pt?.adresse && <p className="text-[11px] text-textMuted truncate">{pt.adresse}</p>}
                        {item.note && <p className="text-[11px] italic text-textMuted">{item.note}</p>}
                      </div>
                      <p className="text-sm font-medium text-textPrimary shrink-0">{item.heure}</p>
                      <button onClick={() => retirerTournee(item.patientId)} className="text-textMuted hover:text-amber text-sm shrink-0">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== PANNEAU DÉTAIL ===== */}
        {panneau && (
          <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) setPanneau(null); }}>
            <div className="w-full max-w-lg rounded-t-2xl bg-surface p-5 sm:rounded-2xl sm:m-4 max-h-[90vh] overflow-y-auto space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-textPrimary">Ordonnance · {STATUT_LABEL[panneau.statut]}</h3>
                <div className="flex items-center gap-2">
                  {panneau.a_fichier && (
                    <button onClick={() => handleVoirScan(panneau.id)}
                      className="rounded-lg border border-line px-2 py-1 text-xs text-textMuted hover:text-textPrimary">Voir le scan</button>
                  )}
                  <button onClick={() => setPanneau(null)} className="text-textMuted hover:text-textPrimary text-xl">✕</button>
                </div>
              </div>
              {panneau.soignante && <p className="text-[11px] text-textMuted">Soignante : {panneau.soignante}</p>}

              {/* Patient */}
              <div className="rounded-lg bg-surfaceAlt p-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-textMuted font-medium">Patient</p>
                {patientResolu && !creerMode && (panneau.statut !== "reception" || cotExist.length > 0) ? (
                  <div>
                    <p className="font-medium text-sm text-textPrimary">{patientResolu.nom} {patientResolu.prenom}</p>
                    {patientResolu.adresse && <p className="text-xs text-textMuted">{patientResolu.adresse}</p>}
                    {patientResolu.zone_deplacement && <p className="text-[11px] text-teal">{patientResolu.zone_deplacement} · {patientResolu.distance_km ?? 0} km</p>}
                  </div>
                ) : !creerMode ? (
                  <div className="space-y-2">
                    {patients.length > 0 && (
                      <select value={patientId} onChange={(e) => choisirPatient(e.target.value)} className={champ}>
                        <option value="">— Patient existant —</option>
                        {patients.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}{p.date_naissance ? ` (${dateFr(p.date_naissance)})` : ""}</option>)}
                      </select>
                    )}
                    <button onClick={() => setCreerMode(true)}
                      className="w-full rounded-lg border border-violet/40 bg-violet/10 px-3 py-2 text-sm font-medium text-violet hover:bg-violet/20 text-left">
                      ✚ Créer un patient
                    </button>
                  </div>
                ) : null}

                {creerMode && (
                  <form onSubmit={handleCreerPatient} className="mt-2 space-y-2">
                    {patErr && <p className="text-xs text-amber">{patErr}</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input required value={patForm.nom} onChange={(e) => setPatForm((p) => ({ ...p, nom: e.target.value }))} placeholder="Nom *" className={champ} />
                      <input required value={patForm.prenom} onChange={(e) => setPatForm((p) => ({ ...p, prenom: e.target.value }))} placeholder="Prénom *" className={champ} />
                      <label className="text-[11px] text-textMuted">Date de naissance
                        <input type="date" value={patForm.date_naissance} onChange={(e) => setPatForm((p) => ({ ...p, date_naissance: e.target.value }))} className={champ} />
                      </label>
                      <label className="text-[11px] text-textMuted">N° de sécurité sociale (15 chiffres)
                        <input value={patForm.numero_secu} onChange={(e) => setPatForm((p) => ({ ...p, numero_secu: e.target.value }))} inputMode="numeric" className={champ} />
                      </label>
                      <input value={patForm.telephone} onChange={(e) => setPatForm((p) => ({ ...p, telephone: e.target.value }))} placeholder="Téléphone" className={champ} />
                      <input value={patForm.medecin_traitant} onChange={(e) => setPatForm((p) => ({ ...p, medecin_traitant: e.target.value }))} placeholder="Médecin traitant" className={champ} />
                      <input value={patForm.adresse} onChange={(e) => setPatForm((p) => ({ ...p, adresse: e.target.value }))} placeholder="Adresse" className={`sm:col-span-2 ${champ}`} />
                      <select value={patForm.zone_deplacement} onChange={(e) => setPatForm((p) => ({ ...p, zone_deplacement: e.target.value as ZoneDeplacement }))} className={champ}>
                        {ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                      </select>
                      <input type="number" min="0" max="300" step="0.1" value={patForm.distance_km}
                        onChange={(e) => setPatForm((p) => ({ ...p, distance_km: e.target.value }))} placeholder="Distance aller (km)" className={champ} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={patSaving} className="flex-1 rounded-lg bg-violet px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
                        {patSaving ? "Création…" : "✓ Créer"}
                      </button>
                      <button type="button" onClick={() => setCreerMode(false)} className="text-sm text-textMuted hover:text-textPrimary px-2">Annuler</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Réception : saisie manuelle (C9) */}
              {panneau.statut === "reception" && saisie && (
                <div className="rounded-lg border border-line p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted font-medium">Ordonnance {panneau.confiance_ocr != null ? "(lue automatiquement, à vérifier)" : "(à compléter)"}</p>
                  {saisieErr && <p className="text-xs text-amber">{saisieErr}</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input value={saisie.medecin_prescripteur} onChange={(e) => setSaisie({ ...saisie, medecin_prescripteur: e.target.value })} placeholder="Médecin prescripteur" className={champ} />
                    <input value={saisie.rpps_prescripteur} onChange={(e) => setSaisie({ ...saisie, rpps_prescripteur: e.target.value })} placeholder="RPPS (11 chiffres)" inputMode="numeric" className={champ} />
                    <label className="text-[11px] text-textMuted">Date de prescription
                      <input type="date" value={saisie.date_prescription} onChange={(e) => setSaisie({ ...saisie, date_prescription: e.target.value })} className={champ} />
                    </label>
                    <label className="text-[11px] text-textMuted">Durée du traitement
                      <input value={saisie.duree_traitement} onChange={(e) => setSaisie({ ...saisie, duree_traitement: e.target.value })} placeholder="ex. 15 jours" className={champ} />
                    </label>
                    <textarea value={saisie.acte_prescrit_texte} onChange={(e) => setSaisie({ ...saisie, acte_prescrit_texte: e.target.value })}
                      placeholder="Soins prescrits (ex. pansement d'ulcère tous les jours pendant 15 jours)" rows={3} className={`sm:col-span-2 ${champ}`} />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button onClick={() => handleEnregistrerSaisie(false)} disabled={actionId === panneau.id}
                      className="flex-1 rounded-lg border border-line px-3 py-2 text-xs text-textPrimary disabled:opacity-50">Enregistrer</button>
                    <button onClick={() => handleEnregistrerSaisie(true)} disabled={actionId === panneau.id || !saisie.acte_prescrit_texte.trim()}
                      className="flex-1 rounded-lg bg-violet px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
                      {actionId === panneau.id ? "…" : "Enregistrer et passer à la cotation →"}
                    </button>
                  </div>
                </div>
              )}

              {panneau.statut !== "reception" && panneau.medecin_prescripteur && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] text-textMuted mb-1 uppercase">Prescripteur</p>
                  <p className="text-sm text-textPrimary">{panneau.medecin_prescripteur}{panneau.rpps_prescripteur ? ` · RPPS ${panneau.rpps_prescripteur}` : ""}</p>
                  {panneau.date_prescription && <p className="text-xs text-textMuted">Le {dateFr(panneau.date_prescription)}</p>}
                </div>
              )}
              {panneau.statut !== "reception" && panneau.acte_prescrit_texte && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] text-textMuted mb-1 uppercase">Soins prescrits</p>
                  <p className="text-xs text-textPrimary leading-relaxed">{panneau.acte_prescrit_texte}</p>
                </div>
              )}

              {cotExist.length > 0 && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] text-textMuted mb-2 uppercase">Cotation validée{cotExist[0]?.date_soin ? ` · soin du ${dateFr(cotExist[0].date_soin)}` : ""}</p>
                  {cotExist.map((c, i) => (
                    <div key={c.id ?? i} className="flex justify-between text-xs gap-2 py-0.5">
                      <span className="font-bold text-textPrimary">{c.code_acte}</span>
                      <span className="text-textMuted flex-1 truncate">{c.libelle}</span>
                      <span className="text-teal font-medium">{euros(c.montant_total)}</span>
                    </div>
                  ))}
                  {facture && (
                    <div className="mt-2 flex justify-between border-t border-line pt-2 text-sm font-bold">
                      <span className="text-textPrimary">Total{facture.numero ? ` · ${facture.numero}` : ""}</span>
                      <span className="text-teal">{euros(facture.montant_total)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* En cours : éditeur de cotation, calcul par le serveur */}
              {panneau.statut === "en_cours" && cotExist.length === 0 && (
                <div className="rounded-xl border border-violet/20 bg-violet/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted font-medium">Cotation NGAP</p>
                    <button onClick={() => handleProposerCotation(panneau.id)} disabled={cotLoading}
                      className="rounded-lg border border-violet/40 px-2 py-1 text-[11px] text-violet disabled:opacity-50">
                      {cotLoading ? "Analyse…" : "Proposer d'après l'ordonnance"}
                    </button>
                  </div>
                  {cotErr && <p className="text-xs text-amber">{cotErr}</p>}
                  {propAlertes.map((a, i) => <p key={i} className="text-[11px] text-amber">⚠ {a}</p>)}

                  {/* Actes */}
                  <div className="space-y-1">
                    {seance.lignes.length === 0 && <p className="text-xs text-textMuted">Aucun acte. Ajoutez-en depuis la liste ou saisissez un code.</p>}
                    {seance.lignes.map((l, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-16 shrink-0 font-bold text-textPrimary">{l.code_acte}</span>
                        <span className="flex-1 truncate text-textMuted">{l.libelle ?? ""}</span>
                        <button onClick={() => retirerActe(i)} className="text-textMuted hover:text-amber">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select value="" onChange={(e) => {
                      const a = referentiel.find((x) => x.id === e.target.value);
                      if (a) ajouterActe({ code_acte: a.code_acte, libelle: a.libelle });
                    }} className={champ}>
                      <option value="">+ Ajouter un acte courant</option>
                      {referentiel.map((a) => <option key={a.id} value={a.id}>{a.code_acte} · {a.libelle}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input value={codeLibre} onChange={(e) => setCodeLibre(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterCodeLibre(); } }}
                        placeholder="Code (ex. AMI 4.5)" className={champ} />
                      <button onClick={ajouterCodeLibre} className="shrink-0 rounded-lg border border-line px-3 text-xs text-textPrimary">OK</button>
                    </div>
                  </div>

                  {/* Séance */}
                  <div className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                    <label className="text-[11px] text-textMuted">Date du soin
                      <input type="date" value={seance.date_soin ?? ""} onChange={(e) => {
                        const v = e.target.value;
                        setSeance((s) => ({ ...s, date_soin: v || null, dimanche_ferie: v ? estDimanche(v) || s.dimanche_ferie : s.dimanche_ferie }));
                      }} className={champ} />
                    </label>
                    <label className="text-[11px] text-textMuted">Nombre de séances identiques
                      <input type="number" min={1} max={366} value={seance.nb_seances}
                        onChange={(e) => setSeance((s) => ({ ...s, nb_seances: Math.max(1, Math.min(366, parseInt(e.target.value || "1", 10))) }))} className={champ} />
                    </label>
                    <label className="text-[11px] text-textMuted">Horaire
                      <select value={seance.nuit ?? ""} onChange={(e) => setSeance((s) => ({ ...s, nuit: (e.target.value || null) as NuitPlage | null }))} className={champ}>
                        {NUITS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                      </select>
                    </label>
                    <div className="flex flex-col justify-end gap-1 text-xs text-textPrimary">
                      <label className="flex items-center gap-2"><input type="checkbox" className="accent-violet" checked={seance.dimanche_ferie}
                        onChange={(e) => setSeance((s) => ({ ...s, dimanche_ferie: e.target.checked }))} />Dimanche ou jour férié</label>
                      <label className="flex items-center gap-2"><input type="checkbox" className="accent-violet" checked={seance.mci}
                        onChange={(e) => setSeance((s) => ({ ...s, mci: e.target.checked }))} />Coordination (MCI)</label>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-textPrimary sm:col-span-2">
                      <input type="checkbox" className="accent-violet" checked={seance.domicile}
                        onChange={(e) => setSeance((s) => ({ ...s, domicile: e.target.checked }))} />Soin au domicile (IFD et indemnités kilométriques)
                    </label>
                    {seance.domicile && (
                      <>
                        <label className="text-[11px] text-textMuted">Distance aller (km)
                          <input type="number" min={0} max={300} step={0.1} value={seance.distance_km}
                            onChange={(e) => setSeance((s) => ({ ...s, distance_km: Math.max(0, parseFloat(e.target.value || "0")) }))} className={champ} />
                        </label>
                        <label className="text-[11px] text-textMuted">Zone
                          <select value={seance.zone} onChange={(e) => setSeance((s) => ({ ...s, zone: e.target.value as ZoneIk }))} className={champ}>
                            <option value="plaine">Plaine</option>
                            <option value="montagne">Montagne</option>
                            <option value="pied_ski">À pied ou à ski</option>
                          </select>
                        </label>
                      </>
                    )}
                  </div>

                  {/* Résultat du moteur serveur */}
                  {simErr && <p className="text-xs text-amber">{simErr}</p>}
                  {simulation && (
                    <div className="space-y-1 border-t border-line pt-3">
                      {simulation.lignes.map((l, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs ${l.montant_unitaire === 0 ? "opacity-50" : ""}`}>
                          <span className="w-12 shrink-0 font-bold text-textPrimary">{l.code_acte}</span>
                          <span className="flex-1 truncate text-[11px] text-textMuted" title={l.detail || l.libelle}>{l.detail || l.libelle}</span>
                          <span className="w-16 shrink-0 text-right font-medium text-textPrimary">{euros(l.montant_unitaire)}</span>
                        </div>
                      ))}
                      {simulation.regles.map((r, i) => <p key={`r${i}`} className="text-[10px] text-textMuted">• {r}</p>)}
                      {simulation.alertes.map((a, i) => <p key={`a${i}`} className="text-[11px] text-amber">⚠ {a}</p>)}
                      <div className="flex justify-between border-t border-line pt-2 font-bold">
                        <span className="text-sm text-textPrimary">{simulation.nb_seances > 1 ? `Séance ${euros(simulation.montant_seance)} × ${simulation.nb_seances}` : "Total séance"}</span>
                        <span className="text-lg text-teal">{euros(simulation.montant_total)}</span>
                      </div>
                      <p className="text-[10px] italic text-textMuted">{simulation.tarifs}</p>
                    </div>
                  )}
                  <button onClick={() => handleValiderCotation(panneau.id)}
                    disabled={actionId !== null || !simulation || (!panneau.patient?.id && !patientId)}
                    className="w-full rounded-lg bg-teal px-3 py-2 text-sm font-medium text-black disabled:opacity-50">
                    {actionId === panneau.id ? "Validation…" : "✓ Valider cette cotation"}
                  </button>
                  {!panneau.patient?.id && !patientId && (
                    <p className="text-[11px] text-amber text-center">Créez ou sélectionnez un patient d&apos;abord</p>
                  )}
                </div>
              )}

              {panneau.statut === "en_cours" && cotExist.length > 0 && (
                <div className="flex flex-col gap-2">
                  <button onClick={() => handleExporterCsv(panneau.id)} disabled={exportLoading}
                    className="rounded-lg border border-teal/40 bg-teal/10 px-4 py-2 text-center text-sm font-medium text-teal hover:bg-teal/20 disabled:opacity-50">
                    {exportLoading ? "…" : "↓ Export CSV"}
                  </button>
                  <button onClick={() => handleFicheReprise(panneau.id)} disabled={ficheLoading}
                    className="rounded-lg border border-violet/40 bg-violet/10 px-4 py-2 text-center text-sm font-medium text-violet hover:bg-violet/20 disabled:opacity-50">
                    {ficheLoading ? "…" : "↓ Fiche de reprise"}
                  </button>
                  <p className="text-center text-[10px] text-textMuted italic">
                    Mutatech ne transmet rien à la CPAM : le bouton ci-dessous ne fait que noter que vous l&apos;avez fait vous-même.
                  </p>
                  <button onClick={() => handleMarquerTransmis(panneau.id)} disabled={actionId !== null}
                    className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-black disabled:opacity-50">
                    {actionId === panneau.id ? "…" : "✓ J'ai transmis via mon LPS"}
                  </button>
                  <button onClick={() => handleAnnulerCotation(panneau.id)} disabled={actionId !== null}
                    className="rounded-lg border border-amber/40 bg-amber/5 px-4 py-2 text-center text-xs font-medium text-amber hover:bg-amber/10 disabled:opacity-50">
                    ↺ Annuler cette cotation et refaire
                  </button>
                </div>
              )}

              {/* Traité : retour NOEMIE (C12) */}
              {panneau.statut === "traite" && facture && (
                <div className="rounded-lg border border-line p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] uppercase tracking-wide text-textMuted font-medium">Facture {facture.numero ?? ""}</p>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${FSE_COL[facture.statut_fse]}`}>{FSE_LABEL[facture.statut_fse]}</span>
                  </div>
                  {facture.date_transmission_lps && <p className="text-xs text-textMuted">Transmise le {dateFr(facture.date_transmission_lps)}{moi?.lps_utilise ? ` via ${LPS_LABELS[moi.lps_utilise] ?? moi.lps_utilise}` : ""}</p>}
                  {facture.date_paiement && facture.statut_fse === "payee" && <p className="text-xs text-teal">Payée le {dateFr(facture.date_paiement)}</p>}
                  {facture.statut_fse === "rejetee" && facture.retour_noemie && <p className="text-xs text-red-400">Motif : {facture.retour_noemie}</p>}
                  {(facture.statut_fse === "transmise" || facture.statut_fse === "rejetee") && (
                    <div className="flex gap-2">
                      <button onClick={() => handleRetourNoemie(panneau.id, "payee")} disabled={actionId !== null}
                        className="flex-1 rounded-lg bg-teal px-3 py-2 text-xs font-medium text-black disabled:opacity-50">✓ Payée</button>
                      {facture.statut_fse === "transmise" && (
                        <button onClick={() => handleRetourNoemie(panneau.id, "rejetee")} disabled={actionId !== null}
                          className="flex-1 rounded-lg border border-red-400/50 px-3 py-2 text-xs font-medium text-red-400 disabled:opacity-50">✕ Rejetée…</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-textMuted">⚠ Cotation indicative calculée selon la NGAP (tarifs et règles à faire valider par une IDEL). Ne se substitue pas à votre LPS agréé SESAM-Vitale.</p>

        {/* ===== MODAL FICHE DE REPRISE ===== */}
        {ficheReprise && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white print:p-0"
            onClick={(e) => { if (e.target === e.currentTarget) setFicheReprise(null); }}>
            <div className="w-full max-w-lg rounded-2xl bg-surface p-6 max-h-[90vh] overflow-y-auto space-y-4 print:max-h-none print:rounded-none print:shadow-none">
              <div className="flex items-center justify-between print:hidden">
                <h3 className="font-display text-lg font-bold text-textPrimary">Fiche de reprise</h3>
                <button onClick={() => setFicheReprise(null)} className="text-textMuted hover:text-textPrimary text-xl">✕</button>
              </div>

              <div className="text-xs text-textMuted">
                {ficheReprise.idel}{ficheReprise.rpps_idel ? ` · RPPS ${ficheReprise.rpps_idel}` : ""} · LPS cible : {ficheReprise.lps_cible}
              </div>

              <div className="rounded-lg bg-surfaceAlt p-3">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-textMuted font-medium">Patient</p>
                <p className="text-sm text-textPrimary">{ficheReprise.patient.nom} {ficheReprise.patient.prenom}</p>
                {ficheReprise.patient.date_naissance && <p className="text-xs text-textMuted">Né(e) le {dateFr(ficheReprise.patient.date_naissance)}</p>}
                {ficheReprise.patient.numero_secu && <p className="text-xs text-textMuted">N° sécu : {ficheReprise.patient.numero_secu}</p>}
              </div>

              {ficheReprise.prescription.medecin && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-textMuted font-medium">Prescripteur</p>
                  <p className="text-sm text-textPrimary">{ficheReprise.prescription.medecin}{ficheReprise.prescription.rpps ? ` · RPPS ${ficheReprise.prescription.rpps}` : ""}</p>
                  {ficheReprise.prescription.date && <p className="text-xs text-textMuted">Le {dateFr(ficheReprise.prescription.date)}</p>}
                </div>
              )}

              <div className="rounded-lg bg-surfaceAlt p-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-textMuted font-medium">Actes à saisir</p>
                <div className="space-y-2">
                  {ficheReprise.actes_a_saisir.map((a, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 border-b border-line pb-2 text-xs last:border-0 last:pb-0">
                      <div>
                        <p className="font-bold text-textPrimary">{a.code} <span className="font-normal text-textMuted">{a.libelle}</span></p>
                        <p className="text-[11px] text-textMuted">
                          {a.date_soin ? `Soin du ${dateFr(a.date_soin)} · ` : ""}Qté {a.quantite ?? 1}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-teal">{euros(a.montant)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between border-t border-line pt-2 font-bold">
                  <span className="text-sm text-textPrimary">Total estimé</span>
                  <span className="text-teal text-lg">{euros(ficheReprise.montant_total_estime)}</span>
                </div>
              </div>

              <p className="text-xs italic text-textMuted">{ficheReprise.instructions}</p>

              <div className="flex gap-2 print:hidden">
                <button onClick={() => window.print()} className="flex-1 rounded-lg bg-violet px-3 py-2 text-sm font-medium text-white hover:bg-violet/90">🖨 Imprimer</button>
                <button onClick={() => setFicheReprise(null)} className="flex-1 rounded-lg border border-line px-3 py-2 text-sm text-textMuted hover:text-textPrimary">Fermer</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
