"use client";

import { useEffect, useRef, useState } from "react";
import { chatAgent, getAgentHistorique, effacerAgentHistorique, ApiError } from "@/lib/api";
import { AgentMessage } from "@/lib/types";

interface MessageAffiche {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

interface ReponseAgent {
  reply: string;
  actions_effectuees?: string[];
}

interface ChatAgentPanelProps {
  compact?: boolean;
  // Permet de reutiliser ce composant pour Nova (IDEL/PSDM) en passant
  // les fonctions API du backend IDEL au lieu du CRM -- sans props,
  // comportement inchange (Pixel/CRM par defaut).
  chatFn?: (message: string, historique: { role: string; content: string }[]) => Promise<ReponseAgent>;
  historyFn?: () => Promise<AgentMessage[]>;
  clearFn?: () => Promise<unknown>;
  messageAccueil?: string;
  suggestions?: string[];
  accentClass?: string; // classe Tailwind pour la bulle utilisateur/bouton, ex. "bg-violet hover:bg-violet/90"
}

const SUGGESTIONS_DEFAUT = [
  "Quelles sont mes tâches en cours ?",
  "Liste les prospects SSIAD à contacter",
  "Combien de devis sont en attente de signature ?",
];

const MESSAGE_ACCUEIL_DEFAUT =
  "Salut ! Je peux consulter tes tâches, prospects, clients, devis et factures. Pour toute action, je décris d'abord ce que je vais faire et j'attends ta confirmation. Qu'est-ce que je peux faire pour toi ?";

function safeMessages(v: unknown, accueil: MessageAffiche): MessageAffiche[] {
  if (!Array.isArray(v)) return [accueil];
  return v.length === 0 ? [accueil] : (v as MessageAffiche[]);
}

export default function ChatAgentPanel({
  compact = false,
  chatFn = chatAgent,
  historyFn = getAgentHistorique,
  clearFn = effacerAgentHistorique,
  messageAccueil = MESSAGE_ACCUEIL_DEFAUT,
  suggestions = SUGGESTIONS_DEFAUT,
  accentClass = "bg-violet hover:bg-violet/90",
}: ChatAgentPanelProps) {
  const accueil: MessageAffiche = { role: "assistant", content: messageAccueil };
  const [messages, setMessages] = useState<MessageAffiche[]>([accueil]);
  const [historiquePret, setHistoriquePret] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyFn()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, envoi]);

  async function envoyer(texte?: string) {
    const message = (texte ?? saisie).trim();
    if (!message || envoi) return;

    const safeMsg = safeMessages(messages, accueil);
    const historique = safeMsg.map((m) => ({ role: m.role, content: m.content }));
    setMessages([...safeMsg, { role: "user", content: message }]);
    setSaisie("");
    setEnvoi(true);
    setError(null);

    try {
      const reponse = await chatFn(message, historique);
      setMessages((prev) => [
        ...safeMessages(prev, accueil),
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
      await clearFn();
      setMessages([accueil]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); }
  }

  const safeMsg = safeMessages(messages, accueil);

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
              m.role === "user" ? `${accentClass.split(" ")[0]} text-white` : "bg-surfaceAlt text-textPrimary"
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
          {suggestions.map((s) => (
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
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${accentClass}`}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
