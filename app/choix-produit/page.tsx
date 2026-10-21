"use client";

import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import { getUser } from "@/lib/auth";

export default function ChoixProduitPage() {
  const router = useRouter();
  const user = getUser();

  return (
    <>
      <NavBar />
      <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm text-textMuted">Bonjour{user?.nom ? `, ${user.nom}` : ""}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-textPrimary">
            Quel espace souhaitez-vous ouvrir ?
          </h1>
          <p className="mt-2 text-sm text-textMuted">
            Votre compte a accès aux deux plateformes Mutatech.
          </p>
        </div>

        <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
          {/* CRM Mutatech */}
          <button
            onClick={() => router.push("/dashboard")}
            className="group flex flex-col items-start rounded-2xl border border-line bg-surface p-7 text-left transition hover:border-violet/50 hover:shadow-pop"
          >
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-violet/10 text-violet ring-1 ring-violet/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" />
              </svg>
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-textPrimary">
              CRM Mutatech
            </h2>
            <p className="text-sm text-textMuted leading-relaxed">
              Clients, devis, factures, dépenses, comptabilité, prospects, tâches et agent IA.
            </p>
            <span className="mt-5 text-sm font-medium text-violet group-hover:underline">
              Accéder au CRM →
            </span>
          </button>

          {/* Plateforme IDEL */}
          <button
            onClick={() => router.push("/idel/accueil")}
            className="group flex flex-col items-start rounded-2xl border border-line bg-surface p-7 text-left transition hover:border-[#F0508C]/50 hover:shadow-pop"
          >
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#F0508C]/10 text-[#F0508C] ring-1 ring-[#F0508C]/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" /><path d="M9 12h2l1-2 1 4 1-2h1" />
              </svg>
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-textPrimary">
              Plateforme IDEL
            </h2>
            <p className="text-sm text-textMuted leading-relaxed">
              Tableau de bord du jour, pipeline ordonnances, cotation NGAP, préparation des transmissions CPAM.
            </p>
            <span className="mt-5 text-sm font-medium text-[#F0508C] group-hover:underline">
              Accéder à l'espace IDEL →
            </span>
          </button>
        </div>
      </main>
    </>
  );
}
