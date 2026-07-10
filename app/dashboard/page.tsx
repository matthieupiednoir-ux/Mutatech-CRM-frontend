"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import Kpi3DRing from "@/components/Kpi3DRing";
import ChatAgentPanel from "@/components/ChatAgentPanel";
import {
  getClients, getDevisListe, getFacturesListe,
  getTaches, getProspects, getEcheances,
  relancerFacture, genererFactureMois, calculerTotaux, ApiError,
} from "@/lib/api";
import {
  Client, Devis, Facture, Tache, Prospect,
  EcheanceFacture, AbonnementAFacturer, RecapEcheances,
} from "@/lib/types";

const COULEUR: Record<string, string> = {
  brouillon:"#77778A", envoye:"#F0B429", accepte:"#5fe0c0", refuse:"#EF4444",
  envoyee:"#F0B429", payee:"#5fe0c0", a_contacter:"#77778A", contacte:"#a89eff",
  rdv_planifie:"#F0B429", converti:"#5fe0c0", perdu:"#EF4444",
  todo:"#77778A", prog:"#F0B429", done:"#5fe0c0",
};
const LABEL: Record<string, string> = {
  brouillon:"Brouillon", envoye:"Envoyé", accepte:"Accepté", refuse:"Refusé",
  envoyee:"Envoyée", payee:"Payée", a_contacter:"À contacter", contacte:"Contacté",
  rdv_planifie:"RDV planifié", converti:"Converti", perdu:"Perdu",
  todo:"À faire", prog:"En cours", done:"Fait",
};

function safe<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function repartir(items: string[]): { statut: string; count: number }[] {
  const map: Record<string, number> = {};
  safe<string>(items).forEach((s) => { map[s] = (map[s] || 0) + 1; });
  return Object.entries(map).map(([statut, count]) => ({ statut, count })).sort((a, b) => b.count - a.count);
}

type Taille = "small" | "normal" | "large";

const ORDRE_DEFAUT = [
  "kpi-clients","kpi-ca-signe","kpi-en-attente","kpi-facture","kpi-taches","kpi-prospects",
  "agent-ia","echeances","apercu-devis","apercu-prospects","apercu-factures","apercu-taches",
  "graph-devis","graph-prospects","graph-factures","graph-taches",
];
const TAILLE_DEFAUT: Record<string, Taille> = {
  "kpi-clients":"small","kpi-ca-signe":"small","kpi-en-attente":"small",
  "kpi-facture":"small","kpi-taches":"small","kpi-prospects":"small",
  "agent-ia":"large",echeances:"large","apercu-devis":"normal","apercu-prospects":"normal",
  "apercu-factures":"normal","apercu-taches":"normal",
  "graph-devis":"normal","graph-prospects":"normal","graph-factures":"normal","graph-taches":"normal",
};
const TITRES: Record<string, string> = {
  "kpi-clients":"KPI · Clients","kpi-ca-signe":"KPI · CA signé",
  "kpi-en-attente":"KPI · En attente","kpi-facture":"KPI · Facturé",
  "kpi-taches":"KPI · Tâches","kpi-prospects":"KPI · Prospects",
  "agent-ia":"Agent IA",echeances:"Échéances","apercu-devis":"Aperçu Devis","apercu-prospects":"Aperçu Prospects",
  "apercu-factures":"Aperçu Factures","apercu-taches":"Aperçu Tâches",
  "graph-devis":"Graph Devis","graph-prospects":"Graph Prospects",
  "graph-factures":"Graph Factures","graph-taches":"Graph Tâches",
};
const SPAN: Record<Taille, string> = {
  small:"col-span-6 sm:col-span-3 lg:col-span-2",
  normal:"col-span-6 lg:col-span-3",
  large:"col-span-6",
};
const KEY = "mutatech-dashboard-v3";

function KpiCard({ label, valeur, sousLabel, couleur="text-textPrimary" }: {
  label:string; valeur:string; sousLabel?:string; couleur?:string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-textMuted">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${couleur}`}>{valeur}</p>
      {sousLabel && <p className="mt-0.5 text-[11px] text-textMuted">{sousLabel}</p>}
    </div>
  );
}

