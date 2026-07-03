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
          <h1 className="font-display text-3xl font-bold text-textPrimary">
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
            className="group flex flex-col items-start rounded-2xl border border-line bg-surface p-7 text-left transition hover:border-violet/50 hover:shadow-[0_12px_32px_-8px_rgba(108,99,255,0.25)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet/10 text-2xl">
              🧭
            </div>
            <h2 className="mb-2 font-display text-lg font-bold text-textPrimary">
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
            onClick={() => router.push("/idel")}
            className="group flex flex-col items-start rounded-2xl border border-line bg-surface p-7 text-left transition hover:border-teal/50 hover:shadow-[0_12px_32px_-8px_rgba(0,212,170,0.20)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal/10 text-2xl">
              🩺
            </div>
            <h2 className="mb-2 font-display text-lg font-bold text-textPrimary">
              Plateforme IDEL
            </h2>
            <p className="text-sm text-textMuted leading-relaxed">
              Pipeline ordonnances, cotation NGAP assistée, préparation des transmissions CPAM.
            </p>
            <span className="mt-5 text-sm font-medium text-teal group-hover:underline">
              Accéder à l'espace IDEL →
            </span>
          </button>
        </div>
      </main>
    </>
  );
}
