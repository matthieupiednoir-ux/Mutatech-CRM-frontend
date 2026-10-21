"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { idelGetPatients, idelCreerPatient, idelModifierPatient, idelSupprimerPatient, idelImporterPatientsLot, ApiError } from "@/lib/api";
import { IdelPatient, ZoneDeplacement } from "@/lib/types";

// Les montants (IFD, IK) sont calculés par le moteur NGAP du serveur au
// moment de la cotation : cette page ne fait plus d'estimation avec ses
// propres tarifs (recette du 19/10/2026, C7).
const ZONES: { value: ZoneDeplacement; label: string }[] = [
  { value: "plaine", label: "Plaine" },
  { value: "montagne", label: "Montagne" },
  { value: "tres_montagneux", label: "Très montagneux / accès difficile" },
  { value: "pied_ski", label: "À pied ou à ski" },
];

interface PatientForm {
  nom: string;
  prenom: string;
  date_naissance: string;
  numero_secu: string;
  telephone: string;
  adresse: string;
  medecin_traitant: string;
  notes: string;
  zone_deplacement: ZoneDeplacement;
  distance_km: string;
}

const VIDE: PatientForm = {
  nom: "", prenom: "", date_naissance: "", numero_secu: "",
  telephone: "", adresse: "", medecin_traitant: "", notes: "",
  zone_deplacement: "plaine", distance_km: "",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// Colonnes attendues, dans cet ordre, separateur point-virgule (export Excel FR standard) :
// nom;prenom;date_naissance;numero_secu;telephone;adresse;medecin_traitant;zone_deplacement;distance_km;notes
const COLONNES_CSV = [
  "nom", "prenom", "date_naissance", "numero_secu", "telephone",
  "adresse", "medecin_traitant", "zone_deplacement", "distance_km", "notes",
] as const;

function parseCsv(texte: string): Partial<IdelPatient>[] {
  const lignes = texte.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lignes.length === 0) return [];

  // Detecte le separateur (';' prioritaire car standard Excel FR, sinon ',')
  const sep = lignes[0].includes(";") ? ";" : ",";
  const entete = lignes[0].split(sep).map((c) => c.trim().toLowerCase());
  const debutDonnees = COLONNES_CSV.some((c) => entete.includes(c)) ? 1 : 0;

  return lignes.slice(debutDonnees).map((ligne) => {
    const valeurs = ligne.split(sep).map((v) => v.trim());
    const obj: Record<string, string> = {};
    COLONNES_CSV.forEach((col, i) => { obj[col] = valeurs[i] ?? ""; });
    const zone = obj.zone_deplacement as ZoneDeplacement;
    return {
      nom: obj.nom,
      prenom: obj.prenom,
      date_naissance: obj.date_naissance || null,
      numero_secu: obj.numero_secu.replace(/\s+/g, "") || null,
      telephone: obj.telephone || null,
      adresse: obj.adresse || null,
      medecin_traitant: obj.medecin_traitant || null,
      zone_deplacement: ["plaine", "montagne", "tres_montagneux", "pied_ski"].includes(zone) ? zone : "plaine",
      distance_km: obj.distance_km ? parseFloat(obj.distance_km.replace(",", ".")) : null,
      notes: obj.notes || null,
    };
  }).filter((p) => p.nom && p.prenom);
}

