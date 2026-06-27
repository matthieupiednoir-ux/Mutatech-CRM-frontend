"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { Prospect, ProspectInput } from "@/lib/types";
import {
  getProspects,
  creerProspect,
  modifierProspect,
  supprimerProspect,
  convertirEnClient,
  ApiError,
} from "@/lib/api";

const PROSPECT_VIDE: ProspectInput = {
  nom: "",
  secteur: "SSIAD",
  email: "",
  telephone: "",
  adresse: "",
  statut: "a_contacter",
  notes: "",
};

const STATUT_LABEL: Record<string, string> = {
  a_contacter: "À contacter",
  contacte: "Contacté",
  rdv_planifie: "RDV planifié",
  converti: "Converti",
  perdu: "Perdu",
};

const STATUT_COULEUR: Record<string, string> = {
  a_contacter: "text-textMuted border-line",
  contacte: "text-violet border-violet/40 bg-violet/10",
  rdv_planifie: "text-amber border-amber/40 bg-amber/10",
  converti: "text-teal border-teal/40 bg-teal/10",
  perdu: "text-textMuted border-line opacity-60",
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [prospectEnEdition, setProspectEnEdition] = useState<string | null>(null);
  const [form, setForm] = useState<ProspectInput>({ ...PROSPECT_VIDE });
  const [enregistrement, setEnregistrement] = useState(false);
  const [conversionEnCours, setConversionEnCours] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    getProspects()
      .then(setProspects)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function ouvrirNouveau() {
    setForm({ ...PROSPECT_VIDE });
    setProspectEnEdition(null);
    setFormOuvert(true);
  }

  function ouvrirEdition(prospect: Prospect) {
    setForm({
      nom: prospect.nom,
      secteur: prospect.secteur || "SSIAD",
      email: prospect.email || "",
      telephone: prospect.telephone || "",
      adresse: prospect.adresse || "",
      statut: prospect.statut,
      notes: prospect.notes || "",
    });
    setProspectEnEdition(prospect.id);
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      if (prospectEnEdition) {
        await modifierProspect(prospectEnEdition, form);
      } else {
        await creerProspect(form);
      }
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer ce prospect ?")) return;
    try {
      await supprimerProspect(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    }
  }

  async function handleConvertir(prospect: Prospect) {
    if (
      !confirm(
        `Transformer "${prospect.nom}" en client ? Cette action créera une nouvelle fiche client avec ses coordonnées.`
      )
    )
      return;
    setConversionEnCours(prospect.id);
    setError(null);
    setInfo(null);
    try {
      await convertirEnClient(prospect.id);
      setInfo(`"${prospect.nom}" a été ajouté à tes clients !`);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de conversion");
    } finally {
      setConversionEnCours(null);
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl text-textPrimary">Prospects</h1>
          <button
            onClick={ouvrirNouveau}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Nouveau prospect
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}
        {info && (
          <p className="mb-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">
            {info}
          </p>
        )}

        {formOuvert && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-display text-lg text-textPrimary">
              {prospectEnEdition ? "Modifier le prospect" : "Nouveau prospect"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Nom</span>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Secteur</span>
                <select
                  value={form.secteur}
                  onChange={(e) => setForm({ ...form, secteur: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="SSIAD">SSIAD</option>
                  <option value="PME">PME</option>
                  <option value="Artisan">Artisan</option>
                  <option value="Cabinet médical">Cabinet médical</option>
                  <option value="Autre">Autre</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Téléphone
                </span>
                <input
                  value={form.telephone}
                  onChange={(e) =>
                    setForm({ ...form, telephone: e.target.value })
                  }
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">
                  Adresse
                </span>
                <textarea
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Statut
                </span>
                <select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="a_contacter">À contacter</option>
                  <option value="contacte">Contacté</option>
                  <option value="rdv_planifie">RDV planifié</option>
                  <option value="perdu">Perdu</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="text-sm text-textMuted hover:text-textPrimary"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : prospects.length === 0 ? (
          <p className="text-sm text-textMuted">
            Aucun prospect pour l'instant.
          </p>
        ) : (
          <div className="space-y-2">
            {prospects.map((prospect) => (
              <div
                key={prospect.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4"
              >
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-textPrimary">
                    {prospect.nom}{" "}
                    <span className="ml-2 font-mono text-xs font-normal text-textMuted">
                      {prospect.secteur}
                    </span>
                  </p>
                  <p className="text-xs text-textMuted">
                    {prospect.email || "—"}{" "}
                    {prospect.telephone ? `· ${prospect.telephone}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-1 text-xs font-medium ${STATUT_COULEUR[prospect.statut]}`}
                  >
                    {STATUT_LABEL[prospect.statut]}
                  </span>
                  {prospect.statut !== "converti" && (
                    <button
                      onClick={() => handleConvertir(prospect)}
                      disabled={conversionEnCours === prospect.id}
                      className="rounded bg-teal px-3 py-1.5 text-xs font-medium text-ink hover:bg-teal/90 disabled:opacity-50"
                    >
                      {conversionEnCours === prospect.id
                        ? "…"
                        : "Convertir en client"}
                    </button>
                  )}
                  <button
                    onClick={() => ouvrirEdition(prospect)}
                    className="text-xs text-violet hover:text-teal"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleSupprimer(prospect.id)}
                    className="text-xs text-textMuted hover:text-amber"
                  >
                    ✕
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
