"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import {
  idelGetOrdonnances, idelUploaderOrdonnance,
  idelProposerCotation, idelValiderCotation,
  idelMarquerTransmis, idelExporterCsv, idelFicheReprise,
  idelGetPatients, idelCreerPatient, chatAgent, ApiError,
} from "@/lib/api";
import {
  IdelOrdonnance, CotationOut, IdelPatient,
  ZoneDeplacement, LigneCotationCalculee, DetailCotationNGAP,
} from "@/lib/types";

// ===== TYPES LOCAUX =====
interface PatientForm {
  nom: string; prenom: string; date_naissance: string; numero_secu: string;
  telephone: string; adresse: string; medecin_traitant: string; notes: string;
  zone_deplacement: ZoneDeplacement; distance_km: string;
}

interface TourneeItem {
  patientId: string; heure: string; ordre: number; note: string;
}

interface ChatMsg { role: "user" | "assistant"; content: string; }

// ===== CONSTANTES NGAP =====
const IFD = 2.50;
const IK_ZONES: Record<ZoneDeplacement, number> = {
  plaine: 0.91, montagne: 1.05, tres_montagneux: 1.10,
};
const MAJORATIONS = [
  { code: "MS", label: "Soirée (20h–0h)", montant: 3.15 },
  { code: "MN", label: "Nuit (0h–7h)", montant: 4.72 },
  { code: "MJF", label: "Dimanche / Jour férié", montant: 11.65 },
];
const ZONES: { value: ZoneDeplacement; label: string }[] = [
  { value: "plaine", label: "Plaine (0.91€/km)" },
  { value: "montagne", label: "Montagne (1.05€/km)" },
  { value: "tres_montagneux", label: "Très montagneux (1.10€/km)" },
];

// ===== MOTEUR NGAP ART.11B =====
function calculerNGAP(
  cotations: CotationOut[],
  patient: IdelPatient | null | undefined,
  majActives: string[]
): DetailCotationNGAP {
  const tries = [...cotations].sort((a, b) => (b.montant_total ?? 0) - (a.montant_total ?? 0));
  const lignes: LigneCotationCalculee[] = tries.map((c, i) => {
    const brut = c.montant_total ?? 0;
    const pct: 100 | 50 | 0 = i === 0 ? 100 : i === 1 ? 50 : 0;
    const net = pct === 100 ? brut : pct === 50 ? brut * 0.5 : 0;
    return { code_acte: c.code_acte, libelle: c.libelle ?? c.code_acte, coefficient: c.coefficient ?? 0, montant_brut: brut, pourcentage: pct, montant_net: net, gratuit: pct === 0 };
  });
  const zone = patient?.zone_deplacement ?? "plaine";
  const dist = patient?.distance_km ?? 0;
  const ik = dist > 0 ? dist * IK_ZONES[zone] * 2 : 0;
  const macts = MAJORATIONS.filter((m) => majActives.includes(m.code));
  const total = lignes.reduce((s, l) => s + l.montant_net, 0) + IFD + ik + macts.reduce((s, m) => s + m.montant, 0);
  return { lignes, ifd: IFD, ik, majorations: macts, total };
}

function safeArr<T>(v: unknown): T[] { return Array.isArray(v) ? (v as T[]) : []; }

const VIDE_PATIENT: PatientForm = {
  nom: "", prenom: "", date_naissance: "", numero_secu: "",
  telephone: "", adresse: "", medecin_traitant: "", notes: "",
  zone_deplacement: "plaine", distance_km: "",
};

// Extrait nom/prénom du texte OCR de l'ordonnance
function extraireNomPrenom(texte?: string | null): { nom: string; prenom: string } {
  if (!texte) return { nom: "", prenom: "" };
  const match = texte.match(/(?:patient|pour|madame|monsieur|mme|m\.)\s+([A-ZÉÀÂ][a-zéàâ]+)\s+([A-ZÉÀÂ][a-zéàâ]+)/i);
  if (match) return { nom: match[1] ?? "", prenom: match[2] ?? "" };
  return { nom: "", prenom: "" };
}

