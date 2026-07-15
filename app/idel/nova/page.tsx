"use client";

import NavBar from "@/components/NavBar";
import NovaChatPanel from "@/components/NovaChatPanel";
import InsightStrip from "@/components/InsightStrip";
import { idelInsights } from "@/lib/api";

export default function NovaPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-textPrimary">Nova</h1>
          <p className="mt-1 text-sm text-textMuted">
            Ton assistant IA — patients, tournées, commandes pharma, ordonnances, agenda.
          </p>
        </div>
        <InsightStrip fetcher={idelInsights} />
        <div className="h-[560px]">
          <NovaChatPanel />
        </div>
      </main>
    </>
  );
}
