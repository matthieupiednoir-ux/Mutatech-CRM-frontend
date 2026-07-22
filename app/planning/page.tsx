"use client";

import NavBar from "@/components/NavBar";
import PlanningView from "@/components/PlanningView";
import {
  planningMembres, planningEvenements, planningCreerEvenement,
  planningModifierEvenement, planningSupprimerEvenement,
  planningLoginPersonnelUrl, planningStatutPersonnel, planningDeconnexionPersonnelle,
} from "@/lib/api";

export default function PlanningPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-textPrimary">Planning</h1>
          <p className="mt-1 text-sm text-textMuted">
            Le calendrier combiné de ton équipe — chacun connecte son propre Google Calendar.
          </p>
        </div>
        <PlanningView
          fetchMembres={planningMembres}
          fetchEvenements={planningEvenements}
          creerEvenement={planningCreerEvenement}
          modifierEvenement={planningModifierEvenement}
          supprimerEvenement={planningSupprimerEvenement}
          fetchLoginUrl={planningLoginPersonnelUrl}
          fetchStatutPersonnel={planningStatutPersonnel}
          deconnexionPersonnelle={planningDeconnexionPersonnelle}
          accentColor="#6C63FF"
        />
      </main>
    </>
  );
}
