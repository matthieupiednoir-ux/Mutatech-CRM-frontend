"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { ApiError } from "@/lib/api";
import { equipeLister, equipeAjouter, equipeModifier, equipeRetirer, MembreEquipe } from "@/lib/api";
import { getUser } from "@/lib/auth";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur (accès complet)",
  support: "Support (clients/devis/factures)",
};

export default function EquipePage() {
  const [membres, setMembres] = useState<MembreEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<"admin" | "support">("support");
  const [ajout, setAjout] = useState(false);

  // Edition du nom d'un membre existant -- absent jusqu'ici : le role et
  // le statut actif etaient deja modifiables inline, mais pas le nom une
  // fois le membre cree.
  const [editionNomId, setEditionNomId] = useState<string | null>(null);
  const [editionNomValeur, setEditionNomValeur] = useState("");
  const [enregistrementNom, setEnregistrementNom] = useState(false);

  const utilisateurConnecte = getUser();

  function charger() {
    setLoading(true);
    equipeLister()
      .then(setMembres)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  async function handleAjouter(e: React.FormEvent) {
    e.preventDefault();
    setAjout(true);
    setError(null);
    setSucces(null);
    try {
      await equipeAjouter({ email: email.trim(), nom: nom.trim() || undefined, role });
      setSucces(`${email} a été ajouté à l'équipe.`);
      setEmail("");
      setNom("");
      setRole("support");
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de l'ajout.");
    } finally {
      setAjout(false);
    }
  }

  async function handleChangerRole(m: MembreEquipe, nouveauRole: string) {
    setError(null);
    try {
      await equipeModifier(m.id, { role: nouveauRole });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du changement de rôle.");
    }
  }

  async function handleToggleActif(m: MembreEquipe) {
    setError(null);
    try {
      await equipeModifier(m.id, { actif: !m.actif });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  function commencerEditionNom(m: MembreEquipe) {
    setEditionNomId(m.id);
    setEditionNomValeur(m.nom || "");
    setError(null);
  }

  function annulerEditionNom() {
    setEditionNomId(null);
    setEditionNomValeur("");
  }

  async function handleEnregistrerNom(m: MembreEquipe) {
    setEnregistrementNom(true);
    setError(null);
    try {
      await equipeModifier(m.id, { nom: editionNomValeur.trim() || undefined });
      setEditionNomId(null);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du renommage.");
    } finally {
      setEnregistrementNom(false);
    }
  }

  async function handleRetirer(m: MembreEquipe) {
    if (!confirm(`Retirer ${m.email} de l'équipe Mutatech ?`)) return;
    setError(null);
    try {
      await equipeRetirer(m.id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du retrait.");
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">Équipe Mutatech</h1>
            <p className="mt-1 text-sm text-textMuted">
              Gère qui, chez Mutatech, a accès au panneau d'administration — création de comptes clients, organisations, modules.
            </p>
          </div>
          <button
            onClick={() => setFormOuvert(true)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--accent)" }}
          >
            + Ajouter un membre
          </button>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}
        {succes && <p className="mb-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">{succes}</p>}

        {formOuvert && (
          <form onSubmit={handleAjouter} className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-line bg-surface p-5 sm:grid-cols-2">
            <input
              required type="email" placeholder="email@mutatech.fr"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50 sm:col-span-2"
            />
            <input
              placeholder="Nom (optionnel)" value={nom} onChange={(e) => setNom(e.target.value)}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/50"
            />
            <select
              value={role} onChange={(e) => setRole(e.target.value as "admin" | "support")}
              className="rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary"
            >
              <option value="support">Support (clients/devis/factures)</option>
              <option value="admin">Administrateur (accès complet)</option>
            </select>
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" disabled={ajout} className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}>
                {ajout ? "..." : "Ajouter"}
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
            Personne n'a encore été ajouté ici — ton propre accès (compte historique) reste actif en permanence, indépendamment de cette liste.
          </p>
        ) : (
          <div className="space-y-2">
            {membres.map((m) => {
              const estMoi = m.email === utilisateurConnecte?.email;
              const enEdition = editionNomId === m.id;
              return (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                  <div className="min-w-0 flex-1">
                    {enEdition ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editionNomValeur}
                          onChange={(e) => setEditionNomValeur(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleEnregistrerNom(m)}
                          placeholder="Nom"
                          className="rounded border border-line bg-surfaceAlt px-2 py-1 text-sm text-textPrimary"
                        />
                        <button
                          onClick={() => handleEnregistrerNom(m)}
                          disabled={enregistrementNom}
                          className="text-xs text-teal disabled:opacity-50"
                        >
                          ✓
                        </button>
                        <button onClick={annulerEditionNom} className="text-xs text-textMuted">✕</button>
                      </div>
                    ) : (
                      <p className="text-sm text-textPrimary">
                        {m.nom || m.email} {estMoi && <span className="text-xs text-textMuted">(toi)</span>}
                        <button
                          onClick={() => commencerEditionNom(m)}
                          className="ml-2 text-xs text-textMuted hover:text-textPrimary"
                        >
                          Renommer
                        </button>
                      </p>
                    )}
                    <p className="text-xs text-textMuted">{m.email}{!m.actif && " · inactif"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={(e) => handleChangerRole(m, e.target.value)}
                      className="rounded-lg border border-line bg-surfaceAlt px-2.5 py-1.5 text-xs text-textPrimary"
                    >
                      {Object.entries(ROLE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
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
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
