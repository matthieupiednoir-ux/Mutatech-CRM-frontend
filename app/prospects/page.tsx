"use client";

import { useEffect, useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import CsvImportPanel from "@/components/CsvImportPanel";
import { Prospect, ProspectInput, StatutProspect } from "@/lib/types";
import {
  getProspects, creerProspect, modifierProspect,
  supprimerProspect, convertirEnClient, importerProspectsLot,
} from "@/lib/api";

const SECTEURS = ["SSIAD", "Cabinet médical", "IDEL", "PSDM", "Artisan-BTP", "Artisan", "Autre"];

const STATUTS: { code: StatutProspect; label: string }[] = [
  { code: "a_contacter", label: "À contacter" },
  { code: "contacte", label: "Contacté" },
  { code: "rdv_planifie", label: "RDV planifié" },
  { code: "converti", label: "Converti" },
  { code: "perdu", label: "Perdu" },
];

const CSV_CHAMPS = [
  { cle: "nom", label: "Nom", requis: true },
  { cle: "secteur", label: "Secteur" },
  { cle: "telephone", label: "Téléphone" },
  { cle: "email", label: "Email" },
  { cle: "adresse", label: "Adresse" },
  { cle: "statut", label: "Statut" },
  { cle: "notes", label: "Notes" },
];

const STATUT_COULEUR: Record<string, string> = {
  a_contacter: "text-textMuted border-line",
  contacte: "text-violet border-violet/40 bg-violet/10",
  rdv_planifie: "text-amber border-amber/40 bg-amber/10",
  converti: "text-teal border-teal/40 bg-teal/10",
  perdu: "text-textMuted border-line opacity-60",
};

function labelStatut(code: string) {
  return STATUTS.find((s) => s.code === code)?.label ?? code;
}

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

const PROSPECT_VIDE: ProspectInput = {
  nom: "", secteur: "SSIAD", email: "", telephone: "",
  adresse: "", statut: "a_contacter", notes: "",
};

export default function PageProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vue, setVue] = useState<"liste" | "carte">("liste");
  const [filtreSecteur, setFiltreSecteur] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);
  const [prospectEdition, setProspectEdition] = useState<Prospect | null>(null);
  const [form, setForm] = useState<ProspectInput>({ ...PROSPECT_VIDE });
  const [enregistrement, setEnregistrement] = useState(false);
  const [csvOuvert, setCsvOuvert] = useState(false);
  const [seedEnCours, setSeedEnCours] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");

  async function recharger() {
    try {
      setChargement(true);
      const data = await getProspects();
      setProspects(safeArr<Prospect>(data));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { recharger(); }, []);

  const prospectsFiltres = useMemo(() => {
    return safeArr<Prospect>(prospects).filter((p) => {
      if (filtreSecteur && p.secteur !== filtreSecteur) return false;
      if (filtreStatut && p.statut !== filtreStatut) return false;
      if (recherche) {
        const q = recherche.toLowerCase();
        return p.nom?.toLowerCase().includes(q) || p.telephone?.includes(q) || p.adresse?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [prospects, filtreSecteur, filtreStatut, recherche]);

  async function handleSeedImport() {
    try {
      const { PROSPECTS_BRUTS, mapperProspect } = await import("@/lib/seed-prospects");
      if (!confirm(`Importer ${PROSPECTS_BRUTS.length} prospects depuis le seed ? Les doublons seront créés en plus de l'existant.`)) return;
      setSeedEnCours(true);
      setImportMsg(null);
      const data: ProspectInput[] = PROSPECTS_BRUTS.map((p) => mapperProspect(p) as ProspectInput);
      const crees = await importerProspectsLot(data);
      setImportMsg(`✓ ${crees.length} prospect(s) importé(s).`);
      await recharger();
    } catch (e) {
      setImportMsg(`✗ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setSeedEnCours(false);
    }
  }

  async function handleCsvImport(lignes: Record<string, string>[]) {
    if (lignes.length === 0) throw new Error("Le fichier ne contient aucune ligne.");
    const STATUTS_VALIDES: StatutProspect[] = ["a_contacter", "contacte", "rdv_planifie", "converti", "perdu"];
    const data: ProspectInput[] = lignes
      .map((l) => {
        const statutRaw = l.statut?.trim() ?? "";
        const statut: StatutProspect = (STATUTS_VALIDES.includes(statutRaw as StatutProspect)
          ? statutRaw
          : "a_contacter") as StatutProspect;
        return {
          nom: (l.nom || "").trim(),
          secteur: l.secteur?.trim() || undefined,
          telephone: l.telephone?.trim() || undefined,
          email: l.email?.trim() || undefined,
          adresse: l.adresse?.trim() || undefined,
          statut,
          notes: l.notes?.trim() || undefined,
        };
      })
      .filter((p) => p.nom);
    if (data.length === 0) throw new Error("Aucune ligne avec un nom valide.");
    const crees = await importerProspectsLot(data);
    setImportMsg(`✓ ${crees.length} prospect(s) importé(s) via CSV.`);
    await recharger();
  }

  function ouvrirCreation() {
    setProspectEdition(null);
    setForm({ ...PROSPECT_VIDE });
    setFormOuvert(true);
    setErreur(null);
  }

  function ouvrirEdition(p: Prospect) {
    setProspectEdition(p);
    setForm({
      nom: p.nom ?? "",
      secteur: p.secteur ?? "",
      email: p.email ?? "",
      telephone: p.telephone ?? "",
      adresse: p.adresse ?? "",
      statut: p.statut ?? "a_contacter",
      notes: p.notes ?? "",
    });
    setFormOuvert(true);
    setErreur(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setErreur(null);
    const payload: ProspectInput = {
      nom: form.nom.trim(),
      secteur: form.secteur?.trim() || null,
      email: form.email?.trim() || null,
      telephone: form.telephone?.trim() || null,
      adresse: form.adresse?.trim() || null,
      statut: form.statut ?? "a_contacter",
      notes: form.notes?.trim() || null,
    };
    try {
      if (prospectEdition) {
        await modifierProspect(prospectEdition.id, payload);
      } else {
        await creerProspect(payload);
      }
      setFormOuvert(false);
      setProspectEdition(null);
      recharger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer ce prospect ?")) return;
    try { await supprimerProspect(id); recharger(); }
    catch (e) { setErreur(e instanceof Error ? e.message : "Erreur"); }
  }

  async function handleConvertir(id: string) {
    if (!confirm("Convertir ce prospect en client ? Cette action est irréversible.")) return;
    try {
      await convertirEnClient(id);
      setImportMsg("✓ Prospect converti en client.");
      recharger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de conversion");
    }
  }

  const secteursPresents = Array.from(new Set(safeArr<Prospect>(prospects).map((p) => p.secteur).filter(Boolean))) as string[];

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Prospects</h1>
            <p className="mt-0.5 text-sm text-textMuted">{prospects.length} prospects</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleSeedImport} disabled={seedEnCours}
              className="rounded-lg border border-violet/40 px-3 py-2 text-xs font-medium text-violet hover:bg-violet/10 disabled:opacity-50">
              {seedEnCours ? "Import…" : "Seed historique"}
            </button>
            <button onClick={() => setCsvOuvert(true)}
              className="rounded-lg border border-teal/40 px-3 py-2 text-xs font-medium text-teal hover:bg-teal/10">
              Import CSV
            </button>
            <button onClick={ouvrirCreation}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
              + Nouveau prospect
            </button>
          </div>
        </div>

        {erreur && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{erreur}</p>}
        {importMsg && <p className="mb-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{importMsg}</p>}

        {/* CSV Import */}
        {csvOuvert && (
          <div className="mb-6">
            <CsvImportPanel
              titre="Import CSV prospects"
              champs={CSV_CHAMPS}
              onImporter={handleCsvImport}
              onFermer={() => setCsvOuvert(false)}
            />
          </div>
        )}

        {/* Formulaire */}
        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-textPrimary">
              {prospectEdition ? "Modifier le prospect" : "Nouveau prospect"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Nom *</span>
                <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Nom de la structure ou du contact"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Secteur</span>
                <select value={form.secteur ?? ""} onChange={(e) => setForm({ ...form, secteur: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  <option value="">— Sélectionner —</option>
                  {SECTEURS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Statut</span>
                <select value={form.statut ?? "a_contacter"} onChange={(e) => setForm({ ...form, statut: e.target.value as StatutProspect })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  {STATUTS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Téléphone</span>
                <input value={form.telephone ?? ""} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Email</span>
                <input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@structure.fr"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Adresse</span>
                <input value={form.adresse ?? ""} onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="12 rue des Lilas, 06000 Nice"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Notes</span>
                <textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Informations complémentaires…"
                  className="w-full resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary text-sm" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
                {enregistrement ? "…" : prospectEdition ? "Mettre à jour" : "Créer"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)}
                className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
            </div>
          </form>
        )}

        {/* Filtres */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher…"
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-textPrimary placeholder:text-textMuted/60 flex-1 min-w-36" />
          <select value={filtreSecteur} onChange={(e) => setFiltreSecteur(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-textPrimary">
            <option value="">Tous secteurs</option>
            {secteursPresents.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-textPrimary">
            <option value="">Tous statuts</option>
            {STATUTS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
        </div>

        {/* Liste */}
        {chargement ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : prospectsFiltres.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">Aucun prospect{recherche || filtreSecteur || filtreStatut ? " ne correspond" : " encore"}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {prospectsFiltres.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-bold text-textPrimary">{p.nom}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUT_COULEUR[p.statut] ?? "text-textMuted border-line"}`}>
                      {labelStatut(p.statut)}
                    </span>
                    {p.secteur && (
                      <span className="rounded-full bg-violet/10 border border-violet/20 px-2 py-0.5 text-[11px] text-violet">{p.secteur}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-textMuted">
                    {p.telephone && <span>📞 {p.telephone}</span>}
                    {p.email && <span>✉ {p.email}</span>}
                    {p.adresse && <span>📍 {p.adresse}</span>}
                  </div>
                  {p.notes && <p className="mt-1 text-[11px] italic text-textMuted">{p.notes}</p>}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {p.statut !== "converti" && p.statut !== "perdu" && (
                    <button onClick={() => handleConvertir(p.id)}
                      className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs text-teal hover:bg-teal/20">
                      → Client
                    </button>
                  )}
                  <button onClick={() => ouvrirEdition(p)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                    Modifier
                  </button>
                  <button onClick={() => handleSupprimer(p.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:border-amber/40 hover:text-amber">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
