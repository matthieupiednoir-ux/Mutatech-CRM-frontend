"use client";

import ChatAgentPanel from "@/components/ChatAgentPanel";
import { novaChat, novaHistorique, novaEffacerHistorique, novaConfirmerAction } from "@/lib/api";

const SUGGESTIONS_NOVA = [
  "Fais-moi un bilan de l'activité",
  "Liste mes patients sans adresse",
  "Quelles ordonnances arrivent à expiration ?",
];

const ACCUEIL_NOVA =
  "Salut, je suis Nova ! Je peux consulter et gérer tes patients, tournées, commandes pharma, ordonnances et agenda. Pour toute action, je décris d'abord ce que je vais faire. Qu'est-ce que je peux faire pour toi ?";

/**
 * Enveloppe fine autour de ChatAgentPanel, brancheé sur les endpoints
 * Nova (backend IDEL) au lieu de Pixel (backend CRM) -- meme composant
 * visuel, memes garanties (confirmation avant modification, y compris
 * en mode vocal via confirmerFn), juste une autre source de donnees et
 * un accent rose hi-tech au lieu du violet.
 */
export default function NovaChatPanel({ compact = false }: { compact?: boolean }) {
  return (
    <ChatAgentPanel
      compact={compact}
      chatFn={novaChat}
      historyFn={novaHistorique}
      clearFn={novaEffacerHistorique}
      confirmerFn={novaConfirmerAction}
      messageAccueil={ACCUEIL_NOVA}
      suggestions={SUGGESTIONS_NOVA}
      accentClass="bg-[#FF2E9A] hover:opacity-90"
    />
  );
}
