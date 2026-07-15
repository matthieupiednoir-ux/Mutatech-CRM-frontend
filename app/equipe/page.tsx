"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { membresLister, membresInviter, membresModifier, membresRetirer, MembreEquipeClient } from "@/lib/api";
import { getUser } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  owner: "Propriétaire",
  member: "Membre",
  admin: "Administrateur Mutatech",
};

export default function EquipeClientPage() {
  const [membres, setMembres] = useState<MembreEquipeClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [invitation, setInvitation] = useState(false);
  const [dernierMotDePasse, setDernierMotDePasse] = useState<{ email: string; mdp: string } | null>(null);

  const utilisateurConnecte = getUser();

  function charger() {
    setLoading(true);
    membresLister()
      .then(setMembres)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleInviter(e: React.FormEvent) {
    e.preventDefault();
    setInvitation(true);
    setError(null);
    setDernierMotDePasse(null);
    try {
      const resultat = await membresInviter({ email: email.trim(), nom: nom.trim() || undefined });
      setDernierMotDePasse({ email: resultat.email, mdp: resultat.mot_de_passe_temporaire });
      setEmail("");
      setNom("");
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'invitation.");
    } finally {
      setInvitation(false);
    }
  }

  async function handleToggleActif(m: MembreEquipeClient) {
    setError(null);
    try {
      await membresModifier(m.id, { actif: !m.actif });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  async function handleRetirer(m: MembreEquipeClient) {
    if (!confirm(`Retirer ${m.email} de l'équipe ?`)) return;
    setError(null);
    try {
      await membresRetirer(m.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du retrait.");
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Mon équipe</h1>
            <p className="mt-1 text-sm text-textMuted">
              Invite tes collègues à rejoindre ton CRM — ils auront accès aux mêmes données que toi.
            </p>
          </div>
          <button
            onClick={() => setFormOuvert(true)}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Inviter
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {dernierMotDePasse && (
          <div className="mb-6 rounded-xl border border-teal/40 bg-teal/10 p-5">
            <p className="mb-2 text-sm font-medium text-teal">✓ Invitation envoyée à {dernierMotDePasse.email}</p>
            <p className="text-xs text-textMuted">
              Si Google n'est pas connecté (ou en cas de souci d'envoi), transmets-lui directement ce mot de passe temporaire :
            </p>
            <code className="mt-1 block rounded bg-surfaceAlt px-3 py-2 text-sm text-textPrimary">{dernierMotDePasse.mdp}</code>
            <button onClick={() => setDernierMotDePasse(null)} className="mt-2 text-xs text-teal hover:underline">Masquer</button>
          </div>
        )}

        {formOuvert && (
          <form onSubmit={handleInviter} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <input
              required type="email" placeholder="email@entreprise.fr"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2"
            />
            <input
              placeholder="Nom (optionnel)" value={nom} onChange={(e) => setNom(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2"
            />
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={invitation} className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {invitation ? "..." : "Envoyer l'invitation"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)} className="rounded-lg border border-line px-4 py-2 text-sm text-textMuted">
                Annuler
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement...</p>
        ) : membres.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-surface/50 p-6 text-center text-sm text-textMuted">
            Personne d'autre pour l'instant.
          </p>
        ) : (
          <div className="space-y-2">
            {membres.map((m) => {
              const estMoi = m.email === utilisateurConnecte?.email;
              const estProprietaire = m.role === "owner" || m.role === "admin";
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                  <div>
                    <p className="text-sm text-textPrimary">
                      {m.nom || m.email} {estMoi && <span className="text-xs text-textMuted">(toi)</span>}
                    </p>
                    <p className="text-xs text-textMuted">
                      {m.email} · {ROLE_LABEL[m.role] || m.role}{!m.actif && " · inactif"}
                    </p>
                  </div>
                  {!estProprietaire && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActif(m)}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-textMuted hover:text-textPrimary"
                      >
                        {m.actif ? "Désactiver" : "Réactiver"}
                      </button>
                      <button
                        onClick={() => handleRetirer(m)}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-textMuted hover:border-amber/40 hover:text-amber"
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
