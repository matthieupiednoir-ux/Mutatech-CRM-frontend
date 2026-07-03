"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ClientSaas {
  tenant_id: string;
  nom_entreprise: string;
  email: string;
  nom_contact: string | null;
  produit: string;
  actif: boolean;
  stripe_statut: string | null;
  cree_le: string | null;
}

const PRODUIT_LABEL: Record<string, string> = {
  crm: "CRM",
  idel: "IDEL",
  "crm+idel": "CRM + IDEL",
};

const PRODUIT_COULEUR: Record<string, string> = {
  crm: "bg-violet/10 text-violet",
  idel: "bg-teal/10 text-teal",
  "crm+idel": "bg-amber/10 text-amber",
};

async function requeteAdmin<T>(chemin: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("mutatech_crm_token");
  const res = await fetch(`${API_URL}${chemin}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const corps = await res.text();
    throw new ApiError(corps || `Erreur ${res.status}`);
  }
  return res.json();
}

export default function AdminPage() {
  const router = useRouter();
  const user = getUser();
  const [clients, setClients] = useState<ClientSaas[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [creation, setCreation] = useState(false);
  const [actionEnCours, setActionEnCours] = useState<string | null>(null);

  const [form, setForm] = useState({
    nom_entreprise: "",
    email: "",
    nom_contact: "",
    produit: "crm",
    couleur_primaire: "#6C63FF",
    couleur_secondaire: "#00D4AA",
  });

  // Rediriger si pas admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  function charger() {
    setLoading(true);
    requeteAdmin<ClientSaas[]>("/api/admin/clients")
      .then(setClients)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  async function handleCreer(e: React.FormEvent) {
    e.preventDefault();
    setCreation(true);
    setError(null);
    setSucces(null);
    try {
      const res = await requeteAdmin<{ message: string }>("/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({
          nom_entreprise: form.nom_entreprise,
          email: form.email,
          nom_contact: form.nom_contact || undefined,
          produit: form.produit,
          couleur_primaire: form.couleur_primaire,
          couleur_secondaire: form.couleur_secondaire,
        }),
      });
      setSucces(res.message);
      setFormOuvert(false);
      setForm({
        nom_entreprise: "",
        email: "",
        nom_contact: "",
        produit: "crm",
        couleur_primaire: "#6C63FF",
        couleur_secondaire: "#00D4AA",
      });
      charger();
    } catch (e) {
      let msg = "Erreur de création.";
      if (e instanceof ApiError) {
        try { msg = JSON.parse(e.message)?.detail || e.message; } catch { msg = e.message; }
      }
      setError(msg);
    } finally {
      setCreation(false);
    }
  }

  async function handleSuspendre(tenantId: string) {
    if (!confirm("Suspendre l'accès de ce client ?")) return;
    setActionEnCours(tenantId);
    try {
      await requeteAdmin(`/api/admin/clients/${tenantId}/suspendre`, { method: "PUT" });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setActionEnCours(null);
    }
  }

  async function handleReactiver(tenantId: string) {
    setActionEnCours(tenantId);
    try {
      await requeteAdmin(`/api/admin/clients/${tenantId}/reactiver`, { method: "PUT" });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setActionEnCours(null);
    }
  }

  if (user?.role !== "admin") return null;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">
              Administration — Clients SaaS
            </h1>
            <p className="mt-1 text-sm text-textMuted">
              Crée et gère les comptes clients Mutatech. Le mot de passe est généré
              automatiquement et envoyé par email.
            </p>
          </div>
          <button
            onClick={() => { setFormOuvert(true); setSucces(null); setError(null); }}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Créer un compte client
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}
        {succes && (
          <p className="mb-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">
            ✓ {succes}
          </p>
        )}

        {/* Formulaire de création */}
        {formOuvert && (
          <form
            onSubmit={handleCreer}
            className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-display text-lg text-textPrimary">
              Nouveau compte client
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Nom entreprise *</span>
                <input
                  required
                  value={form.nom_entreprise}
                  onChange={(e) => setForm({ ...form, nom_entreprise: e.target.value })}
                  placeholder="ex: Cabinet Dupont"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Nom du contact</span>
                <input
                  value={form.nom_contact}
                  onChange={(e) => setForm({ ...form, nom_contact: e.target.value })}
                  placeholder="ex: Marie Dupont"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Email *</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contact@cabinet-dupont.fr"
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary placeholder:text-textMuted/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Produit assigné *</span>
                <select
                  value={form.produit}
                  onChange={(e) => setForm({ ...form, produit: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="crm">CRM Mutatech</option>
                  <option value="idel">Plateforme IDEL</option>
                  <option value="crm+idel">CRM + IDEL</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Couleur primaire</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.couleur_primaire}
                    onChange={(e) => setForm({ ...form, couleur_primaire: e.target.value })}
                    className="h-9 w-14 cursor-pointer rounded border border-line bg-surfaceAlt"
                  />
                  <span className="font-mono text-xs text-textMuted">{form.couleur_primaire}</span>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Couleur secondaire</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.couleur_secondaire}
                    onChange={(e) => setForm({ ...form, couleur_secondaire: e.target.value })}
                    className="h-9 w-14 cursor-pointer rounded border border-line bg-surfaceAlt"
                  />
                  <span className="font-mono text-xs text-textMuted">{form.couleur_secondaire}</span>
                </div>
              </label>
            </div>

            <div className="rounded-lg border border-teal/20 bg-teal/5 px-4 py-3 text-xs text-teal">
              ✓ Un mot de passe sécurisé sera généré automatiquement et envoyé par email au client avec ses identifiants de connexion.
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creation}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {creation ? "Création en cours…" : "Créer le compte et envoyer l'invitation"}
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

        {/* Liste des clients */}
        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : clients.length === 0 ? (
          <p className="text-sm text-textMuted">Aucun client SaaS pour l'instant.</p>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.tenant_id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                  client.actif ? "border-line bg-surface" : "border-line/50 bg-surfaceAlt opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-sm font-bold text-textPrimary">
                      {client.nom_entreprise}
                    </p>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${PRODUIT_COULEUR[client.produit] || "bg-surfaceAlt text-textMuted"}`}>
                      {PRODUIT_LABEL[client.produit] || client.produit}
                    </span>
                    {!client.actif && (
                      <span className="rounded bg-amber/10 px-2 py-0.5 text-[10px] font-medium text-amber">
                        Suspendu
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-textMuted">
                    {client.nom_contact && `${client.nom_contact} · `}
                    {client.email}
                  </p>
                  {client.cree_le && (
                    <p className="text-[11px] text-textMuted">
                      Créé le {new Date(client.cree_le).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {client.actif ? (
                    <button
                      onClick={() => handleSuspendre(client.tenant_id)}
                      disabled={actionEnCours === client.tenant_id}
                      className="rounded border border-amber/40 px-3 py-1.5 text-xs text-amber hover:bg-amber/10 disabled:opacity-50"
                    >
                      {actionEnCours === client.tenant_id ? "…" : "Suspendre"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactiver(client.tenant_id)}
                      disabled={actionEnCours === client.tenant_id}
                      className="rounded border border-teal/40 px-3 py-1.5 text-xs text-teal hover:bg-teal/10 disabled:opacity-50"
                    >
                      {actionEnCours === client.tenant_id ? "…" : "Réactiver"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
