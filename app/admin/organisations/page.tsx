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
} from "@/lib/api";
import {
  Organization,
  OrganizationType,
  ModuleType,
  OrgUserRole,
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

  useEffect(() => {
    if (user && user.role !== "admin") {
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
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de création du compte.");
    } finally {
      setCreationUser(false);
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
              Administration — Organisations &amp; Modules
            </h1>
            <p className="mt-1 text-sm text-textMuted">
              Crée les organisations clientes (IDEL, PSDM...) et active les
              modules dont elles disposent. Seul un compte administrateur
              Mutatech peut activer un module.
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
                  <button
                    onClick={() => setOrgUtilisateur(orgUtilisateur === org.id ? null : org.id)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-textPrimary hover:bg-gray-50"
                  >
                    + Ajouter un utilisateur
                  </button>
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
