"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { Client, ClientInput } from "@/lib/types";
import {
  getClients,
  creerClient,
  modifierClient,
  supprimerClient,
  ApiError,
} from "@/lib/api";

const SECTEURS_SANTE = [
  { value: "IDEL", label: "IDEL — Infirmier(ère) libéral(e)" },
  { value: "SSIAD", label: "SSIAD — Service de soins infirmiers à domicile" },
  { value: "PSDM", label: "PSDM — Prestataire de santé à domicile" },
  { value: "Cabinet médical", label: "Cabinet médical" },
  { value: "Cabinet paramédical", label: "Cabinet paramédical (kiné, ortho…)" },
  { value: "Clinique", label: "Clinique / Hôpital privé" },
  { value: "EHPAD", label: "EHPAD / Maison de retraite" },
  { value: "Pharmacie", label: "Pharmacie" },
];

const SECTEURS_ARTISANS = [
  { value: "Plomberie", label: "Plomberie / Chauffage" },
  { value: "Électricité", label: "Électricité" },
  { value: "Maçonnerie", label: "Maçonnerie / Gros œuvre" },
  { value: "Menuiserie", label: "Menuiserie / Charpente" },
  { value: "Peinture", label: "Peinture / Revêtements" },
  { value: "Toiture", label: "Toiture / Couverture" },
  { value: "Climatisation", label: "Climatisation / VMC" },
];

const SECTEURS_COMMERCE = [
  { value: "Commerce", label: "Commerce / Retail" },
  { value: "Restauration", label: "Restauration / Hôtellerie" },
  { value: "Immobilier", label: "Immobilier" },
  { value: "Juridique", label: "Juridique / Notariat" },
  { value: "Comptabilité", label: "Comptabilité / Expertise" },
  { value: "Autre", label: "Autre" },
];

const SECTEURS_SANTE_VALUES = SECTEURS_SANTE.map((s) => s.value);

function estSecteurSante(secteur?: string | null): boolean {
  return !!secteur && SECTEURS_SANTE_VALUES.includes(secteur);
}

const VIDE: ClientInput = {
  nom: "",
  secteur: "",
  email: "",
  telephone: "",
  adresse: "",
  siret: "",
  notes: "",
  activite_description: "",
};

