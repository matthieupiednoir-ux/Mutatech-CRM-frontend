"use client";

import NavBar from "@/components/NavBar";
import PlanningView from "@/components/PlanningView";
import {
  idelPlanningMembres, idelPlanningEvenements, idelPlanningCreerEvenement,
  idelPlanningLoginPersonnelUrl, idelPlanningStatutPersonnel, idelPlanningDeconnexionPersonnelle,
} from "@/lib/api";

export default function PlanningIdelPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-textPrimary">Planning</h1>
          <p className="mt-1 text-sm text-textMuted">
            Le calendrier combiné de ton organisation — chacun connecte son propre Google Calendar.
          </p>
        </div>
        <PlanningView
          fetchMembres={idelPlanningMembres}
          fetchEvenements={idelPlanningEvenements}
          creerEvenement={idelPlanningCreerEvenement}
          fetchLoginUrl={idelPlanningLoginPersonnelUrl}
          fetchStatutPersonnel={idelPlanningStatutPersonnel}
          deconnexionPersonnelle={idelPlanningDeconnexionPersonnelle}
          accentColor="#FF2E9A"
        />
      </main>
    </>
  );
}
