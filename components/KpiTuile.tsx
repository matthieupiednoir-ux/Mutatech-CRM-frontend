// Contenu d'une carte de chiffre cle (tableau de bord CRM, accueil IDEL) :
// pastille d'icone coloree + libelle + valeur. Les couleurs viennent des
// variables du theme (violet/teal/amber) ou de la palette Tailwind (sky,
// rose) pour garder des tons distincts d'une carte a l'autre.

export type TonKpi = "violet" | "teal" | "amber" | "sky" | "rose" | "neutre";
export type IconeKpi = "clients" | "euro" | "horloge" | "facture" | "coche" | "cible" | "agenda" | "dossier" | "envoi" | "portefeuille" | "colis";

const TONS: Record<TonKpi, { pastille: string; valeur: string }> = {
  violet: { pastille: "bg-violet/15 text-violet", valeur: "text-violet" },
  teal: { pastille: "bg-teal/15 text-teal", valeur: "text-teal" },
  amber: { pastille: "bg-amber/15 text-amber", valeur: "text-amber" },
  sky: { pastille: "bg-sky-500/15 text-sky-500", valeur: "text-textPrimary" },
  rose: { pastille: "bg-rose-500/15 text-rose-500", valeur: "text-textPrimary" },
  neutre: { pastille: "bg-surfaceAlt text-textMuted", valeur: "text-textPrimary" },
};

const CHEMINS: Record<IconeKpi, string> = {
  clients: "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 19v-1a4 4 0 0 0-3-3.87M16 3.13a3.5 3.5 0 0 1 0 6.74",
  euro: "M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10h9M4 14h9",
  horloge: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  facture: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5",
  coche: "M9 12l2 2 4-4M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  cible: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  agenda: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  dossier: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  envoi: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  portefeuille: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l3-4h11v4M17 13.5h.01",
  colis: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
};

export default function KpiTuile({ label, valeur, sousLabel, ton = "neutre", icone }: {
  label: string; valeur: string; sousLabel?: string; ton?: TonKpi; icone: IconeKpi;
}) {
  const t = TONS[ton];
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.pastille}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={CHEMINS[icone]} />
          </svg>
        </span>
        <p className="text-xs font-medium text-textMuted">{label}</p>
      </div>
      <p className={`mt-3 font-display text-[26px] font-semibold leading-none tracking-tight ${t.valeur}`}>{valeur}</p>
      {sousLabel && <p className="mt-2 text-xs text-textMuted">{sousLabel}</p>}
    </div>
  );
}
