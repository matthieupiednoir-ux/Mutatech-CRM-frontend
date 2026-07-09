"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import { getUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  adminListerOrganisations,
  adminCreerOrganisation,
  adminBasculerModule,
  adminAjouterUtilisateurOrg,
  adminListerUtilisateursOrg,
  adminModifierUtilisateurOrg,
} from "@/lib/api";
import {
  Organization,
  OrganizationType,
  ModuleType,
  OrgUserRole,
  OrgUser,
  MODULE_LABELS,
} from "@/lib/types";

const TOUS_LES_MODULES: ModuleType[] = [
  "idel_ngap",
  "tournees",
  "commandes_pharma",
  "ordonnances_vision",
  "agenda",
];

const TYPE_LABEL: Record<OrganizationType, string> = {
  idel_independant: "IDEL indépendante",
  psdm: "PSDM",
  autre: "Autre",
};

const ROLE_LABEL: Record<OrgUserRole, string> = {
  mutatech_admin: "Admin Mutatech",
  org_admin: "Admin organisation",
  gerant: "Gérant",
  idec: "IDEC",
  idel: "IDEL",
};

export default function OrganisationsAdminPage() {
  const router = useRouter();
  const user = getUser();

  const [organisations, setOrganisations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const [formOuvert, setFormOuvert] = useState(false);
  const [creation, setCreation] = useState(false);
  const [form, setForm] = useState({ nom: "", type: "psdm" as OrganizationType });

  const [moduleEnCours, setModuleEnCours] = useState<string | null>(null);

  const [orgUtilisateur, setOrgUtilisateur] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    email: "", password: "", role: "org_admin" as OrgUserRole, nom: "", prenom: "",
  });
  const [creationUser, setCreationUser] = useState(false);

  // Membres par organisation
  const [membres, setMembres] = useState<Record<string, OrgUser[]>>({});
  const [membresOuvert, setMembresOuvert] = useState<string | null>(null);
  const [chargementMembres, setChargementMembres] = useState<string | null>(null);
  const [actionMembreEnCours, setActionMembreEnCours] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "owner") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  function charger() {
    setLoading(true);
    adminListerOrganisations()
      .then(setOrganisations)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  function chargerMembres(orgId: string) {
    setChargementMembres(orgId);
    adminListerUtilisateursOrg(orgId)
      .then((liste) => setMembres((m) => ({ ...m, [orgId]: liste })))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement des membres"))
      .finally(() => setChargementMembres(null));
  }

  function toggleMembres(orgId: string) {
    const ouvrir = membresOuvert !== orgId;
    setMembresOuvert(ouvrir ? orgId : null);
    if (ouvrir && !membres[orgId]) {
      chargerMembres(orgId);
    }
  }

  async function handleCreer(e: React.FormEvent) {
    e.preventDefault();
    setCreation(true);
    setError(null);
    setSucces(null);
    try {
      await adminCreerOrganisation(form);
      setSucces(`Organisation "${form.nom}" créée.`);
      setFormOuvert(false);
      setForm({ nom: "", type: "psdm" });
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création.");
    } finally {
      setCreation(false);
    }
  }

  async function handleToggleModule(org: Organization, module: ModuleType) {
    const actif = !org.modules_actifs.includes(module);
    setModuleEnCours(`${org.id}-${module}`);
    setError(null);
    try {
      await adminBasculerModule(org.id, module, actif);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du changement de module.");
    } finally {
      setModuleEnCours(null);
    }
  }

  async function handleCreerUtilisateur(e: React.FormEvent, orgId: string) {
    e.preventDefault();
    setCreationUser(true);
    setError(null);
    setSucces(null);
    try {
      const cree = await adminAjouterUtilisateurOrg(orgId, userForm);
      setSucces(`Compte ${cree.email} (${cree.role}) créé.`);
      setOrgUtilisateur(null);
      setUserForm({ email: "", password: "", role: "org_admin", nom: "", prenom: "" });
      chargerMembres(orgId);
      setMembresOuvert(orgId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création du compte.");
    } finally {
      setCreationUser(false);
    }
  }

  async function handleChangerRole(orgId: string, membre: OrgUser, role: OrgUserRole) {
    setActionMembreEnCours(membre.id);
    setError(null);
    try {
      await adminModifierUtilisateurOrg(orgId, membre.id, { role });
      chargerMembres(orgId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du changement de rôle.");
    } finally {
      setActionMembreEnCours(null);
    }
  }

  async function handleToggleActif(orgId: string, membre: OrgUser) {
    setActionMembreEnCours(membre.id);
    setError(null);
    try {
      await adminModifierUtilisateurOrg(orgId, membre.id, { actif: !membre.actif });
      chargerMembres(orgId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors du changement de statut.");
    } finally {
      setActionMembreEnCours(null);
    }
  }

  async function handleReinitialiserMotDePasse(orgId: string, membre: OrgUser) {
    const nouveau = prompt(`Nouveau mot de passe pour ${membre.email} :`);
    if (!nouveau) return;
    setActionMembreEnCours(membre.id);
    setError(null);
    setSucces(null);
    try {
      await adminModifierUtilisateurOrg(orgId, membre.id, { password: nouveau });
      setSucces(`Mot de passe de ${membre.email} réinitialisé.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la réinitialisation.");
    } finally {
      setActionMembreEnCours(null);
    }
  }

  if (user?.role !== "admin" && user?.role !== "owner") return null;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-textPrimary">
              Administration — Organisations &amp; Modules
            </h1>
            <p className="mt-1 text-sm text-textMuted">
              Crée les organisations clientes (IDEL, PSDM...), active leurs
              modules et gère leurs membres. Seul un compte administrateur
              Mutatech peut activer un module ou modifier un rôle.
            </p>
          </div>
          <button
            onClick={() => { setFormOuvert(true); setSucces(null); setError(null); }}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Créer une organisation
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        {succes && (
          <div className="mb-4 rounded-lg bg-teal/10 px-4 py-3 text-sm text-teal">{succes}</div>
        )}

        {formOuvert && (
          <form
            onSubmit={handleCreer}
            className="mb-6 rounded-xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-textPrimary">Nom</label>
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex: JMS+ PSDM"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-textPrimary">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as OrganizationType })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="psdm">PSDM</option>
                  <option value="idel_independant">IDEL indépendante</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creation}
                className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {creation ? "Création..." : "Créer"}
              </button>
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-textMuted"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement...</p>
        ) : organisations.length === 0 ? (
          <p className="text-sm text-textMuted">Aucune organisation pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {organisations.map((org) => (
              <div key={org.id} className="rounded-xl border border-border bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-lg text-textPrimary">{org.nom}</h2>
                    <p className="text-xs text-textMuted">
                      {TYPE_LABEL[org.type]} · créée le{" "}
                      {new Date(org.date_creation).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleMembres(org.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-gray-50"
                    >
                      {membresOuvert === org.id ? "Masquer les membres" : "Voir les membres"}
                    </button>
                    <button
                      onClick={() => setOrgUtilisateur(orgUtilisateur === org.id ? null : org.id)}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-gray-50"
                    >
                      + Ajouter un utilisateur
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {TOUS_LES_MODULES.map((module) => {
                    const actif = org.modules_actifs.includes(module);
                    const enCours = moduleEnCours === `${org.id}-${module}`;
                    return (
                      <button
                        key={module}
                        onClick={() => handleToggleModule(org, module)}
                        disabled={enCours}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                          actif
                            ? "bg-teal/10 text-teal ring-1 ring-teal/30"
                            : "bg-gray-100 text-textMuted ring-1 ring-border"
                        }`}
                      >
                        {actif ? "✓ " : ""}
                        {MODULE_LABELS[module]}
                      </button>
                    );
                  })}
                </div>

                {/* Liste des membres */}
                {membresOuvert === org.id && (
                  <div className="mt-4 rounded-lg border border-border">
                    {chargementMembres === org.id ? (
                      <p className="p-4 text-sm text-textMuted">Chargement des membres...</p>
                    ) : !membres[org.id] || membres[org.id].length === 0 ? (
                      <p className="p-4 text-sm text-textMuted">Aucun membre pour cette organisation.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-gray-50 text-left text-xs text-textMuted">
                            <th className="px-3 py-2 font-medium">Nom</th>
                            <th className="px-3 py-2 font-medium">Email</th>
                            <th className="px-3 py-2 font-medium">Rôle</th>
                            <th className="px-3 py-2 font-medium">Statut</th>
                            <th className="px-3 py-2 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {membres[org.id].map((membre) => {
                            const enCours = actionMembreEnCours === membre.id;
                            return (
                              <tr key={membre.id} className="border-b border-border last:border-0">
                                <td className="px-3 py-2">{membre.prenom} {membre.nom}</td>
                                <td className="px-3 py-2 text-textMuted">{membre.email}</td>
                                <td className="px-3 py-2">
                                  <select
                                    value={membre.role}
                                    disabled={enCours}
                                    onChange={(e) =>
                                      handleChangerRole(org.id, membre, e.target.value as OrgUserRole)
                                    }
                                    className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50"
                                  >
                                    <option value="org_admin">{ROLE_LABEL.org_admin}</option>
                                    <option value="gerant">{ROLE_LABEL.gerant}</option>
                                    <option value="idec">{ROLE_LABEL.idec}</option>
                                    <option value="idel">{ROLE_LABEL.idel}</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => handleToggleActif(org.id, membre)}
                                    disabled={enCours}
                                    className={`rounded-full px-2 py-1 text-xs font-medium disabled:opacity-50 ${
                                      membre.actif
                                        ? "bg-teal/10 text-teal"
                                        : "bg-red-50 text-red-600"
                                    }`}
                                  >
                                    {membre.actif ? "Actif" : "Désactivé"}
                                  </button>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => handleReinitialiserMotDePasse(org.id, membre)}
                                    disabled={enCours}
                                    className="text-xs text-violet hover:underline disabled:opacity-50"
                                  >
                                    Réinitialiser mot de passe
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {orgUtilisateur === org.id && (
                  <form
                    onSubmit={(e) => handleCreerUtilisateur(e, org.id)}
                    className="mt-4 rounded-lg bg-gray-50 p-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        required
                        placeholder="Email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      />
                      <input
                        required
                        type="password"
                        placeholder="Mot de passe"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      />
                      <input
                        required
                        placeholder="Prénom"
                        value={userForm.prenom}
                        onChange={(e) => setUserForm({ ...userForm, prenom: e.target.value })}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      />
                      <input
                        required
                        placeholder="Nom"
                        value={userForm.nom}
                        onChange={(e) => setUserForm({ ...userForm, nom: e.target.value })}
                        className="rounded-lg border border-border px-3 py-2 text-sm"
                      />
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value as OrgUserRole })}
                        className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
                      >
                        <option value="org_admin">Admin organisation</option>
                        <option value="gerant">Gérant</option>
                        <option value="idec">IDEC</option>
                        <option value="idel">IDEL</option>
                      </select>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="submit"
                        disabled={creationUser}
                        className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
                      >
                        {creationUser ? "Création..." : "Créer le compte"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrgUtilisateur(null)}
                        className="rounded-lg border border-border px-4 py-2 text-sm text-textMuted"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