function AperculCard({ titre, lien, items, modePerso }: {
  titre:string; lien:string;
  items:{texte:string;sousTexte?:string;couleur?:string}[];
  modePerso:boolean;
}) {
  const list = safe<{texte:string;sousTexte?:string;couleur?:string}>(items);
  const inner = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm text-textPrimary">{titre}</h3>
        {!modePerso && <span className="text-xs text-violet">Voir tout →</span>}
      </div>
      {list.length === 0
        ? <p className="text-xs text-textMuted">Rien pour l'instant.</p>
        : <div className="space-y-1.5">
            {list.map((it, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-surfaceAlt px-2.5 py-1.5">
                <span className="truncate text-xs text-textPrimary">{it.texte}</span>
                {it.sousTexte && <span className="ml-2 shrink-0 text-[11px]" style={{color:it.couleur||"#77778A"}}>{it.sousTexte}</span>}
              </div>
            ))}
          </div>
      }
    </>
  );
  if (modePerso) return <div>{inner}</div>;
  return <Link href={lien} className="-m-4 block rounded-xl p-4 transition hover:bg-surfaceAlt/40">{inner}</Link>;
}

function BarChart({ titre, donnees }: { titre:string; donnees:{statut:string;count:number}[] }) {
  const items = safe<{statut:string;count:number}>(donnees);
  const total = items.length === 0 ? 0 : items.reduce((s, d) => s + (d.count || 0), 0);
  return (
    <div>
      <h3 className="mb-3 font-display text-sm text-textPrimary">{titre}</h3>
      {total === 0
        ? <p className="text-xs text-textMuted">Aucune donnée.</p>
        : <div className="space-y-2">
            {items.map((d) => (
              <div key={d.statut} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-[11px] text-textMuted">{LABEL[d.statut]||d.statut}</span>
                <div className="h-5 flex-1 overflow-hidden rounded bg-surfaceAlt">
                  <div className="h-full rounded" style={{width:`${Math.max(((d.count||0)/total)*100,4)}%`,background:COULEUR[d.statut]||"#77778A"}} />
                </div>
                <span className="w-6 text-right text-[11px] text-textMuted">{d.count}</span>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

function Echeances({ modePerso }: { modePerso:boolean }) {
  const [recap, setRecap] = useState<RecapEcheances | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string|null>(null);

  useEffect(() => {
    getEcheances().then((d) => setRecap(d ?? null)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const enRetard = safe<EcheanceFacture>(recap?.en_retard);
  const aVenir = safe<EcheanceFacture>(recap?.a_venir);
  const abo = safe<AbonnementAFacturer>(recap?.abonnements_a_facturer);

  async function relancer(id: string) {
    setAction(id);
    try { await relancerFacture(id); } catch {}
    finally { setAction(null); }
  }
  async function generer(id: string) {
    setAction(id);
    try { await genererFactureMois(id); } catch {}
    finally { setAction(null); }
  }

  return (
    <div>
      <h3 className="mb-3 font-display text-sm text-textPrimary">Échéances &amp; Relances</h3>
      {loading ? <p className="text-xs text-textMuted">Chargement…</p>
      : (enRetard.length + aVenir.length + abo.length) === 0
      ? <p className="text-xs text-textMuted">Tout est à jour.</p>
      : <div className="grid gap-4 sm:grid-cols-3">
          {enRetard.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-amber">En retard</p>
              <div className="space-y-1.5">
                {enRetard.map((f: EcheanceFacture) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg bg-amber/10 px-2.5 py-1.5">
                    <span className="truncate text-xs text-textPrimary">{f.numero} — {f.client_nom} <span className="text-textMuted">({f.jours}j · {(f.montant_ttc??0).toFixed(0)}€)</span></span>
                    {!modePerso && <button onClick={()=>relancer(f.id)} disabled={action===f.id} className="ml-2 rounded bg-amber px-2 py-0.5 text-[10px] text-ink disabled:opacity-50">{action===f.id?"…":"Relancer"}</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {aVenir.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-textMuted">À venir</p>
              <div className="space-y-1.5">
                {aVenir.map((f: EcheanceFacture) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg bg-surfaceAlt px-2.5 py-1.5">
                    <span className="truncate text-xs text-textPrimary">{f.numero} — {f.client_nom}</span>
                    <span className="ml-2 text-[11px] text-textMuted">{-(f.jours??0)}j · {(f.montant_ttc??0).toFixed(0)}€</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {abo.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-violet">Abonnements</p>
              <div className="space-y-1.5">
                {abo.map((a: AbonnementAFacturer) => (
                  <div key={a.devis_id} className="flex items-center justify-between rounded-lg bg-violet/10 px-2.5 py-1.5">
                    <span className="truncate text-xs text-textPrimary">{a.devis_numero} — {a.client_nom}</span>
                    {!modePerso && <button onClick={()=>generer(a.devis_id)} disabled={action===a.devis_id} className="ml-2 rounded bg-violet px-2 py-0.5 text-[10px] text-white disabled:opacity-50">{action===a.devis_id?"…":"Générer"}</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      }
    </div>
  );
}

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [ordre, setOrdre] = useState<string[]>(ORDRE_DEFAUT);
  const [masquees, setMasquees] = useState<string[]>([]);
  const [tailles, setTailles] = useState<Record<string,Taille>>(TAILLE_DEFAUT);
  const [modePerso, setModePerso] = useState(false);

  useEffect(() => {
    try {
      const brut = localStorage.getItem(KEY);
      if (brut) {
        const p = JSON.parse(brut);
        if (Array.isArray(p.ordre)) setOrdre([
          ...p.ordre.filter((id: string) => ORDRE_DEFAUT.includes(id)),
          ...ORDRE_DEFAUT.filter((id) => !p.ordre.includes(id)),
        ]);
        if (Array.isArray(p.masquees)) setMasquees(p.masquees);
        if (p.tailles && typeof p.tailles === "object") setTailles({...TAILLE_DEFAUT,...p.tailles});
      }
    } catch {}
  }, []);

  function save(o: string[], m: string[], t: Record<string,Taille>) {
    setOrdre(o); setMasquees(m); setTailles(t);
    try { localStorage.setItem(KEY, JSON.stringify({ordre:o,masquees:m,tailles:t})); } catch {}
  }

  useEffect(() => {
    Promise.all([getClients(),getDevisListe(),getFacturesListe(),getTaches(),getProspects()])
      .then(([c,d,f,t,p]) => {
        setClients(safe<Client>(c));
        setDevis(safe<Devis>(d));
        setFactures(safe<Facture>(f));
        setTaches(safe<Tache>(t));
        setProspects(safe<Prospect>(p));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  // Toutes les données sont garanties tableaux grâce à safe()
  const D = safe<Devis>(devis);
  const F = safe<Facture>(factures);
  const T = safe<Tache>(taches);
  const P = safe<Prospect>(prospects);
  const C = safe<Client>(clients);

  // KPIs — avec fallback 0 à chaque étape
  const caSigne = D.filter(d=>d.statut==="accepte").reduce((s,d)=>{
    try { return s+(calculerTotaux(d.lignes,d.taux_tva??0).totalHt??0); } catch { return s; }
  },0);
  const caEnAttente = D.filter(d=>d.statut==="envoye").reduce((s,d)=>{
    try { return s+(calculerTotaux(d.lignes,d.taux_tva??0).totalHt??0); } catch { return s; }
  },0);
  const caFacture = F.filter(f=>f.statut!=="brouillon").reduce((s,f)=>{
    try { return s+(calculerTotaux(f.lignes,f.taux_tva??0).totalHt??0); } catch { return s; }
  },0);
  const tDone = T.filter(t=>t.statut==="done").length;
  const pctT = T.length>0?Math.round((tDone/T.length)*100):0;
  const pActifs = P.filter(p=>p.statut!=="converti"&&p.statut!=="perdu").length;
  const pConv = P.filter(p=>p.statut==="converti").length;
  const pctConv = P.length>0?Math.round((pConv/P.length)*100):0;

  const apD = D.slice(0,3).map(d=>({texte:`${d.numero} — ${d.client?.nom||"—"}`,sousTexte:LABEL[d.statut]||d.statut,couleur:COULEUR[d.statut]}));
  const apF = F.slice(0,3).map(f=>({texte:`${f.numero} — ${f.client?.nom||"—"}`,sousTexte:LABEL[f.statut]||f.statut,couleur:COULEUR[f.statut]}));
  const apP = P.slice(0,3).map(p=>({texte:p.nom,sousTexte:LABEL[p.statut]||p.statut,couleur:COULEUR[p.statut]}));
  const apT = T.slice(0,3).map(t=>({texte:t.titre,sousTexte:LABEL[t.statut]||t.statut,couleur:COULEUR[t.statut]}));

  // Donnees du meme calcul, reformatees pour l'anneau 3D -- aucun nouveau
  // fetch, juste une autre presentation des KPI deja charges plus haut.
  const kpiRingItems = [
    { label: "Clients", valeur: String(C.length), couleur: "#6C63FF" },
    { label: "CA signé", valeur: `${caSigne.toFixed(0)} €`, couleur: "#00D4AA" },
    { label: "En attente", valeur: `${caEnAttente.toFixed(0)} €`, couleur: "#F5A623" },
    { label: "Facturé", valeur: `${caFacture.toFixed(0)} €`, couleur: "#6C63FF" },
    { label: "Tâches", valeur: `${pctT}%`, couleur: "#00D4AA" },
    { label: "Prospects actifs", valeur: String(pActifs), couleur: "#a89eff" },
  ];

  const visibles = ordre.filter(id=>!masquees.includes(id));

  function carte(id: string): React.ReactNode {
    switch(id) {
      case "kpi-clients": return <KpiCard label="Clients" valeur={String(C.length)} />;
      case "kpi-ca-signe": return <KpiCard label="CA signé" valeur={`${caSigne.toFixed(0)} €`} couleur="text-teal" />;
      case "kpi-en-attente": return <KpiCard label="En attente" valeur={`${caEnAttente.toFixed(0)} €`} couleur="text-amber" />;
      case "kpi-facture": return <KpiCard label="Facturé" valeur={`${caFacture.toFixed(0)} €`} couleur="text-violet" />;
      case "kpi-taches": return <KpiCard label="Tâches" valeur={`${pctT}%`} sousLabel={`${tDone}/${T.length}`} />;
      case "kpi-prospects": return <KpiCard label="Prospects actifs" valeur={String(pActifs)} sousLabel={`${pctConv}% convertis`} />;
      case "agent-ia": return <div className="h-[420px]"><ChatAgentPanel compact /></div>;
      case "echeances": return <Echeances modePerso={modePerso} />;
      case "apercu-devis": return <AperculCard titre="Devis" lien="/devis" items={apD} modePerso={modePerso} />;
      case "apercu-prospects": return <AperculCard titre="Prospects" lien="/prospects" items={apP} modePerso={modePerso} />;
      case "apercu-factures": return <AperculCard titre="Factures" lien="/factures" items={apF} modePerso={modePerso} />;
      case "apercu-taches": return <AperculCard titre="Tâches" lien="/taches" items={apT} modePerso={modePerso} />;
      case "graph-devis": return <BarChart titre="Devis par statut" donnees={repartir(D.map(d=>d.statut))} />;
      case "graph-prospects": return <BarChart titre="Prospects par statut" donnees={repartir(P.map(p=>p.statut))} />;
      case "graph-factures": return <BarChart titre="Factures par statut" donnees={repartir(F.map(f=>f.statut))} />;
      case "graph-taches": return <BarChart titre="Tâches par statut" donnees={repartir(T.map(t=>t.statut))} />;
      default: return null;
    }
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-textPrimary">Tableau de bord</h1>
          <div className="flex items-center gap-2">
            {modePerso && masquees.length>0 && <span className="text-xs text-textMuted">{masquees.length} masquée(s)</span>}
            {modePerso && <button onClick={()=>save(ORDRE_DEFAUT,[],TAILLE_DEFAUT)} className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary">Réinitialiser</button>}
            <button onClick={()=>setModePerso(v=>!v)} className={`rounded-lg px-4 py-1.5 text-sm font-medium ${modePerso?"bg-violet text-white":"border border-line text-textMuted hover:text-textPrimary"}`}>
              {modePerso?"✓ Terminer":"⚙ Personnaliser"}
            </button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">{error}</p>}

        {!loading && !modePerso && <Kpi3DRing items={kpiRingItems} />}

        {modePerso && masquees.length>0 && (
          <div className="mb-6 rounded-xl border border-dashed border-line bg-surface/50 p-4">
            <p className="mb-2 text-xs uppercase tracking-wide text-textMuted">Cartes masquées</p>
            <div className="flex flex-wrap gap-2">
              {masquees.map(id=>(
                <button key={id} onClick={()=>save(ordre,masquees.filter(m=>m!==id),tailles)} className="rounded-full border border-line px-3 py-1.5 text-xs text-textMuted hover:border-teal hover:text-teal">
                  + {TITRES[id]||id}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading
        ? <p className="text-sm text-textMuted">Chargement…</p>
        : <div className="grid grid-cols-6 gap-4">
            {visibles.map(id => (
              <div key={id} className={`${SPAN[tailles[id]||"normal"]} rounded-xl border border-line bg-surface p-4`}>
                {carte(id)}
                {modePerso && (
                  <div className="mt-3 flex justify-end">
                    <button onClick={()=>save(ordre,[...masquees,id],tailles)} className="text-[10px] text-textMuted hover:text-amber">Masquer</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        }
      </main>
    </>
  );
}
