"use client";

import { useEffect, useRef, useState } from "react";
import { chatAgent, agentConfirmerAction, getAgentHistorique, effacerAgentHistorique, ApiError } from "@/lib/api";
import { AgentMessage, ConfirmationRequise } from "@/lib/types";

interface MessageAffiche {
  role: "user" | "assistant";
  content: string;
  actions?: string[];
}

interface ReponseAgent {
  reply: string;
  actions_effectuees?: string[];
  confirmation_requise?: ConfirmationRequise | null;
}

interface ChatAgentPanelProps {
  compact?: boolean;
  // Permet de reutiliser ce composant pour Nova (IDEL/PSDM) en passant
  // les fonctions API du backend IDEL au lieu du CRM -- sans props,
  // comportement inchange (Pixel/CRM par defaut).
  chatFn?: (message: string, historique: { role: string; content: string }[], voice?: boolean) => Promise<ReponseAgent>;
  historyFn?: () => Promise<AgentMessage[]>;
  clearFn?: () => Promise<unknown>;
  // Execute reellement une action apres confirmation cliquee -- jamais
  // appelee depuis une reponse vocale. Nova passe novaConfirmerAction.
  confirmerFn?: (outil: string, args: Record<string, unknown>) => Promise<{ libelle: string }>;
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

// Types minimaux pour la Web Speech API -- absente des libs DOM standard de
// TypeScript, non disponible sur tous les navigateurs (Firefox notamment).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null;
}

