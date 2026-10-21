"use client";

import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";
import {
  ApiError,
  ElearningAbonnementAdmin,
  ElearningAccesMembre,
  ElearningModule,
  ElearningStatut,
  elearningAccesLister,
  elearningAccesModifier,
  elearningAdminAbonnements,
  elearningAdminModifier,
  elearningContenuModule,
  elearningModules,
  elearningPortail,
  elearningProgression,
  elearningStatut,
  elearningSouscrire,
} from "@/lib/api";

const STATUT_LABEL: Record<string, string> = {
  inactif: "Non souscrit",
  en_attente_paiement: "Paiement en attente",
  actif: "Actif",
  impaye: "Impayé",
  resilie: "Résilié",
};

// Le backend renvoie souvent {"detail": "..."} : on n'affiche que le message.
function messageErreur(e: unknown, defaut: string): string {
  if (!(e instanceof ApiError)) return defaut;
  try {
    const corps = JSON.parse(e.message);
    if (typeof corps?.detail === "string") return corps.detail;
  } catch {
    /* texte brut */
  }
  return e.message || defaut;
}

function dateFr(iso?: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("fr-FR") : "";
}

export default function FormationPage() {
  const [statut, setStatut] = useState<ElearningStatut | null>(null);
  const [modules, setModules] = useState<ElearningModule[]>([]);
  const [membres, setMembres] = useState<ElearningAccesMembre[]>([]);
  const [abonnementsAdmin, setAbonnementsAdmin] = useState<ElearningAbonnementAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [accepte, setAccepte] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const [moduleOuvert, setModuleOuvert] = useState<number | null>(null);
  const [contenu, setContenu] = useState<string>("");
  const [chargementContenu, setChargementContenu] = useState(false);

  async function charger() {
    setError(null);
    try {
      const s = await elearningStatut();
      setStatut(s);
      if (s.a_acces) setModules(await elearningModules());
      if (s.est_proprietaire && s.abonnement_statut === "actif") setMembres(await elearningAccesLister());
      if (s.est_admin) setAbonnementsAdmin(await elearningAdminAbonnements());
      return s;
    } catch (e) {
      setError(messageErreur(e, "Erreur de chargement."));
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Retour de Stripe : le webhook peut arriver quelques secondes apres la redirection.
    const paiement = new URLSearchParams(window.location.search).get("paiement");
    if (paiement === "annule") setInfo("Paiement annulé. Aucun montant n'a été prélevé.");
    let essais = 0;
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    const verifier = async () => {
      const s = await charger();
      if (paiement === "ok" && s && !s.a_acces && essais < 10) {
        setInfo("Paiement reçu, activation de l'accès en cours…");
        essais += 1;
        minuteur = setTimeout(verifier, 3000);
      } else if (paiement === "ok" && s?.a_acces) {
        setInfo("Abonnement activé. Bonne formation !");
      }
    };
    verifier();
    return () => clearTimeout(minuteur);
  }, []);

  async function handleSouscrire() {
    setEnvoi(true);
    setError(null);
    try {
      const { url } = await elearningSouscrire(accepte);
      window.location.href = url;
    } catch (e) {
      setError(messageErreur(e, "Impossible de lancer le paiement."));
      setEnvoi(false);
    }
  }

  async function handlePortail() {
    setError(null);
    try {
      const { url } = await elearningPortail();
      window.location.href = url;
    } catch (e) {
      setError(messageErreur(e, "Portail de facturation indisponible."));
    }
  }

  async function handleAcces(m: ElearningAccesMembre) {
    setError(null);
    try {
      const maj = await elearningAccesModifier(m.user_id, !m.a_acces);
      setMembres((liste) => liste.map((x) => (x.user_id === maj.user_id ? maj : x)));
    } catch (e) {
      setError(messageErreur(e, "Erreur lors de la modification de l'accès."));
    }
  }

  async function handleAdmin(tenantId: string, nouveau: "actif" | "resilie") {
    setError(null);
    try {
      await elearningAdminModifier(tenantId, nouveau);
      setAbonnementsAdmin(await elearningAdminAbonnements());
    } catch (e) {
      setError(messageErreur(e, "Erreur lors de la mise à jour de l'abonnement."));
    }
  }

  async function ouvrirModule(num: number) {
    setModuleOuvert(num);
    setChargementContenu(true);
    setContenu("");
    setError(null);
    try {
      setContenu(await elearningContenuModule(num));
    } catch (e) {
      setError(messageErreur(e, "Module indisponible."));
      setModuleOuvert(null);
    } finally {
      setChargementContenu(false);
    }
    window.scrollTo({ top: 0 });
  }

  async function basculerTermine(m: ElearningModule) {
    try {
      const r = await elearningProgression(m.num, !m.termine);
      setModules((liste) => liste.map((x) => (x.num === m.num ? { ...x, termine: r.termine } : x)));
    } catch (e) {
      setError(messageErreur(e, "Erreur lors de l'enregistrement de la progression."));
    }
  }

  const termines = modules.filter((m) => m.termine).length;
  const courant = modules.find((m) => m.num === moduleOuvert);
  const indexCourant = courant ? modules.indexOf(courant) : -1;

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-textPrimary">Formation IA</h1>
        <p className="mt-1 text-sm text-textMuted">
          10 modules pour intégrer l'intelligence artificielle dans une petite entreprise, avec des exercices pratiques.
        </p>

        {error && <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {info && <div className="mt-4 rounded border border-line bg-surfaceAlt p-3 text-sm text-textPrimary">{info}</div>}
        {loading && <p className="mt-6 text-sm text-textMuted">Chargement…</p>}

        {statut && !loading && (
          <>
            {/* ── Lecteur de module ── */}
            {statut.a_acces && courant && (
              <section className="mt-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <button onClick={() => setModuleOuvert(null)} className="rounded border border-line px-3 py-1.5 text-sm text-textPrimary hover:bg-surfaceAlt">
                    ← Tous les modules
                  </button>
                  <span className="text-sm text-textMuted">Module {courant.num} · {courant.titre}</span>
                  <div className="ml-auto flex gap-2">
                    <button
                      disabled={indexCourant <= 0}
                      onClick={() => ouvrirModule(modules[indexCourant - 1].num)}
                      className="rounded border border-line px-3 py-1.5 text-sm text-textPrimary disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => basculerTermine(courant)}
                      className={`rounded px-3 py-1.5 text-sm text-white ${courant.termine ? "bg-teal" : "bg-violet"}`}
                    >
                      {courant.termine ? "✓ Terminé" : "Marquer comme terminé"}
                    </button>
                    <button
                      disabled={indexCourant >= modules.length - 1}
                      onClick={() => ouvrirModule(modules[indexCourant + 1].num)}
                      className="rounded border border-line px-3 py-1.5 text-sm text-textPrimary disabled:opacity-40"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
                {chargementContenu ? (
                  <p className="text-sm text-textMuted">Chargement du module…</p>
                ) : (
                  // sandbox vide : aucun script ni formulaire ne peut s'executer dans le contenu.
                  <iframe
                    title={`Module ${courant.num}`}
                    sandbox=""
                    srcDoc={contenu}
                    className="h-[75vh] w-full rounded border border-line bg-white"
                  />
                )}
              </section>
            )}

            {/* ── Catalogue ── */}
            {statut.a_acces && !courant && (
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-medium text-textPrimary">Vos modules</h2>
                  <span className="text-sm text-textMuted">{termines} / {modules.length} terminés</span>
                </div>
                <div className="mb-4 h-2 w-full overflow-hidden rounded bg-surfaceAlt">
                  <div className="h-full bg-teal" style={{ width: `${modules.length ? (termines / modules.length) * 100 : 0}%` }} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {modules.map((m) => (
                    <button
                      key={m.num}
                      onClick={() => ouvrirModule(m.num)}
                      className="rounded-lg border border-line bg-surface p-4 text-left hover:bg-surfaceAlt"
                    >
                      <div className="flex items-center justify-between text-xs text-textMuted">
                        <span>Module {m.num} · {m.duree_heures} h</span>
                        {m.termine && <span className="text-teal">✓ Terminé</span>}
                      </div>
                      <div className="mt-1 font-medium text-textPrimary">{m.titre}</div>
                      <div className="mt-1 text-sm text-textMuted">{m.sous_titre}</div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Pas d'acces ── */}
            {!statut.a_acces && (
              <section className="mt-6 rounded-lg border border-line bg-surface p-5">
                <div className="text-sm text-textMuted">
                  Abonnement de votre société : <span className="font-medium text-textPrimary">{STATUT_LABEL[statut.abonnement_statut] ?? statut.abonnement_statut}</span>
                </div>

                {statut.est_proprietaire ? (
                  statut.abonnement_statut === "en_attente_paiement" ? (
                    <p className="mt-3 text-sm text-textPrimary">
                      Un paiement a été lancé et n'est pas encore confirmé. Vous pouvez le relancer ci-dessous si besoin.
                    </p>
                  ) : null
                ) : (
                  <p className="mt-3 text-sm text-textPrimary">
                    L'accès à la formation est ouvert par le responsable de votre société. Demandez-lui de souscrire ou de vous donner l'accès.
                  </p>
                )}

                {statut.est_proprietaire && statut.abonnement_statut !== "actif" && (
                  <div className="mt-4 space-y-3">
                    {statut.abonnement_statut === "impaye" && (
                      <p className="text-sm text-amber">Le dernier paiement a échoué : l'accès est suspendu jusqu'à régularisation.</p>
                    )}
                    <p className="text-sm text-textPrimary">
                      En tant que responsable, vous pouvez souscrire l'abonnement pour votre société puis choisir quels membres de l'équipe y ont accès.
                    </p>
                    <label className="flex items-start gap-2 text-sm text-textPrimary">
                      <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-0.5" />
                      <span>J'accepte, au nom de ma société, les conditions de l'abonnement e-learning et son paiement récurrent.</span>
                    </label>
                    {statut.paiement_en_ligne_disponible ? (
                      <button
                        disabled={!accepte || envoi}
                        onClick={handleSouscrire}
                        className="rounded bg-violet px-4 py-2 text-sm text-white disabled:opacity-40"
                      >
                        {envoi ? "Redirection vers le paiement…" : "Souscrire et payer"}
                      </button>
                    ) : (
                      <p className="text-sm text-textMuted">
                        Le paiement en ligne n'est pas encore ouvert. Contactez Mutatech pour activer l'abonnement.
                      </p>
                    )}
                    {(statut.abonnement_statut === "impaye") && (
                      <button onClick={handlePortail} className="ml-2 rounded border border-line px-4 py-2 text-sm text-textPrimary">
                        Mettre à jour le moyen de paiement
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* ── Gestion par le responsable ── */}
            {statut.est_proprietaire && statut.abonnement_statut === "actif" && !courant && (
              <section className="mt-8 rounded-lg border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-medium text-textPrimary">Accès de l'équipe</h2>
                  <button onClick={handlePortail} className="rounded border border-line px-3 py-1.5 text-sm text-textPrimary hover:bg-surfaceAlt">
                    Gérer l'abonnement et les factures
                  </button>
                </div>
                {statut.periode_fin && <p className="mt-1 text-xs text-textMuted">Période en cours jusqu'au {dateFr(statut.periode_fin)}</p>}
                <ul className="mt-4 divide-y divide-line">
                  {membres.map((m) => (
                    <li key={m.user_id} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-textPrimary">
                        {m.nom || m.email}
                        {m.nom && <span className="ml-2 text-textMuted">{m.email}</span>}
                      </span>
                      {m.role === "owner" || m.role === "admin" ? (
                        <span className="text-xs text-textMuted">Accès inclus</span>
                      ) : (
                        <label className="flex items-center gap-2 text-textMuted">
                          <input type="checkbox" checked={m.a_acces} disabled={!m.actif} onChange={() => handleAcces(m)} />
                          Accès
                        </label>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ── Administration Mutatech ── */}
            {statut.est_admin && !courant && (
              <section className="mt-8 rounded-lg border border-line bg-surface p-5">
                <h2 className="text-lg font-medium text-textPrimary">Abonnements des sociétés (admin Mutatech)</h2>
                <ul className="mt-3 divide-y divide-line">
                  {abonnementsAdmin.map((a) => (
                    <li key={a.tenant_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="text-textPrimary">
                        {a.nom}
                        <span className="ml-2 text-textMuted">
                          {STATUT_LABEL[a.statut] ?? a.statut}
                          {a.mode ? ` · ${a.mode}` : ""}
                          {a.periode_fin ? ` · jusqu'au ${dateFr(a.periode_fin)}` : ""}
                        </span>
                      </span>
                      {a.statut === "actif" ? (
                        <button onClick={() => handleAdmin(a.tenant_id, "resilie")} className="rounded border border-line px-3 py-1 text-xs text-textPrimary">
                          Résilier
                        </button>
                      ) : (
                        <button onClick={() => handleAdmin(a.tenant_id, "actif")} className="rounded bg-violet px-3 py-1 text-xs text-white">
                          Activer manuellement
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
