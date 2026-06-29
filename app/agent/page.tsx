"use client";

import NavBar from "@/components/NavBar";
import ChatAgentPanel from "@/components/ChatAgentPanel";

export default function AgentPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto flex h-[calc(100vh-73px)] max-w-3xl flex-col px-4 py-6">
        <ChatAgentPanel />
      </main>
    </>
  );
}
