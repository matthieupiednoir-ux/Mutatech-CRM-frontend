"use client";

import { useEffect, useRef, useState } from "react";
import { chatAgent, getAgentHistorique, effacerAgentHistorique, ApiError } from "@/lib/api";
import { AgentMessage } from "@/lib/types";

interface MessageAffiche {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

const SUGGESTIONS = [
  "Quelles sont mes tâches en cours ?",
  "Liste les prospects SSIAD à contacter",
  "Combien de devis sont en attente de signature ?",
];

const MESSAGE_ACCUEIL: MessageAffiche = {
  role: "assistant",
  content: "Salut ! Je peux consulter tes tâches, prospects, clients, devis et factures. Pour toute action, je décris d'abord ce que je vais faire et j'attends ta confirmation. Qu'est-ce que je peux faire pour toi ?",
};

function safeMessages(v: unknown): MessageAffiche[] {
  if (!Array.isArray(v)) return [MESSAGE_ACCUEIL];
  return v.length === 0 ? [MESSAGE_ACCUEIL] : v;
}

export default function ChatAgentPanel({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<MessageAffiche[]>([MESSAGE_ACCUEIL]);
  const [historiquePret, setHistoriquePret] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAgentHistorique()
      .then((data: unknown) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const mapped: MessageAffiche[] = (data as AgentMessage[]).map((m) => ({
          role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
          content: m.content ?? "",
          actions: Array.isArray(m.actions_effectuees) ? m.actions_effectuees : [],
        }));
        if (mapped.length > 0) setMessages(mapped);
      })
      .catch(() => {})
      .finally(() => setHistoriquePret(true));
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, envoi]);

  async function envoyer(texte?: string) {
    const message = (texte ?? saisie).trim();
    if (!message || envoi) return;

    const safeMsg = safeMessages(messages);
    const historique = safeMsg.map((m) => ({ role: m.role, content: m.content }));
    setMessages([...safeMsg, { role: "user", content: message }]);
    setSaisie("");
    setEnvoi(true);
    setError(null);

    try {
      const reponse = await chatAgent(message, historique);
      setMessages((prev) => [
        ...safeMessages(prev),
        {
          role: "assistant",
          content: reponse.reply ?? "",
          actions: Array.isArray(reponse.actions_effectuees) ? reponse.actions_effectuees : [],
        },
      ]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de connexion à l'agent.");
    } finally {
      setEnvoi(false);
    }
  }

  async function effacer() {
    if (!confirm("Effacer tout l'historique ?")) return;
    try {
      await effacerAgentHistorique();
      setMessages([MESSAGE_ACCUEIL]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); }
  }

  const safeMsg = safeMessages(messages);

  return (
    <div className="flex h-full flex-col">
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg text-textPrimary">Agent IA</h2>
            <p className="text-xs text-textMuted">Confirmation demandée avant toute modification</p>
          </div>
          {safeMsg.length > 1 && (
            <button onClick={effacer} className="text-xs text-textMuted hover:text-amber">
              Effacer l'historique
            </button>
          )}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-line bg-surface p-3">
        {!historiquePret && (
          <p className="text-center text-xs text-textMuted">Chargement…</p>
        )}
        {safeMsg.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-violet text-white" : "bg-surfaceAlt text-textPrimary"
            }`}>
              {m.content}
              {Array.isArray(m.actions) && m.actions.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-line/50 pt-2">
                  {m.actions.map((a, j) => (
                    <div key={j} className="text-[11px] text-teal">✓ {a}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {envoi && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-surfaceAlt px-3 py-2 text-sm text-textMuted">…</div>
          </div>
        )}
        <div ref={finRef} />
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">{error}</p>
      )}

      {safeMsg.length <= 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => envoyer(s)}
              className="rounded-full border border-line px-2.5 py-1 text-[11px] text-textMuted hover:border-violet hover:text-textPrimary">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <textarea
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écris ton message…"
          rows={compact ? 1 : 2}
          className="flex-1 resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60"
        />
        <button
          onClick={() => envoyer()}
          disabled={envoi || !saisie.trim()}
          className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