export default function IdelPatientsPage() {
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [form, setForm] = useState<PatientForm>({ ...VIDE });
  const [enregistrement, setEnregistrement] = useState(false);
  const [recherche, setRecherche] = useState("");

  // Import CSV/Excel
  const [apercu, setApercu] = useState<Partial<IdelPatient>[] | null>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [importErreur, setImportErreur] = useState<string | null>(null);
  const [importSucces, setImportSucces] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    idelGetPatients()
      .then((data) => setPatients(safeArr<IdelPatient>(data)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  function setZone(z: ZoneDeplacement) {
    setForm((prev) => ({ ...prev, zone_deplacement: z }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    const payload: Partial<IdelPatient> = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      date_naissance: form.date_naissance || null,
      numero_secu: form.numero_secu.replace(/\s+/g, "") || null,
      telephone: form.telephone.trim() || null,
      adresse: form.adresse.trim() || null,
      medecin_traitant: form.medecin_traitant.trim() || null,
      notes: form.notes.trim() || null,
      zone_deplacement: form.zone_deplacement,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
    };
    try {
      if (editionId) await idelModifierPatient(editionId, payload);
      else await idelCreerPatient(payload);
      setForm({ ...VIDE });
      setFormOuvert(false);
      setEditionId(null);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  function handleFichierCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    setImportErreur(null); setImportSucces(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const lignes = parseCsv(String(reader.result ?? ""));
        if (lignes.length === 0) {
          setImportErreur("Aucune ligne exploitable trouvée (colonnes attendues : nom, prenom, ...).");
          return;
        }
        setApercu(lignes);
      } catch {
        setImportErreur("Fichier illisible. Vérifiez qu'il s'agit bien d'un CSV (séparateur ; ou ,).");
      }
    };
    reader.readAsText(fichier, "utf-8");
    e.target.value = "";
  }

  async function handleConfirmerImport() {
    if (!apercu) return;
    setImportEnCours(true); setImportErreur(null);
    try {
      const r = await idelImporterPatientsLot(apercu);
      const n = safeArr(r.crees).length;
      const d = safeArr(r.doublons_ignores).length;
      setImportSucces(`${n} patient${n > 1 ? "s" : ""} importé${n > 1 ? "s" : ""}${d ? `, ${d} doublon${d > 1 ? "s" : ""} ignoré${d > 1 ? "s" : ""} (déjà présent${d > 1 ? "s" : ""})` : ""}.`);
      setApercu(null);
      charger();
    } catch (e) {
      setImportErreur(e instanceof ApiError ? e.message : "Erreur lors de l'import.");
    } finally {
      setImportEnCours(false);
    }
  }

  const patientsFiltres = safeArr<IdelPatient>(patients).filter((p) => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      p.nom?.toLowerCase().includes(q) ||
      p.prenom?.toLowerCase().includes(q) ||
      p.numero_secu?.includes(q) ||
      p.telephone?.includes(q)
    );
  });

  function labelZone(z?: ZoneDeplacement | null) {
    return ZONES.find((x) => x.value === z)?.label ?? "Plaine";
  }

  function ouvrirEdition(p: IdelPatient) {
    setEditionId(p.id);
    setForm({
      nom: p.nom, prenom: p.prenom, date_naissance: p.date_naissance ?? "", numero_secu: p.numero_secu ?? "",
      telephone: p.telephone ?? "", adresse: p.adresse ?? "", medecin_traitant: p.medecin_traitant ?? "",
      notes: p.notes ?? "", zone_deplacement: p.zone_deplacement ?? "plaine",
      distance_km: p.distance_km != null ? String(p.distance_km) : "",
    });
    setFormOuvert(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function supprimer(p: IdelPatient) {
    if (!confirm(`Retirer ${p.nom} ${p.prenom} de la liste des patients ?\n\nS'il a un historique (ordonnances, visites, commandes), le dossier est archivé et ses données de facturation sont conservées pour la durée légale. Sinon il est supprimé définitivement.`)) return;
    setError(null);
    try {
      const r = await idelSupprimerPatient(p.id);
      setImportSucces(r.resultat === "archive" ? `${p.nom} ${p.prenom} a été archivé.` : `${p.nom} ${p.prenom} a été supprimé.`);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Suppression impossible");
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Patients</h1>
            <p className="mt-0.5 text-sm text-textMuted">
              {patients.length} patient{patients.length !== 1 ? "s" : ""} · Zone et distance pour le calcul IK
            </p>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-textMuted hover:border-violet hover:text-textPrimary">
              Importer CSV/Excel
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFichierCsv} />
            </label>
            <button onClick={() => { setForm({ ...VIDE }); setEditionId(null); setFormOuvert(true); }}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
              + Nouveau patient
            </button>
          </div>
        </div>

        {importErreur && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{importErreur}</p>}
        {importSucces && <p className="mb-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">✓ {importSucces}</p>}

        {apercu && (
          <div className="mb-8 rounded-xl border border-violet/30 bg-violet/5 p-5">
            <h2 className="font-display text-lg text-textPrimary mb-1">Aperçu de l'import</h2>
            <p className="mb-4 text-sm text-textMuted">
              {apercu.length} patient{apercu.length > 1 ? "s" : ""} détecté{apercu.length > 1 ? "s" : ""} dans le fichier. Vérifiez avant de confirmer.
            </p>
            <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-line bg-surface">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surfaceAlt text-textMuted">
                  <tr>
                    <th className="px-3 py-2">Nom</th>
                    <th className="px-3 py-2">Prénom</th>
                    <th className="px-3 py-2">Adresse</th>
                    <th className="px-3 py-2">Zone</th>
                    <th className="px-3 py-2">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {apercu.map((p, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-3 py-1.5 text-textPrimary">{p.nom}</td>
                      <td className="px-3 py-1.5 text-textPrimary">{p.prenom}</td>
                      <td className="px-3 py-1.5 text-textMuted">{p.adresse ?? "—"}</td>
                      <td className="px-3 py-1.5 text-textMuted">{p.zone_deplacement ?? "plaine"}</td>
                      <td className="px-3 py-1.5 text-textMuted">{p.distance_km ?? "—"} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button onClick={handleConfirmerImport} disabled={importEnCours}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {importEnCours ? "Import…" : `✓ Confirmer l'import de ${apercu.length} patient${apercu.length > 1 ? "s" : ""}`}
              </button>
              <button onClick={() => setApercu(null)} className="text-sm text-textMuted hover:text-textPrimary">
                Annuler
              </button>
            </div>
          </div>
        )}

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-textPrimary">{editionId ? "Modifier le patient" : "Nouveau patient"}</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Nom *</span>
                <input required value={form.nom}
                  onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
                  placeholder="Dupont"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Prénom *</span>
                <input required value={form.prenom}
                  onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
                  placeholder="Marie"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Date de naissance</span>
                <input type="date" value={form.date_naissance}
                  onChange={(e) => setForm((p) => ({ ...p, date_naissance: e.target.value }))}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">N° Sécurité Sociale</span>
                <input value={form.numero_secu}
                  onChange={(e) => setForm((p) => ({ ...p, numero_secu: e.target.value }))}
                  placeholder="1 85 07 75 123 456 78"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary font-mono text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Téléphone</span>
                <input value={form.telephone}
                  onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Médecin traitant</span>
                <input value={form.medecin_traitant}
                  onChange={(e) => setForm((p) => ({ ...p, medecin_traitant: e.target.value }))}
                  placeholder="Dr Martin"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Adresse</span>
                <input value={form.adresse}
                  onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))}
                  placeholder="12 rue des Lilas, 06000 Nice"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
            </div>

            {/* Zone déplacement NGAP */}
            <div className="rounded-xl border border-teal/20 bg-teal/5 p-4">
              <p className="mb-3 text-sm font-medium text-textPrimary">🚗 Déplacement NGAP</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm text-textMuted">Zone de déplacement</span>
                  <select
                    value={form.zone_deplacement}
                    onChange={(e) => setZone(e.target.value as ZoneDeplacement)}
                    className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                    {ZONES.map((z) => (
                      <option key={z.value} value={z.value}>{z.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-textMuted">Distance aller (km)</span>
                  <input type="number" min="0" step="0.1" value={form.distance_km}
                    onChange={(e) => setForm((p) => ({ ...p, distance_km: e.target.value }))}
                    placeholder="8.5"
                    className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-textMuted">
                Utilisés pour pré-remplir les indemnités de déplacement lors de la cotation.
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-sm text-textMuted">Notes</span>
              <textarea value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2} placeholder="Allergies, contacts d'urgence…"
                className="w-full resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary text-sm" />
            </label>

            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {enregistrement ? "Enregistrement…" : editionId ? "Enregistrer" : "Créer le patient"}
              </button>
              <button type="button" onClick={() => { setFormOuvert(false); setEditionId(null); }}
                className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
            </div>
          </form>
        )}

        {patients.length > 0 && (
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, prénom, n° sécu…"
            className="mb-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60" />
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : patientsFiltres.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">
              {recherche ? "Aucun patient ne correspond." : "Aucun patient encore."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {patientsFiltres.map((p) => {
              const dist = p.distance_km ?? 0;
              return (
                <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                  <div>
                    <p className="font-display text-sm font-bold text-textPrimary">{p.nom} {p.prenom}</p>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-textMuted">
                      {p.date_naissance && <span>Né(e) le {new Date(`${p.date_naissance}T12:00:00`).toLocaleDateString("fr-FR")}</span>}
                      {p.telephone && <span>{p.telephone}</span>}
                      {p.medecin_traitant && <span>Dr {p.medecin_traitant}</span>}
                    </div>
                    {p.numero_secu && <p className="mt-0.5 font-mono text-[11px] text-textMuted">N° SS : {p.numero_secu}</p>}
                    {p.adresse && <p className="text-[11px] text-textMuted">{p.adresse}</p>}
                    {p.notes && <p className="mt-1 text-[11px] italic text-textMuted">{p.notes}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="rounded-lg border border-teal/20 bg-teal/5 px-3 py-2 text-right">
                      <p className="text-[11px] font-medium text-teal">{labelZone(p.zone_deplacement)}</p>
                      <p className="text-[11px] text-textMuted">{dist > 0 ? `${dist} km aller` : "Distance non renseignée"}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => ouvrirEdition(p)} className="rounded border border-line px-2 py-1 text-[11px] text-textMuted hover:text-textPrimary">✎ Modifier</button>
                      <button onClick={() => supprimer(p)} className="rounded border border-amber/40 px-2 py-1 text-[11px] text-amber hover:bg-amber/10">Retirer</button>
                    </div>
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
