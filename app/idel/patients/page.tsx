"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { idelGetPatients, idelCreerPatient, ApiError } from "@/lib/api";
import { IdelPatient, ZoneDeplacement } from "@/lib/types";

const ZONES: { value: ZoneDeplacement; label: string; ik: number }[] = [
  { value: "plaine", label: "Plaine", ik: 0.91 },
  { value: "montagne", label: "Montagne", ik: 1.05 },
  { value: "tres_montagneux", label: "Très montagneux / accès difficile", ik: 1.10 },
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

export default function IdelPatientsPage() {
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState<PatientForm>({ ...VIDE });
  const [enregistrement, setEnregistrement] = useState(false);
  const [recherche, setRecherche] = useState("");

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
      numero_secu: form.numero_secu.trim() || null,
      telephone: form.telephone.trim() || null,
      adresse: form.adresse.trim() || null,
      medecin_traitant: form.medecin_traitant.trim() || null,
      notes: form.notes.trim() || null,
      zone_deplacement: form.zone_deplacement,
      distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
    };
    try {
      await idelCreerPatient(payload);
      setForm({ ...VIDE });
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
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
  function ikZone(z?: ZoneDeplacement | null) {
    return ZONES.find((x) => x.value === z)?.ik ?? 0.91;
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
          <button onClick={() => { setForm({ ...VIDE }); setFormOuvert(true); }}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
            + Nouveau patient
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-textPrimary">Nouveau patient</h2>

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
                      <option key={z.value} value={z.value}>{z.label} — {z.ik}€/km</option>
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
              {form.distance_km && (
                <p className="mt-2 text-xs text-teal">
                  IK estimé : {(parseFloat(form.distance_km) * (ZONES.find((z) => z.value === form.zone_deplacement)?.ik ?? 0.91) * 2).toFixed(2)} € (aller-retour) + IFD 2.50€
                </p>
              )}
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
                {enregistrement ? "Enregistrement…" : "Créer le patient"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)}
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
              const ik = ikZone(p.zone_deplacement);
              const dist = p.distance_km ?? 0;
              const totalDeplacement = dist > 0 ? (dist * ik * 2 + 2.50) : 2.50;
              return (
                <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                  <div>
                    <p className="font-display text-sm font-bold text-textPrimary">{p.nom} {p.prenom}</p>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-textMuted">
                      {p.date_naissance && <span>Né(e) le {new Date(p.date_naissance).toLocaleDateString("fr-FR")}</span>}
                      {p.telephone && <span>📞 {p.telephone}</span>}
                      {p.medecin_traitant && <span>Dr {p.medecin_traitant}</span>}
                    </div>
                    {p.numero_secu && <p className="mt-0.5 font-mono text-[11px] text-textMuted">N° SS : {p.numero_secu}</p>}
                    {p.adresse && <p className="text-[11px] text-textMuted">📍 {p.adresse}</p>}
                    {p.notes && <p className="mt-1 text-[11px] italic text-textMuted">{p.notes}</p>}
                  </div>
                  <div className="rounded-lg border border-teal/20 bg-teal/5 px-3 py-2 text-right shrink-0">
                    <p className="text-[11px] font-medium text-teal">{labelZone(p.zone_deplacement)}</p>
                    {dist > 0 && <p className="text-[11px] text-textMuted">{dist} km · {ik}€/km</p>}
                    <p className="text-xs font-bold text-teal">≈ {totalDeplacement.toFixed(2)} € / visite</p>
                    <p className="text-[10px] text-textMuted">IFD + IK A/R</p>
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
