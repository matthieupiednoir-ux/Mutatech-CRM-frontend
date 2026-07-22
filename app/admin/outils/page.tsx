"use client";

import NavBar from "@/components/NavBar";

interface Outil {
  icone: string;
  couleur: string;
  fond: string;
  titre: string;
  description: string;
  href: string;
  externe?: boolean;
}

const OUTILS: Outil[] = [
  {
    icone: "📅", couleur: "#6C63FF", fond: "rgba(108,99,255,0.12)",
    titre: "Agenda Mutatech",
    description: "Google Calendar — rendez-vous clients, publications LinkedIn programmées, échéances administratives.",
    href: "https://calendar.google.com", externe: true,
  },
  {
    icone: "✅", couleur: "#00D4AA", fond: "rgba(0,212,170,0.12)",
    titre: "To-do liste du projet",
    description: "Suivi complet de l'avancement Mutatech — piliers, workflow à 3 états, progression en temps réel.",
    href: "https://mutatech.fr/Mutatech-Todo-Liste.html", externe: true,
  },
  {
    icone: "🗺️", couleur: "#F59E0B", fond: "rgba(245,158,11,0.12)",
    titre: "Gestion de la prospection",
    description: "Liste dynamique des prospects (ajout/édition/statut), carte interactive et emails/script de prospection.",
    href: "https://mutatech.fr/Mutatech-Prospection-Manager.html", externe: true,
  },
  {
    icone: "🤖", couleur: "#6C63FF", fond: "rgba(108,99,255,0.12)",
    titre: "Orchestrateur IA",
    description: "Audit client → stack IA recommandée → déploiement piloté en direct.",
    href: "https://mutatech-orchestrator-frontend.netlify.app", externe: true,
  },
  {
    icone: "💶", couleur: "#00D4AA", fond: "rgba(0,212,170,0.12)",
    titre: "Gestion des tarifs",
    description: "Modifie les prix publiés sur le site (structure + IDEL) sans toucher au code — publication automatique en ~1 min.",
    href: "https://mutatech.fr/Mutatech-Gestion-Tarifs.html", externe: true,
  },
  {
    icone: "📋", couleur: "#F5A623", fond: "rgba(245,166,35,0.12)",
    titre: "Outil Audit Diagnostic",
    description: "Formulaire de diagnostic client en rendez-vous, rapport PDF brandé Mutatech en sortie.",
    href: "https://mutatech-audit-frontend.netlify.app", externe: true,
  },
];

const ACCES_RAPIDES: { label: string; href: string }[] = [
  { label: "Calendrier éditorial LinkedIn", href: "https://mutatech.fr/Mutatech-Calendrier-LinkedIn-30j.html" },
  { label: "Business plan 3 ans", href: "https://mutatech.fr/Mutatech-BusinessPlan-3ans.html" },
  { label: "Simulateur IA (vue publique)", href: "https://mutatech.fr/simulateur.html" },
  { label: "Boîte mail Mutatech", href: "https://mail.google.com" },
];

export default function AdminOutilsPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-display text-2xl text-textPrimary mb-1">Outils</h1>
        <p className="mb-6 text-sm text-textMuted">
          Anciennement dans l'Espace Collaborateur (site public) — regroupé ici, protégé par la même
          authentification que le reste de l'admin, sans dépendre d'un système séparé.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OUTILS.map((o) => (
            <a
              key={o.titre}
              href={o.href}
              target={o.externe ? "_blank" : undefined}
              rel={o.externe ? "noopener noreferrer" : undefined}
              className="block rounded-xl border border-line bg-surface p-6 transition hover:border-[var(--accent)] hover:-translate-y-0.5"
            >
              <div
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg text-xl"
                style={{ backgroundColor: o.fond, color: o.couleur }}
              >
                {o.icone}
              </div>
              <div className="font-display text-base font-bold text-textPrimary mb-1">{o.titre}</div>
              <p className="text-sm text-textMuted leading-relaxed">{o.description}</p>
              <div className="mt-4 text-xs font-medium" style={{ color: o.couleur }}>
                Ouvrir →
              </div>
            </a>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-line bg-surface p-6">
          <div className="mb-4 text-xs font-bold uppercase tracking-wide text-textMuted">Accès rapides</div>
          <div className="divide-y divide-line">
            {ACCES_RAPIDES.map((a) => (
              <div key={a.label} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-textPrimary">{a.label}</span>
                <a href={a.href} target="_blank" rel="noopener noreferrer" className="font-medium text-teal hover:underline">
                  Ouvrir →
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
