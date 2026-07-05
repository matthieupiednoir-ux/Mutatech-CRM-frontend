"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { idelGetPatients, idelCreerPatient, ApiError } from "@/lib/api";
import { IdelPatient } from "@/lib/types";

const PATIENT_VIDE = {
  nom: "",
  prenom: "",
  date_naissance: "",
  numero_secu: "",
  telephone: "",
  adresse: "",
  notes: "",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export default function IdelPatientsPage() {
  const [patients, setPatients] = useState<IdelPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [form, setForm] = useState({ ...PATIENT_VIDE });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      await idelCreerPatient({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        date_naissance: form.date_naissance || undefined,
        numero_secu: form.numero_secu.trim() || undefined,
        telephone: form.telephone.trim() || undefined,
        adresse: form.adresse.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm({ ...PATIENT_VIDE });
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

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Patients</h1>
            <p className="mt-0.5 text-sm text-textMuted">
              {patients.length} patient{patients.length !== 1 ? "s" : ""} enregistré{patients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => { setForm({ ...PATIENT_VIDE }); setFormOuvert(true); }}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Nouveau patient
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>
        )}

        {/* Formulaire création */}
        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-textPrimary">Nouveau patient</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Nom *</span>
                <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Dupont"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Prénom *</span>
                <input required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  placeholder="Marie"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Date de naissance</span>
                <input type="date" value={form.date_naissance} onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">N° Sécurité Sociale</span>
                <input value={form.numero_secu} onChange={(e) => setForm({ ...form, numero_secu: e.target.value })}
                  placeholder="1 85 07 75 123 456 78"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary font-mono text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Téléphone</span>
                <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Adresse</span>
                <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="12 rue des Lilas, 06000 Nice"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Allergies, contacts d'urgence, particularités…"
                  className="w-full resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {enregistrement ? "Enregistrement…" : "Créer le patient"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)}
                className="text-sm text-textMuted hover:text-textPrimary">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Recherche */}
        {patients.length > 0 && (
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, prénom, n° sécu…"
            className="mb-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60"
          />
        )}

        {/* Liste patients */}
        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : patientsFiltres.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">
              {recherche ? "Aucun patient ne correspond à la recherche." : "Aucun patient encore. Créez le premier."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {patientsFiltres.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div>
                  <p className="font-display text-sm font-bold text-textPrimary">
                    {p.nom} {p.prenom}
                  </p>
                  <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-textMuted">
                    {p.date_naissance && (
                      <span>Né(e) le {new Date(p.date_naissance).toLocaleDateString("fr-FR")}</span>
                    )}
                    {p.telephone && <span>📞 {p.telephone}</span>}
                    {p.adresse && <span>📍 {p.adresse}</span>}
                  </div>
                  {p.numero_secu && (
                    <p className="mt-0.5 font-mono text-[11px] text-textMuted">
                      N° SS : {p.numero_secu}
                    </p>
                  )}
                  {p.notes && (
                    <p className="mt-1 text-[11px] text-textMuted italic">{p.notes}</p>
                  )}
                </div>
                <span className="rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[11px] text-teal">
                  Actif
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