function placeholderActivite(secteur: string): string {
  switch (secteur) {
    case "IDEL": return "ex: Utilise Albus, 45 patients actifs, zone Nice Nord";
    case "SSIAD": return "ex: 8 IDE, 120 patients, secteur 06";
    case "PSDM": return "ex: Matériel respiratoire, 200 patients, HAD";
    default: return "ex: 3 associés, spécialité cardiologie";
  }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [clientEnEdition, setClientEnEdition] = useState<Client | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [form, setForm] = useState<ClientInput>(VIDE);

  function charger() {
    setLoading(true);
    getClients()
      .then(setClients)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  function ouvrirNouveau() {
    setClientEnEdition(null);
    setForm(VIDE);
    setFormOuvert(true);
  }

  function ouvrirEdition(client: Client) {
    setClientEnEdition(client);
    setForm({
      nom: client.nom,
      secteur: client.secteur || "",
      email: client.email || "",
      telephone: client.telephone || "",
      adresse: client.adresse || "",
      siret: client.siret || "",
      notes: client.notes || "",
      activite_description: client.activite_description || "",
    });
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      const payload: ClientInput = {
        ...form,
        secteur: form.secteur || undefined,
        email: form.email || undefined,
        telephone: form.telephone || undefined,
        adresse: form.adresse || undefined,
        siret: form.siret || undefined,
        notes: form.notes || undefined,
        activite_description: form.activite_description || undefined,
      };
      if (clientEnEdition) {
        await modifierClient(clientEnEdition.id, payload);
      } else {
        await creerClient(payload);
      }
      setFormOuvert(false);
      setClientEnEdition(null);
      setForm(VIDE);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleSupprimer(client: Client) {
    if (!confirm(`Supprimer définitivement le client "${client.nom}" ?`)) return;
    setSuppressionEnCours(client.id);
    try {
      await supprimerClient(client.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    } finally {
      setSuppressionEnCours(null);
    }
  }

  const clientsFiltres = clients.filter((c) =>
    [c.nom, c.secteur, c.email, c.telephone]
      .filter(Boolean)
      .some((v) => v!.toLowerCase().includes(recherche.toLowerCase()))
  );

  const sante = estSecteurSante(form.secteur);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-textPrimary">Clients</h1>
          <button
            onClick={ouvrirNouveau}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Nouveau client
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        {formOuvert && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-display text-lg text-textPrimary">
              {clientEnEdition ? `Modifier ${clientEnEdition.nom}` : "Nouveau client"}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Nom *</span>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex: Cabinet Dupont"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Secteur</span>
                <select
                  value={form.secteur}
                  onChange={(e) => setForm({ ...form, secteur: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="">— Sélectionner un secteur —</option>
                  <optgroup label="Médical / Paramédical / Santé à domicile">
                    {SECTEURS_SANTE.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Artisans / BTP">
                    {SECTEURS_ARTISANS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Commerce / Services">
                    {SECTEURS_COMMERCE.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </optgroup>
                </select>
                {sante && (
                  <p className="mt-1 text-[11px] text-teal">
                    ✓ Secteur santé — la mention HDS/RGPD sera ajoutée automatiquement aux devis et factures.
                  </p>
                )}
                {form.secteur === "IDEL" && (
                  <p className="mt-0.5 text-[11px] text-violet">
                    💡 Ce client peut bénéficier de la plateforme IDEL Mutatech (pipeline ordonnances + cotation NGAP).
                  </p>
                )}
                {form.secteur === "PSDM" && (
                  <p className="mt-0.5 text-[11px] text-violet">
                    💡 Prestataire de santé à domicile — matériel médical, HAD, télésurveillance.
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@exemple.fr"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Téléphone</span>
                <input
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="06 00 00 00 00"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Adresse</span>
                <input
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="12 rue de la Paix, 06000 Nice"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">SIRET</span>
                <input
                  value={form.siret}
                  onChange={(e) => setForm({ ...form, siret: e.target.value })}
                  placeholder="123 456 789 00012"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Description activité
                </span>
                <input
                  value={form.activite_description}
                  onChange={(e) => setForm({ ...form, activite_description: e.target.value })}
                  placeholder={placeholderActivite(form.secteur || "")}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Notes internes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Notes privées sur ce client…"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {enregistrement
                  ? "Enregistrement…"
                  : clientEnEdition
                  ? "Enregistrer les modifications"
                  : "Créer le client"}
              </button>
              <button
                type="button"
                onClick={() => { setFormOuvert(false); setClientEnEdition(null); }}
                className="text-sm text-textMuted hover:text-textPrimary"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {!loading && clients.length > 0 && (
          <div className="mb-4">
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un client…"
              className="w-full max-w-sm rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50"
            />
          </div>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : clientsFiltres.length === 0 ? (
          <p className="text-sm text-textMuted">
            {recherche ? "Aucun client ne correspond à cette recherche." : "Aucun client pour l'instant."}
          </p>
        ) : (
          <div className="space-y-2">
            {clientsFiltres.map((client) => (
              <div
                key={client.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3"
              >
                <div>
                  <p className="font-display text-sm font-bold text-textPrimary">
                    {client.nom}
                    {client.secteur && (
                      <span className={`ml-2 rounded px-2 py-0.5 text-[10px] font-medium ${
                        client.secteur === "IDEL"
                          ? "bg-violet/10 text-violet"
                          : client.secteur === "PSDM"
                          ? "bg-violet/10 text-violet"
                          : estSecteurSante(client.secteur)
                          ? "bg-teal/10 text-teal"
                          : "bg-surfaceAlt text-textMuted"
                      }`}>
                        {client.secteur}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-textMuted">
                    {[client.email, client.telephone, client.adresse]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {client.activite_description && (
                    <p className="mt-0.5 text-[11px] text-textMuted">{client.activite_description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => ouvrirEdition(client)}
                    className="text-xs text-violet hover:text-teal"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleSupprimer(client)}
                    disabled={suppressionEnCours === client.id}
                    className="text-xs text-textMuted hover:text-amber disabled:opacity-50"
                  >
                    {suppressionEnCours === client.id ? "…" : "✕"}
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
