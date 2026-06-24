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

const CLIENT_VIDE: ClientInput = {
  nom: "",
  secteur: "SSIAD",
  email: "",
  telephone: "",
  adresse: "",
  siret: "",
  notes: "",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [clientEnEdition, setClientEnEdition] = useState<string | null>(null);
  const [form, setForm] = useState<ClientInput>({ ...CLIENT_VIDE });
  const [enregistrement, setEnregistrement] = useState(false);

  function charger() {
    setLoading(true);
    getClients()
      .then(setClients)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function ouvrirNouveau() {
    setForm({ ...CLIENT_VIDE });
    setClientEnEdition(null);
    setFormOuvert(true);
  }

  function ouvrirEdition(client: Client) {
    setForm({
      nom: client.nom,
      secteur: client.secteur || "SSIAD",
      email: client.email || "",
      telephone: client.telephone || "",
      adresse: client.adresse || "",
      siret: client.siret || "",
      notes: client.notes || "",
    });
    setClientEnEdition(client.id);
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      if (clientEnEdition) {
        await modifierClient(clientEnEdition, form);
      } else {
        await creerClient(form);
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
    if (!confirm("Supprimer ce client ? Ses devis/factures associés seront aussi supprimés."))
      return;
    try {
      await supprimerClient(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
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
              {clientEnEdition ? "Modifier le client" : "Nouveau client"}
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
                  placeholder="contact@client.fr"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/60"
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
                <span className="mb-1 block text-sm text-textMuted">SIRET</span>
                <input
                  value={form.siret}
                  onChange={(e) => setForm({ ...form, siret: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
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
        ) : clients.length === 0 ? (
          <p className="text-sm text-textMuted">Aucun client pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between rounded-lg border border-line bg-surface p-4"
              >
                <div>
                  <p className="font-display text-sm font-bold text-textPrimary">
                    {client.nom}{" "}
                    <span className="ml-2 font-mono text-xs font-normal text-textMuted">
                      {client.secteur}
                    </span>
                  </p>
                  <p className="text-xs text-textMuted">
                    {client.email || "—"} {client.telephone ? `· ${client.telephone}` : ""}
                  </p>
                </div>
                <div className="flex gap-3 text-xs">
                  <button
                    onClick={() => ouvrirEdition(client)}
                    className="text-violet hover:text-teal"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleSupprimer(client.id)}
                    className="text-textMuted hover:text-amber"
                  >
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
