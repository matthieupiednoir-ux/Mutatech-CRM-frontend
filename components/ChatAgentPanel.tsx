"use client";

import { useEffect, useRef, useState } from "react";
import { chatAgent, agentConfirmerAction, getAgentHistorique, effacerAgentHistorique, ApiError } from "@/lib/api";
import { AgentMessage, ConfirmationRequise } from "@/lib/types";

interface MessageAffiche {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  echec?: boolean; // true si l'envoi de CE message a echoue -- affiche un bouton Reessayer
}

let compteurMessages = 0;
function nouvelId(): string {
  compteurMessages += 1;
  return `m${Date.now()}_${compteurMessages}`;
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
  // Genre de la voix de synthese vocale -- Pixel (CRM) reste "homme" par
  // defaut, Nova (IDEL) passe "femme". Determine la selection parmi les
  // voix francaises disponibles dans le navigateur (voir choisirVoix).
  voiceGenre?: "homme" | "femme";
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

// Note colle a une realite : le rendu "robotique" vient surtout du moteur
// TTS fourni par l'OS/navigateur, pas du code -- on ne peut pas le rendre
// plus naturel que la voix elle-meme. Ce qu'on peut faire : choisir la
// MEILLEURE voix francaise disponible (les voix "Online/Natural/Neural",
// quand presentes -- typiquement Edge -- sonnent nettement moins robotique
// que les voix locales par defaut), et distinguer homme/femme entre Pixel
// et Nova via des heuristiques de nom (aucune API standard n'expose le
// genre d'une SpeechSynthesisVoice).
const NOMS_VOIX_HOMME = ["paul", "henri", "thomas", "nicolas", "daniel", "guillaume", "male", "homme"];
const NOMS_VOIX_FEMME = [
  "hortense", "denise", "julie", "amelie", "amélie", "audrey", "marie",
  "virginie", "chantal", "celine", "céline", "aurelie", "aurélie",
  "google français", "google francais", "female", "femme",
];

function scoreVoix(v: SpeechSynthesisVoice, genre: "homme" | "femme"): number {
  const langOk = (v.lang || "").toLowerCase().startsWith("fr");
  if (!langOk) return -1;
  const nom = v.name.toLowerCase();
  let score = 1;
  const estQualiteSuperieure = nom.includes("online") || nom.includes("natural") || nom.includes("neural") || nom.includes("google");
  if (estQualiteSuperieure) score += 5;
  const listeCible = genre === "homme" ? NOMS_VOIX_HOMME : NOMS_VOIX_FEMME;
  const listeOpposee = genre === "homme" ? NOMS_VOIX_FEMME : NOMS_VOIX_HOMME;
  if (listeCible.some((n) => nom.includes(n))) score += 10;
  if (listeOpposee.some((n) => nom.includes(n))) score -= 8;
  return score;
}

function choisirVoix(genre: "homme" | "femme", voixDisponibles: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voixDisponibles.length) return null;
  const notees = voixDisponibles
    .map((v) => ({ v, s: scoreVoix(v, genre) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s);
  return notees.length ? notees[0].v : null;
}

export default function ChatAgentPanel({
  compact = false,
  chatFn = chatAgent,
  historyFn = getAgentHistorique,
  clearFn = effacerAgentHistorique,
  confirmerFn = agentConfirmerAction,
  voiceGenre = "homme",
  messageAccueil = MESSAGE_ACCUEIL_DEFAUT,
  suggestions = SUGGESTIONS_DEFAUT,
  accentClass = "bg-violet hover:bg-violet/90",
}: ChatAgentPanelProps) {
  const accueil: MessageAffiche = { id: "accueil", role: "assistant", content: messageAccueil };
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
  const voixDisponiblesRef = useRef<SpeechSynthesisVoice[]>([]); // rempli de facon asynchrone par le navigateur
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
          id: nouvelId(),
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

  // Charge la liste des voix disponibles -- souvent vide au tout premier
  // rendu (chargement asynchrone du moteur TTS par le navigateur), d'ou
  // l'ecoute de onvoiceschanged en plus de l'appel immediat.
  useEffect(() => {
    if (!synthesesDisponibles()) return;
    const charger = () => { voixDisponiblesRef.current = window.speechSynthesis.getVoices(); };
    charger();
    window.speechSynthesis.onvoiceschanged = charger;
  }, []);

  function parlerTexte(texte: string, onFin?: () => void) {
    if (!synthesesDisponibles() || !texte) {
      onFin?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texte);
    utterance.lang = "fr-FR";
    const voix = choisirVoix(voiceGenre, voixDisponiblesRef.current.length ? voixDisponiblesRef.current : window.speechSynthesis.getVoices());
    if (voix) utterance.voice = voix;
    utterance.pitch = voiceGenre === "homme" ? 0.95 : 1.05;
    utterance.rate = 1.02;
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

    const idMessage = nouvelId();
    const safeMsg = safeMessages(messages, accueil);
    const historique = safeMsg.map((m) => ({ role: m.role, content: m.content }));
    setMessages([...safeMsg, { id: idMessage, role: "user", content: message }]);
    // La saisie n'est effacee qu'apres un envoi reussi (voir catch ci-dessous) --
    // sinon un echec reseau forcerait a retaper tout le message.
    if (!texte) setSaisie("");
    setEnvoi(true);
    setError(null);

    try {
      const reponse = await chatFn(message, historique, voice);
      setMessages((prev) => [
        ...safeMessages(prev, accueil),
        {
          id: nouvelId(),
          role: "assistant",
          content: reponse.reply ?? "",
          actions: Array.isArray(reponse.actions_effectuees) ? reponse.actions_effectuees : [],
        },
      ]);
      if (!texte) setSaisie("");

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
      // Marque CE message comme en echec (bouton Reessayer sur la bulle) et
      // restaure le texte dans le champ de saisie s'il venait de la saisie
      // manuelle -- sinon l'utilisateur devrait tout retaper.
      setMessages((prev) => safeMessages(prev, accueil).map((m) => (m.id === idMessage ? { ...m, echec: true } : m)));
      if (!texte) setSaisie(message);
      if (voice && modeVocalRef.current) setTimeout(demarrerEcoute, 800);
    } finally {
      setEnvoi(false);
    }
  }

  function reessayerMessage(id: string, contenu: string) {
    setMessages((prev) => safeMessages(prev, accueil).filter((m) => m.id !== id));
    envoyer(contenu);
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
        { id: nouvelId(), role: "assistant", content: `✓ ${resultat.libelle}` },
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
      { id: nouvelId(), role: "assistant", content: "Action annulée." },
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
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] transition ${
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
              <button onClick={effacer} className="rounded-full px-2 py-2 text-xs text-textMuted hover:text-amber">
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
        {safeMsg.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[90%]">
              <div className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.echec
                  ? "border border-amber/60 bg-amber/10 text-textPrimary"
                  : m.role === "user" ? `${accentClass.split(" ")[0]} text-white` : "bg-surfaceAlt text-textPrimary"
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
              {m.echec && (
                <div className="mt-1 flex items-center justify-end gap-2">
                  <span className="text-[11px] text-amber">⚠️ Non envoyé</span>
                  <button
                    onClick={() => reessayerMessage(m.id, m.content)}
                    className="rounded-full border border-amber/50 px-3 py-1.5 text-[11px] font-medium text-amber hover:bg-amber/10"
                  >
                    Réessayer
                  </button>
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
                  className={`rounded-lg px-4 py-2.5 text-xs font-medium text-white disabled:opacity-50 ${accentClass}`}
                >
                  {confirmationEnCours ? "…" : "Confirmer"}
                </button>
                <button
                  onClick={annulerActionVocale}
                  disabled={confirmationEnCours}
                  className="rounded-lg border border-line px-4 py-2.5 text-xs text-textMuted hover:text-textPrimary disabled:opacity-50"
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
              className="rounded-full border border-line px-3 py-2 text-[11px] text-textMuted hover:border-violet hover:text-textPrimary">
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