function synthesesDisponibles(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export default function ChatAgentPanel({
  compact = false,
  chatFn = chatAgent,
  historyFn = getAgentHistorique,
  clearFn = effacerAgentHistorique,
  confirmerFn = agentConfirmerAction,
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

  // --- Mode vocal ---
  const [modeVocal, setModeVocal] = useState(false);
  const [ecoute, setEcoute] = useState(false);
  const [parle, setParle] = useState(false);
  const [confirmationEnAttente, setConfirmationEnAttente] = useState<ConfirmationRequise | null>(null);
  const [confirmationEnCours, setConfirmationEnCours] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const modeVocalRef = useRef(false); // reflete modeVocal sans latence de re-render, lu dans les callbacks
  const confirmationRef = useRef<ConfirmationRequise | null>(null);
  const supportVocalOk = getSpeechRecognitionCtor() !== null && synthesesDisponibles();

  useEffect(() => {
    modeVocalRef.current = modeVocal;
  }, [modeVocal]);

  useEffect(() => {
    confirmationRef.current = confirmationEnAttente;
  }, [confirmationEnAttente]);

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

  // Coupe proprement le mode vocal au demontage du composant (changement de page)
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (synthesesDisponibles()) window.speechSynthesis.cancel();
    };
  }, []);

  function parlerTexte(texte: string, onFin?: () => void) {
    if (!synthesesDisponibles() || !texte) {
      onFin?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texte);
    utterance.lang = "fr-FR";
    utterance.onend = () => {
      setParle(false);
      onFin?.();
    };
    utterance.onerror = () => {
      setParle(false);
      onFin?.();
    };
    setParle(true);
    window.speechSynthesis.speak(utterance);
  }

  function demarrerEcoute() {
    if (!modeVocalRef.current || confirmationRef.current) return;
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const reco = new Ctor();
    reco.lang = "fr-FR";
    reco.continuous = false;
    reco.interimResults = false;
    reco.onresult = (e: SpeechRecognitionEventLike) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim();
      if (transcript) envoyer(transcript, true);
    };
    reco.onerror = () => {
      setEcoute(false);
      // Relance l'ecoute apres une erreur benigne (ex: silence) si toujours en mode vocal
      if (modeVocalRef.current && !confirmationRef.current) {
        setTimeout(demarrerEcoute, 600);
      }
    };
    reco.onend = () => setEcoute(false);
    recognitionRef.current = reco;
    setEcoute(true);
    reco.start();
  }

  function arreterModeVocal() {
    setModeVocal(false);
    modeVocalRef.current = false;
    recognitionRef.current?.abort();
    if (synthesesDisponibles()) window.speechSynthesis.cancel();
    setEcoute(false);
    setParle(false);
  }

  async function activerModeVocal() {
    if (!supportVocalOk) return;
    try {
      // Demande la permission micro explicitement -- SpeechRecognition la
      // demande aussi, mais un echec explicite ici donne un message clair.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setError("Micro inaccessible -- vérifie les autorisations du navigateur.");
      return;
    }
    setModeVocal(true);
    modeVocalRef.current = true;
    setError(null);
    demarrerEcoute();
  }

  async function envoyer(texte?: string, voice = false) {
    const message = (texte ?? saisie).trim();
    if (!message || envoi) return;

    const safeMsg = safeMessages(messages, accueil);
    const historique = safeMsg.map((m) => ({ role: m.role, content: m.content }));
    setMessages([...safeMsg, { role: "user", content: message }]);
    setSaisie("");
    setEnvoi(true);
    setError(null);

    try {
      const reponse = await chatFn(message, historique, voice);
      setMessages((prev) => [
        ...safeMessages(prev, accueil),
        {
          role: "assistant",
          content: reponse.reply ?? "",
          actions: Array.isArray(reponse.actions_effectuees) ? reponse.actions_effectuees : [],
        },
      ]);

      if (voice && reponse.confirmation_requise) {
        // Coupe la boucle d'ecoute automatique -- la confirmation ne peut
        // se faire que par un clic explicite, jamais par la voix.
        recognitionRef.current?.abort();
        setEcoute(false);
        setConfirmationEnAttente(reponse.confirmation_requise);
        parlerTexte(reponse.reply ?? "");
      } else if (voice) {
        parlerTexte(reponse.reply ?? "", () => {
          if (modeVocalRef.current && !confirmationRef.current) demarrerEcoute();
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de connexion à l'agent.");
      if (voice && modeVocalRef.current) setTimeout(demarrerEcoute, 800);
    } finally {
      setEnvoi(false);
    }
  }

  async function confirmerActionVocale() {
    const conf = confirmationEnAttente;
    if (!conf || confirmationEnCours) return;
    setConfirmationEnCours(true);
    setError(null);
    try {
      const resultat = await confirmerFn(conf.outil, conf.args);
      setMessages((prev) => [
        ...safeMessages(prev, accueil),
        { role: "assistant", content: `✓ ${resultat.libelle}` },
      ]);
      setConfirmationEnAttente(null);
      if (modeVocalRef.current) {
        parlerTexte(resultat.libelle, () => {
          if (modeVocalRef.current && !confirmationRef.current) demarrerEcoute();
        });
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur lors de la confirmation.");
    } finally {
      setConfirmationEnCours(false);
    }
  }

  function annulerActionVocale() {
    setConfirmationEnAttente(null);
    setMessages((prev) => [
      ...safeMessages(prev, accueil),
      { role: "assistant", content: "Action annulée." },
    ]);
    if (modeVocalRef.current) demarrerEcoute();
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
  const statutVocal = confirmationEnAttente
    ? "Confirmation requise"
    : parle
    ? "Nova/Pixel répond…"
    : ecoute
    ? "Écoute…"
    : envoi
    ? "Réflexion…"
    : "Mode vocal actif";

  return (
    <div className="flex h-full flex-col">
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg text-textPrimary">Agent IA</h2>
            <p className="text-xs text-textMuted">Confirmation demandée avant toute modification</p>
          </div>
          <div className="flex items-center gap-2">
            {supportVocalOk && (
              <button
                onClick={modeVocal ? arreterModeVocal : activerModeVocal}
                title={modeVocal ? "Désactiver le mode vocal" : "Activer le mode vocal"}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                  modeVocal
                    ? "border-transparent bg-amber text-white"
                    : "border-line text-textMuted hover:border-violet hover:text-textPrimary"
                }`}
              >
                {modeVocal ? (ecoute ? "🎙️" : parle ? "🔊" : "⏸️") : "🎙️"}
                {modeVocal ? statutVocal : "Mode vocal"}
              </button>
            )}
            {safeMsg.length > 1 && (
              <button onClick={effacer} className="text-xs text-textMuted hover:text-amber">
                Effacer l'historique
              </button>
            )}
          </div>
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

        {confirmationEnAttente && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-xl border border-amber/50 bg-amber/10 px-3 py-2.5 text-sm text-textPrimary">
              <p className="mb-2 font-medium">🔒 Confirmation requise (mode vocal)</p>
              <p className="mb-3 text-xs text-textMuted">{confirmationEnAttente.libelle}</p>
              <div className="flex gap-2">
                <button
                  onClick={confirmerActionVocale}
                  disabled={confirmationEnCours}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${accentClass}`}
                >
                  {confirmationEnCours ? "…" : "Confirmer"}
                </button>
                <button
                  onClick={annulerActionVocale}
                  disabled={confirmationEnCours}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary disabled:opacity-50"
                >
                  Annuler
                </button>
              </div>
            </div>
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
          placeholder={modeVocal ? "Mode vocal actif — parle ou écris…" : "Écris ton message…"}
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
