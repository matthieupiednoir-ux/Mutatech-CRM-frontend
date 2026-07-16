"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import {
  getClients, creerClient, modifierClient, supprimerClient, ApiError,
} from "@/lib/api";
import { Client, ClientInput } from "@/lib/types";

const SECTEURS = [
  "Médical / Paramédical","Infirmier libéral (IDEL)","Kinésithérapeute","Médecin",
  "Dentiste","Pharmacie","BTP / Artisan","Plombier","Électricien","Menuisier",
  "Maçon","Peintre","Carreleur","Commerce","Restauration","Autre",
];

const VIDE: ClientInput = {
  nom: "",
  secteur: "",
  activite_description: "",
  email: "",
  telephone: "",
  adresse: "",
  siret: "",
  tva_intracommunautaire: "",
  notes: "",
};

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// Memes fonctions que cote IDEL (tournees) -- ouvrent Waze/Maps avec
// l'adresse en destination, sans jamais transmettre de donnees a un
// tiers autre que le navigateur/l'app de nav elle-meme.
function urlWaze(adresse: string): string {
  return `https://waze.com/ul?q=${encodeURIComponent(adresse)}&navigate=yes`;
}
function urlMaps(adresse: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [formOuvert, setFormOuvert] = useState(false);
  const [editionId, setEditionId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientInput>({ ...VIDE });
  const [enregistrement, setEnregistrement] = useState(false);
  const [suppression, setSuppression] = useState<string | null>(null);

  function charger() {
    setLoading(true);
    getClients()
      .then((data) => setClients(safeArr<Client>(data)))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  function ouvrirCreation() {
    setEditionId(null);
    setForm({ ...VIDE });
    setFormOuvert(true);
    setError(null);
  }

  function ouvrirEdition(c: Client) {
    setEditionId(c.id);
    setForm({
      nom: c.nom ?? "",
      secteur: c.secteur ?? "",
      activite_description: c.activite_description ?? "",
      email: c.email ?? "",
      telephone: c.telephone ?? "",
      adresse: c.adresse ?? "",
      siret: c.siret ?? "",
      tva_intracommunautaire: c.tva_intracommunautaire ?? "",
      notes: c.notes ?? "",
    });
    setFormOuvert(true);
    setError(null);
  }

  function fermer() {
    setFormOuvert(false);
    setEditionId(null);
    setForm({ ...VIDE });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    const payload: ClientInput = {
      nom: form.nom.trim(),
      secteur: form.secteur?.trim() || null,
      activite_description: form.activite_description?.trim() || null,
      email: form.email?.trim() || null,
      telephone: form.telephone?.trim() || null,
      adresse: form.adresse?.trim() || null,
      siret: form.siret?.trim() || null,
      tva_intracommunautaire: form.tva_intracommunautaire?.trim() || null,
      notes: form.notes?.trim() || null,
    };
    try {
      if (editionId) {
        await modifierClient(editionId, payload);
      } else {
        await creerClient(payload);
      }
      fermer();
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer ce client ? Cette action est irréversible.")) return;
    setSuppression(id);
    try {
      await supprimerClient(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    } finally {
      setSuppression(null);
    }
  }

  const clientsFiltres = safeArr<Client>(clients).filter((c) => {
    if (!recherche) return true;
    const q = recherche.toLowerCase();
    return (
      c.nom?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.telephone?.includes(q) ||
      c.secteur?.toLowerCase().includes(q) ||
      c.siret?.includes(q)
    );
  });

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Clients</h1>
            <p className="mt-0.5 text-sm text-textMuted">
              {clients.length} client{clients.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={ouvrirCreation}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90">
            + Nouveau client
          </button>
        </div>

        {error && !formOuvert && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>
        )}

        {/* Formulaire */}
        {formOuvert && (
          <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-display text-lg text-textPrimary">
              {editionId ? "Modifier le client" : "Nouveau client"}
            </h2>
            {error && <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">{error}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Nom / Raison sociale *</span>
                <input required value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Cabinet Dupont"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Secteur d'activité</span>
                <select
                  value={form.secteur ?? ""}
                  onChange={(e) => setForm({ ...form, secteur: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  <option value="">— Sélectionner —</option>
                  {SECTEURS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Description de l'activité</span>
                <input value={form.activite_description ?? ""}
                  onChange={(e) => setForm({ ...form, activite_description: e.target.value })}
                  placeholder="Ex : cabinet infirmier 3 praticiens"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Email</span>
                <input type="email" value={form.email ?? ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@cabinet.fr"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Téléphone</span>
                <input value={form.telephone ?? ""}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Adresse</span>
                <input value={form.adresse ?? ""}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  placeholder="12 avenue de la Mer, 06000 Nice"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">SIRET</span>
                <input value={form.siret ?? ""}
                  onChange={(e) => setForm({ ...form, siret: e.target.value })}
                  placeholder="123 456 789 00012"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary font-mono text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">TVA intracommunautaire</span>
                <input value={form.tva_intracommunautaire ?? ""}
                  onChange={(e) => setForm({ ...form, tva_intracommunautaire: e.target.value })}
                  placeholder="FR12345678901"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary font-mono text-sm" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Notes internes</span>
                <textarea value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Informations complémentaires…"
                  className="w-full resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {enregistrement ? "Enregistrement…" : editionId ? "Mettre à jour" : "Créer le client"}
              </button>
              <button type="button" onClick={fermer}
                className="text-sm text-textMuted hover:text-textPrimary">
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Recherche */}
        {clients.length > 0 && (
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher par nom, email, secteur, SIRET…"
            className="mb-4 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60" />
        )}

        {/* Liste */}
        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : clientsFiltres.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-8 text-center">
            <p className="text-sm text-textMuted">
              {recherche ? "Aucun client ne correspond." : "Aucun client encore. Créez le premier."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {clientsFiltres.map((c) => (
              <div key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-bold text-textPrimary">{c.nom}</p>
                    {c.secteur && (
                      <span className="rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 text-[11px] text-violet">
                        {c.secteur}
                      </span>
                    )}
                  </div>
                  {c.activite_description && (
                    <p className="mt-0.5 text-xs text-textMuted">{c.activite_description}</p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-textMuted">
                    {c.email && <span>✉ {c.email}</span>}
                    {c.telephone && <span>📞 {c.telephone}</span>}
                    {c.adresse && (
                      <span className="flex items-center gap-1.5">
                        📍 {c.adresse}
                        <a href={urlWaze(c.adresse)} target="_blank" rel="noopener noreferrer"
                          className="rounded border border-line px-1.5 py-0.5 text-[10px] text-textMuted hover:text-textPrimary">
                          🧭 Waze
                        </a>
                        <a href={urlMaps(c.adresse)} target="_blank" rel="noopener noreferrer"
                          className="rounded border border-line px-1.5 py-0.5 text-[10px] text-textMuted hover:text-textPrimary">
                          🗺️ Maps
                        </a>
                      </span>
                    )}
                    {c.siret && <span className="font-mono">SIRET {c.siret}</span>}
                  </div>
                  {c.notes && <p className="mt-1 text-[11px] italic text-textMuted">{c.notes}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => ouvrirEdition(c)}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">
                    Modifier
                  </button>
                  <button onClick={() => handleSupprimer(c.id)}
                    disabled={suppression === c.id}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:border-amber/40 hover:text-amber disabled:opacity-50">
                    {suppression === c.id ? "…" : "Supprimer"}
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
