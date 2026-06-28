"use client";

import { useEffect, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import { chatAgent, ApiError } from "@/lib/api";

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

export default function AgentPage() {
  const [messages, setMessages] = useState<MessageAffiche[]>([
    {
      role: "assistant",
      content:
        "Salut Matthieu ! Je peux consulter et modifier tes tâches, prospects, clients et devis. Pour toute action qui change quelque chose (créer, modifier, convertir un prospect), je te décris d'abord ce que je vais faire et j'attends ta confirmation avant d'agir. Qu'est-ce que je peux faire pour toi ?",
    },
  ]);
  const [saisie, setSaisie] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ecoute, setEcoute] = useState(false);
  const [vocalDisponible, setVocalDisponible] = useState(true);
  const [synthDisponible, setSynthDisponible] = useState(true);
  const [lectureEnCoursIndex, setLectureEnCoursIndex] = useState<number | null>(null);

  const finRef = useRef<HTMLDivElement>(null);
  const reconnaissanceRef = useRef<any>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, envoiEnCours]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVocalDisponible(!!SpeechRecognition);
    setSynthDisponible("speechSynthesis" in window);
    return () => {
      reconnaissanceRef.current?.stop?.();
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  async function envoyer(texte?: string) {
    const message = (texte ?? saisie).trim();
    if (!message || envoiEnCours) return;

    const historique = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setSaisie("");
    setEnvoiEnCours(true);
    setError(null);

    try {
      const reponse = await chatAgent(message, historique);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reponse.reply,
          actions: reponse.actions_effectuees,
        },
      ]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de connexion à l'agent.");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      envoyer();
    }
  }

  // --- Dictée vocale (reconnaissance vocale native du navigateur) ---
  function toggleEcoute() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(
        "La reconnaissance vocale n'est pas disponible sur ce navigateur — essaie avec Chrome."
      );
      return;
    }

    if (ecoute) {
      reconnaissanceRef.current?.stop();
      return;
    }

    const reco = new SpeechRecognition();
    reco.lang = "fr-FR";
    reco.interimResults = false;
    reco.continuous = false;

    reco.onresult = (event: any) => {
      const texte = event.results[0][0].transcript;
      setSaisie((prev) => (prev ? `${prev} ${texte}` : texte));
    };
    reco.onerror = () => setEcoute(false);
    reco.onend = () => setEcoute(false);

    reconnaissanceRef.current = reco;
    reco.start();
    setEcoute(true);
  }

  // --- Lecture à voix haute (synthèse vocale native du navigateur) ---
  function lireAVoixHaute(texte: string, index: number) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    if (lectureEnCoursIndex === index) {
      setLectureEnCoursIndex(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(texte);
    utterance.lang = "fr-FR";
    utterance.onend = () => setLectureEnCoursIndex(null);
    utterance.onerror = () => setLectureEnCoursIndex(null);
    setLectureEnCoursIndex(index);
    window.speechSynthesis.speak(utterance);
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto flex h-[calc(100vh-73px)] max-w-3xl flex-col px-4 py-6">
        <h1 className="mb-1 font-display text-2xl text-textPrimary">Agent IA</h1>
        <p className="mb-4 text-xs text-textMuted">
          Accès en lecture/écriture à tes tâches, prospects, clients et devis —
          confirmation demandée avant toute modification.
        </p>

        <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-line bg-surface p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`group relative max-w-[85%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-violet text-white"
                    : "bg-surfaceAlt text-textPrimary"
                }`}
              >
                {m.content}
                {m.role === "assistant" && synthDisponible && (
                  <button
                    onClick={() => lireAVoixHaute(m.content, i)}
                    title="Lire à voix haute"
                    className={`ml-2 inline-align text-xs ${
                      lectureEnCoursIndex === i ? "text-teal" : "text-textMuted hover:text-textPrimary"
                    }`}
                  >
                    {lectureEnCoursIndex === i ? "🔊" : "🔈"}
                  </button>
                )}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-line/50 pt-2">
                    {m.actions.map((a, j) => (
                      <div key={j} className="text-[11px] text-teal">
                        ✓ {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {envoiEnCours && (
            <div className="flex justify-start">
              <div className="rounded-xl bg-surfaceAlt px-4 py-2.5 text-sm text-textMuted">
                …
              </div>
            </div>
          )}
          <div ref={finRef} />
        </div>

        {error && (
          <p className="mt-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
            {error}
          </p>
        )}

        {messages.length <= 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => envoyer(s)}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-textMuted hover:border-violet hover:text-textPrimary"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          {vocalDisponible && (
            <button
              onClick={toggleEcoute}
              title="Dicter un message"
              className={`rounded-lg border px-3 text-lg ${
                ecoute
                  ? "border-amber bg-amber/10 text-amber animate-pulse"
                  : "border-line text-textMuted hover:text-textPrimary"
              }`}
            >
              🎤
            </button>
          )}
          <textarea
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              ecoute
                ? "Je t'écoute…"
                : "Écris ton message… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
            }
            rows={2}
            className="flex-1 resize-none rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted/60"
          />
          <button
            onClick={() => envoyer()}
            disabled={envoiEnCours || !saisie.trim()}
            className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
        {!vocalDisponible && (
          <p className="mt-1 text-[11px] text-textMuted">
            Dictée vocale non disponible sur ce navigateur — essaie Chrome pour cette fonctionnalité.
          </p>
        )}
      </main>
    </>
  );
}