// Contexte NGAP pour l'assistant IA
const NGAP_CONTEXT = `Tu es un assistant spécialisé en cotation NGAP pour infirmiers libéraux (IDEL) en France. Tu connais parfaitement :
- L'article 11B : acte 1 = 100%, acte 2 = 50%, actes suivants = gratuit
- Les codes AMI (Actes Médicaux Infirmiers) et AIS (Actes Infirmiers de Soins)
- Les majorations : MS (soirée +3.15€), MN (nuit +4.72€), MJF (dimanche/férié +11.65€)
- L'IFD (2.50€) et les IK (plaine 0.91€/km, montagne 1.05€/km, très montagneux 1.10€/km)
- Les règles de cumul et les cas particuliers
Réponds de façon claire, concise et pratique pour aider l'infirmière dans sa cotation quotidienne.`;

const STATUT_LABEL: Record<string, string> = { reception: "Réception", en_cours: "En cours", traite: "Traité" };
const STATUT_COL: Record<string, string> = {
  reception: "border-line text-textMuted",
  en_cours: "border-amber/40 bg-amber/10 text-amber",
  traite: "border-teal/40 bg-teal/10 text-teal",
};

export default function IdelPage() {
  const [vue, setVue] = useState<"pipeline" | "tournee">("pipeline");
  const [ordonnances, setOrdonnances] = useState<IdelOrdonnance[]>([]);
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upload, setUpload] = useState(false);
  const [panneau, setPanneau] = useState<IdelOrdonnance | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // Cotation
  const [cotProp, setCotProp] = useState<CotationOut[] | null>(null);
  const [cotLoading, setCotLoading] = useState(false);
  const [cotErr, setCotErr] = useState<string | null>(null);
  const [cotValidee, setCotValidee] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [majActives, setMajActives] = useState<string[]>([]);

  // Création patient inline
  const [creerMode, setCreerMode] = useState(false);
  const [patForm, setPatForm] = useState<PatientForm>({ ...VIDE_PATIENT });
  const [patSaving, setPatSaving] = useState(false);
  const [patErr, setPatErr] = useState<string | null>(null);

  // Assistant IA
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatOuvert, setChatOuvert] = useState(false);

  // Tournée
  const [tournee, setTournee] = useState<TourneeItem[]>([]);
  const [tourneePatient, setTourneePatient] = useState("");
  const [tourneeHeure, setTourneeHeure] = useState("08:00");
  const [tourneeNote, setTourneeNote] = useState("");

  function charger() {
    setLoading(true);
    Promise.all([
      idelGetOrdonnances(),
      idelGetPatients().catch(() => [] as IdelPatient[]),
    ])
      .then(([ordo, pts]) => {
        setOrdonnances(safeArr<IdelOrdonnance>(ordo));
        setPatients(safeArr<IdelPatient>(pts));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  function ouvrirPanneau(o: IdelOrdonnance) {
    setPanneau(o);
    setCotProp(null); setCotErr(null); setCotValidee(false);
    setPatientId(o.patient?.id ?? "");
    setMajActives([]);
    setCreerMode(false); setPatErr(null);
    // Pré-remplir le formulaire patient depuis les données OCR
    const { nom, prenom } = extraireNomPrenom(o.acte_prescrit_texte);
    setPatForm({ ...VIDE_PATIENT, nom, prenom, medecin_traitant: o.medecin_prescripteur ?? "" });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUpload(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      await idelUploaderOrdonnance(fd); charger();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Erreur d'upload"); }
    finally { setUpload(false); e.target.value = ""; }
  }

  async function handleProposerCotation(id: string) {
    setCotLoading(true); setCotErr(null); setCotProp(null);
    try {
      const props = await idelProposerCotation(id);
      setCotProp(safeArr<CotationOut>(props));
    } catch (e) { setCotErr(e instanceof ApiError ? e.message : "Erreur de proposition"); }
    finally { setCotLoading(false); }
  }

  async function handleValiderCotation(id: string) {
    const pid = patientId || panneau?.patient?.id;
    if (!pid) { setCotErr("Sélectionnez ou créez un patient avant de valider."); return; }
    if (!cotProp) return;
    setActionId(id); setCotErr(null);
    try {
      const items = safeArr<CotationOut>(cotProp).map((c) => ({
        code_acte: c.code_acte, quantite: c.quantite ?? 1,
        modificateurs: safeArr<string>(c.modificateurs),
      }));
      await idelValiderCotation(id, items, pid);
      setCotValidee(true);
      setTimeout(() => charger(), 500);
    } catch (e) { setCotErr(e instanceof ApiError ? e.message : "Erreur de validation"); }
    finally { setActionId(null); }
  }

  async function handleMarquerTransmis(id: string) {
    if (!confirm("Confirmer la transmission depuis votre LPS ?")) return;
    setActionId(id);
    try { await idelMarquerTransmis(id); charger(); if (panneau?.id === id) setPanneau(null); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Erreur"); }
    finally { setActionId(null); }
  }

  async function handleCreerPatient(e: React.FormEvent) {
    e.preventDefault();
    setPatSaving(true); setPatErr(null);
    const payload: Partial<IdelPatient> = {
      nom: patForm.nom.trim(), prenom: patForm.prenom.trim(),
      date_naissance: patForm.date_naissance || null,
      numero_secu: patForm.numero_secu.trim() || null,
      telephone: patForm.telephone.trim() || null,
      adresse: patForm.adresse.trim() || null,
      medecin_traitant: patForm.medecin_traitant.trim() || null,
      notes: patForm.notes.trim() || null,
      zone_deplacement: patForm.zone_deplacement,
      distance_km: patForm.distance_km ? parseFloat(patForm.distance_km) : null,
    };
    try {
      const newPat = await idelCreerPatient(payload);
      const updatedPats = [...patients, newPat];
      setPatients(updatedPats);
      setPatientId(newPat.id);
      setCreerMode(false);
    } catch (e) { setPatErr(e instanceof ApiError ? e.message : "Erreur de création"); }
    finally { setPatSaving(false); }
  }

  async function handleChat(e: React.FormEvent) {
    e.preventDefault();
    const msg = chatInput.trim(); if (!msg) return;
    const newHistory: ChatMsg[] = [...chat, { role: "user", content: msg }];
    setChat(newHistory); setChatInput(""); setChatLoading(true);
    try {
      const historique = [
        { role: "user", content: NGAP_CONTEXT },
        { role: "assistant", content: "Compris ! Je suis votre assistant NGAP. Comment puis-je vous aider ?" },
        ...newHistory.map((m) => ({ role: m.role as string, content: m.content })),
      ];
      const resp = await chatAgent(msg, historique);
      setChat((prev) => [...prev, { role: "assistant", content: resp.reply }]);
    } catch {
      setChat((prev) => [...prev, { role: "assistant", content: "Désolé, je ne peux pas répondre pour l'instant. Réessayez." }]);
    } finally { setChatLoading(false); }
  }

  function setZone(z: ZoneDeplacement) { setPatForm((p) => ({ ...p, zone_deplacement: z })); }

  // Tournée
  function ajouterTournee() {
    if (!tourneePatient) return;
    const alreadyIn = tournee.find((t) => t.patientId === tourneePatient);
    if (alreadyIn) return;
    setTournee((prev) => [
      ...prev,
      { patientId: tourneePatient, heure: tourneeHeure, ordre: prev.length + 1, note: tourneeNote },
    ]);
    setTourneePatient(""); setTourneeNote("");
  }
  function retirerTournee(id: string) { setTournee((p) => p.filter((t) => t.patientId !== id)); }
  function monterOrdre(idx: number) {
    if (idx === 0) return;
    setTournee((p) => { const n=[...p]; [n[idx-1],n[idx]]=[n[idx],n[idx-1]]; return n.map((x,i)=>({...x,ordre:i+1})); });
  }
  function descendreOrdre(idx: number) {
    setTournee((p) => { if(idx>=p.length-1)return p; const n=[...p]; [n[idx],n[idx+1]]=[n[idx+1],n[idx]]; return n.map((x,i)=>({...x,ordre:i+1})); });
  }

  // Patient résolu
  const patientResolu = panneau?.patient ?? patients.find((p) => p.id === patientId) ?? null;
  const safeCot = safeArr<CotationOut>(cotProp);
  const detail: DetailCotationNGAP | null = safeCot.length > 0 ? calculerNGAP(safeCot, patientResolu, majActives) : null;
  const cotExist = safeArr<CotationOut>(panneau?.cotations);
  const colonnes: Array<"reception" | "en_cours" | "traite"> = ["reception", "en_cours", "traite"];
  const totalIkJour = tournee.reduce((s, t) => {
    const pt = patients.find((p) => p.id === t.patientId);
    if (!pt?.distance_km) return s + IFD;
    return s + pt.distance_km * IK_ZONES[pt.zone_deplacement ?? "plaine"] * 2 + IFD;
  }, 0);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {([["pipeline", "📋 Pipeline"], ["tournee", "🗺 Tournée du jour"]] as const).map(([v, l]) => (
              <button key={v} onClick={() => setVue(v)}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${vue === v ? "border-violet bg-violet/10 text-violet" : "border-line text-textMuted hover:text-textPrimary"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setChatOuvert(!chatOuvert)}
              className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-2 text-xs font-medium text-teal hover:bg-teal/20">
              🤖 Assistant NGAP {chatOuvert ? "▲" : "▼"}
            </button>
            {vue === "pipeline" && (
              <label className={`cursor-pointer rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 ${upload ? "opacity-50 pointer-events-none" : ""}`}>
                {upload ? "Analyse…" : "+ Déposer ordonnance"}
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} disabled={upload} />
              </label>
            )}
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {/* Assistant IA NGAP */}
        {chatOuvert && (
          <div className="mb-6 rounded-xl border border-teal/30 bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-line bg-teal/5 flex items-center gap-2">
              <span className="text-sm font-medium text-textPrimary">🤖 Assistant NGAP IA</span>
              <span className="text-[11px] text-textMuted">Posez vos questions sur la cotation, les règles Art.11B, les majorations…</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-3 space-y-2">
              {chat.length === 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] text-textMuted">Questions rapides :</p>
                  {["Comment coter AMI4 + AMI1 ensemble ?", "Quand appliquer la majoration MJF ?", "Calcul IK pour 12km en montagne ?"].map((q) => (
                    <button key={q} onClick={() => setChatInput(q)}
                      className="block text-left text-xs text-teal hover:underline">{q}</button>
                  ))}
                </div>
              )}
              {chat.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === "user" ? "bg-violet text-white rounded-br-sm" : "bg-surfaceAlt text-textPrimary rounded-bl-sm"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && <p className="text-xs text-textMuted animate-pulse">Réflexion en cours…</p>}
            </div>
            <form onSubmit={handleChat} className="flex gap-2 p-3 border-t border-line">
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                placeholder="Posez votre question NGAP…"
                className="flex-1 rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-xs text-textPrimary outline-none focus:border-teal" />
              <button type="submit" disabled={chatLoading || !chatInput.trim()}
                className="rounded-lg bg-teal px-3 py-2 text-xs font-medium text-black hover:opacity-90 disabled:opacity-40">→</button>
            </form>
          </div>
        )}

        {/* ===== VUE PIPELINE ===== */}
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
                              {o.medecin_prescripteur ?? "Médecin non extrait"}
                              {o.date_prescription ? ` · ${new Date(o.date_prescription).toLocaleDateString("fr-FR")}` : ""}
                            </p>
                            {o.necessite_validation && o.statut === "en_cours" && (
                              <span className="mt-1 inline-block rounded bg-amber/20 px-1.5 py-0.5 text-[10px] text-amber">⚠ Validation requise</span>
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

        {/* ===== VUE TOURNÉE ===== */}
        {vue === "tournee" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-surface p-5">
              <h2 className="font-display text-base font-bold text-textPrimary mb-3">Ajouter une visite à la tournée</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <select value={tourneePatient} onChange={(e) => setTourneePatient(e.target.value)}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">
                  <option value="">— Choisir un patient —</option>
                  {patients.filter((p) => !tournee.find((t) => t.patientId === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>
                  ))}
                </select>
                <input type="time" value={tourneeHeure} onChange={(e) => setTourneeHeure(e.target.value)}
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
                <input value={tourneeNote} onChange={(e) => setTourneeNote(e.target.value)}
                  placeholder="Note (optionnel)"
                  className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary" />
              </div>
              <button onClick={ajouterTournee} disabled={!tourneePatient}
                className="mt-3 rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-40">
                + Ajouter à la tournée
              </button>
            </div>

            {tournee.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line p-8 text-center">
                <p className="text-sm text-textMuted">Aucune visite planifiée — ajoutez des patients ci-dessus.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-textMuted px-1">
                  <span>{tournee.length} visite{tournee.length > 1 ? "s" : ""} planifiée{tournee.length > 1 ? "s" : ""}</span>
                  <span className="text-teal font-medium">Total déplacement ≈ {totalIkJour.toFixed(2)} €</span>
                </div>
                {tournee.map((item, idx) => {
                  const pt = patients.find((p) => p.id === item.patientId);
                  const ik = pt?.distance_km ? pt.distance_km * IK_ZONES[pt.zone_deplacement ?? "plaine"] * 2 + IFD : IFD;
                  return (
                    <div key={item.patientId} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => monterOrdre(idx)} disabled={idx === 0}
                          className="text-textMuted hover:text-textPrimary disabled:opacity-20 text-xs leading-none">▲</button>
                        <button onClick={() => descendreOrdre(idx)} disabled={idx === tournee.length - 1}
                          className="text-textMuted hover:text-textPrimary disabled:opacity-20 text-xs leading-none">▼</button>
                      </div>
                      <span className="text-lg font-bold text-violet/40 w-6 shrink-0">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-textPrimary">{pt ? `${pt.nom} ${pt.prenom}` : "Patient inconnu"}</p>
                        {pt?.adresse && <p className="text-[11px] text-textMuted truncate">📍 {pt.adresse}</p>}
                        {item.note && <p className="text-[11px] italic text-textMuted">{item.note}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-textPrimary">{item.heure}</p>
                        <p className="text-[11px] text-teal">{ik.toFixed(2)} € dépl.</p>
                      </div>
                      <button onClick={() => retirerTournee(item.patientId)}
                        className="text-textMuted hover:text-amber text-sm shrink-0">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== PANNEAU DÉTAIL ORDONNANCE ===== */}
        {panneau && (
          <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 sm:items-center"
            onClick={(e) => { if (e.target === e.currentTarget) setPanneau(null); }}>
            <div className="w-full max-w-lg rounded-t-2xl bg-surface p-5 sm:rounded-2xl sm:m-4 max-h-[92vh] overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-textPrimary">Ordonnance</h3>
                <button onClick={() => setPanneau(null)} className="text-textMuted hover:text-textPrimary">✕</button>
              </div>

              {/* Patient */}
              <div className="rounded-lg bg-surfaceAlt p-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-textMuted font-medium">Patient associé</p>
                {patientResolu && !creerMode ? (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm text-textPrimary">{patientResolu.nom} {patientResolu.prenom}</p>
                      {patientResolu.adresse && <p className="text-xs text-textMuted">{patientResolu.adresse}</p>}
                      {patientResolu.zone_deplacement && (
                        <p className="text-[11px] text-teal">{patientResolu.zone_deplacement} · {patientResolu.distance_km ?? 0}km</p>
                      )}
                    </div>
                    {!patientResolu.zone_deplacement && (
                      <span className="text-[10px] text-amber">⚠ Ajoutez la zone/distance dans Patients</span>
                    )}
                  </div>
                ) : !creerMode ? (
                  <div className="space-y-2">
                    {patients.length > 0 && (
                      <select value={patientId} onChange={(e) => setPatientId(e.target.value)}
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary">
                        <option value="">— Sélectionner un patient existant —</option>
                        {patients.map((p) => <option key={p.id} value={p.id}>{p.nom} {p.prenom}</option>)}
                      </select>
                    )}
                    <button onClick={() => setCreerMode(true)}
                      className="w-full rounded-lg border border-violet/40 bg-violet/10 px-3 py-2 text-sm font-medium text-violet hover:bg-violet/20 text-left">
                      ✚ Créer un nouveau patient
                      {(patForm.nom || patForm.prenom) && (
                        <span className="ml-2 text-[11px] opacity-70">(pré-rempli depuis l'ordonnance)</span>
                      )}
                    </button>
                  </div>
                ) : null}

                {/* Formulaire création patient inline */}
                {creerMode && (
                  <form onSubmit={handleCreerPatient} className="mt-2 space-y-3">
                    <p className="text-xs font-medium text-textPrimary">Nouveau patient — données pré-remplies depuis l'OCR</p>
                    {patErr && <p className="text-xs text-amber">{patErr}</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input required value={patForm.nom} onChange={(e) => setPatForm((p) => ({ ...p, nom: e.target.value }))}
                        placeholder="Nom *" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary" />
                      <input required value={patForm.prenom} onChange={(e) => setPatForm((p) => ({ ...p, prenom: e.target.value }))}
                        placeholder="Prénom *" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary" />
                      <input value={patForm.telephone} onChange={(e) => setPatForm((p) => ({ ...p, telephone: e.target.value }))}
                        placeholder="Téléphone" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary" />
                      <input value={patForm.medecin_traitant} onChange={(e) => setPatForm((p) => ({ ...p, medecin_traitant: e.target.value }))}
                        placeholder="Médecin traitant" className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary" />
                      <input value={patForm.adresse} onChange={(e) => setPatForm((p) => ({ ...p, adresse: e.target.value }))}
                        placeholder="Adresse" className="col-span-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select value={patForm.zone_deplacement} onChange={(e) => setZone(e.target.value as ZoneDeplacement)}
                        className="rounded-lg border border-teal/30 bg-teal/5 px-3 py-2 text-sm text-textPrimary">
                        {ZONES.map((z) => <option key={z.value} value={z.value}>{z.label}</option>)}
                      </select>
                      <input type="number" min="0" step="0.1" value={patForm.distance_km}
                        onChange={(e) => setPatForm((p) => ({ ...p, distance_km: e.target.value }))}
                        placeholder="Distance aller (km)"
                        className="rounded-lg border border-teal/30 bg-teal/5 px-3 py-2 text-sm text-textPrimary" />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={patSaving}
                        className="flex-1 rounded-lg bg-violet px-3 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                        {patSaving ? "Création…" : "✓ Créer le patient"}
                      </button>
                      <button type="button" onClick={() => setCreerMode(false)}
                        className="text-sm text-textMuted hover:text-textPrimary px-2">Annuler</button>
                    </div>
                  </form>
                )}
              </div>

              {/* Prescripteur / Acte */}
              {panneau.medecin_prescripteur && (
                <div className="rounded-lg bg-surfaceAlt p-3 text-sm">
                  <p className="text-[11px] text-textMuted mb-1 uppercase tracking-wide">Prescripteur</p>
                  <p className="text-textPrimary">{panneau.medecin_prescripteur}</p>
                  {panneau.date_prescription && <p className="text-xs text-textMuted">Le {new Date(panneau.date_prescription).toLocaleDateString("fr-FR")}</p>}
                </div>
              )}
              {panneau.acte_prescrit_texte && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] text-textMuted mb-1 uppercase tracking-wide">Acte prescrit (OCR)</p>
                  <p className="text-xs text-textPrimary leading-relaxed">{panneau.acte_prescrit_texte}</p>
                </div>
              )}

              {/* Cotation existante */}
              {cotExist.length > 0 && (
                <div className="rounded-lg bg-surfaceAlt p-3">
                  <p className="text-[11px] text-textMuted mb-2 uppercase tracking-wide">Cotation NGAP validée</p>
                  {cotExist.map((c, i) => (
                    <div key={i} className="flex justify-between text-xs gap-2 py-0.5">
                      <span className="font-bold text-textPrimary">{c.code_acte}</span>
                      <span className="text-textMuted flex-1 truncate">{c.libelle}</span>
                      <span className="text-teal font-medium">{(c.montant_total ?? 0).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Zone cotation NGAP */}
              {panneau.statut === "en_cours" && cotExist.length === 0 && (
                <div className="rounded-xl border border-violet/20 bg-violet/5 p-4 space-y-3">
                  <p className="text-[11px] uppercase tracking-wide text-textMuted font-medium">Cotation NGAP · Article 11B</p>
                  {!cotProp && !cotLoading && !cotValidee && (
                    <button onClick={() => handleProposerCotation(panneau.id)}
                      className="w-full rounded-lg bg-violet px-4 py-2.5 text-sm font-medium text-white hover:bg-violet/90">
                      🤖 Proposer une cotation NGAP
                    </button>
                  )}
                  {cotLoading && <p className="text-xs text-textMuted text-center py-2">Analyse IA en cours…</p>}
                  {cotErr && <p className="text-xs text-amber">{cotErr}</p>}
                  {detail && !cotValidee && (
                    <div className="space-y-3">
                      {detail.lignes.map((l, i) => (
                        <div key={i} className={`flex items-center gap-2 text-xs ${l.gratuit ? "opacity-50" : ""}`}>
                          <span className="font-bold text-textPrimary w-14 shrink-0">{l.code_acte}</span>
                          <span className="text-textMuted flex-1 truncate text-[11px]">{l.libelle}</span>
                          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${l.pourcentage === 100 ? "bg-teal/20 text-teal" : l.pourcentage === 50 ? "bg-amber/20 text-amber" : "bg-surfaceAlt text-textMuted"}`}>
                            {l.gratuit ? "Gratuit" : `${l.pourcentage}%`}
                          </span>
                          <span className="shrink-0 font-medium text-textPrimary w-14 text-right">{l.gratuit ? "0.00 €" : `${l.montant_net.toFixed(2)} €`}</span>
                        </div>
                      ))}
                      <div className="border-t border-line pt-2 space-y-0.5">
                        <div className="flex justify-between text-[11px] text-textMuted"><span>IFD</span><span>{IFD.toFixed(2)} €</span></div>
                        {detail.ik > 0 && patientResolu ? (
                          <div className="flex justify-between text-[11px] text-textMuted">
                            <span>IK {patientResolu.zone_deplacement} · {patientResolu.distance_km}km A/R</span>
                            <span>{detail.ik.toFixed(2)} €</span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-textMuted italic">← Distance à renseigner dans la fiche patient</p>
                        )}
                      </div>
                      <div className="border-t border-line pt-2">
                        <p className="text-[11px] text-textMuted font-medium mb-2">Majorations</p>
                        {MAJORATIONS.map((m) => (
                          <label key={m.code} className="flex items-center gap-2 cursor-pointer mb-1.5">
                            <input type="checkbox" checked={majActives.includes(m.code)}
                              onChange={() => setMajActives((p) => p.includes(m.code) ? p.filter((c) => c !== m.code) : [...p, m.code])}
                              className="accent-violet" />
                            <span className="text-xs text-textPrimary flex-1">{m.label}</span>
                            <span className="text-xs text-teal font-medium">+{m.montant.toFixed(2)} €</span>
                          </label>
                        ))}
                      </div>
                      <div className="border-t border-line pt-2 flex justify-between font-bold">
                        <span className="text-sm text-textPrimary">Total séance</span>
                        <span className="text-teal text-lg">{detail.total.toFixed(2)} €</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setCotProp(null)}
                          className="flex-1 rounded-lg border border-line px-3 py-2 text-xs text-textMuted hover:text-textPrimary">Relancer</button>
                        <button onClick={() => handleValiderCotation(panneau.id)}
                          disabled={actionId === panneau.id || (!panneau.patient?.id && !patientId)}
                          className="flex-1 rounded-lg bg-teal px-3 py-2 text-xs font-medium text-black hover:opacity-90 disabled:opacity-50">
                          {actionId === panneau.id ? "Validation…" : "✓ Valider la cotation"}
                        </button>
                      </div>
                      {!panneau.patient?.id && !patientId && (
                        <p className="text-[11px] text-amber text-center">Sélectionnez ou créez un patient d'abord</p>
                      )}
                    </div>
                  )}
                  {cotValidee && <p className="text-xs text-teal text-center py-2">✓ Cotation validée</p>}
                </div>
              )}

              {/* Actions export */}
              {panneau.statut === "en_cours" && cotExist.length > 0 && (
                <div className="flex flex-col gap-2">
                  <a href={idelExporterCsv(panneau.id)} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-teal/40 bg-teal/10 px-4 py-2 text-center text-sm font-medium text-teal hover:bg-teal/20">
                    ↓ Export CSV (import LPS)
                  </a>
                  <a href={idelFicheReprise(panneau.id)} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-violet/40 bg-violet/10 px-4 py-2 text-center text-sm font-medium text-violet hover:bg-violet/20">
                    ↓ Fiche de reprise assistée
                  </a>
                  <button onClick={() => handleMarquerTransmis(panneau.id)} disabled={actionId === panneau.id}
                    className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50">
                    {actionId === panneau.id ? "…" : "✓ Transmis depuis mon LPS"}
                  </button>
                </div>
              )}
              {panneau.statut === "traite" && (
                <p className="text-xs text-teal text-center">✓ Transmise à la CPAM via votre LPS</p>
              )}
            </div>
          </div>
        )}

        <p className="mt-8 text-[11px] text-textMuted">
          ⚠ Cotation indicative (Art.11B NGAP). Ne se substitue pas à votre LPS agréé SESAM-Vitale.
        </p>
      </main>
    </>
  );
}
