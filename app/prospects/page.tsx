"use client";

import { useEffect, useMemo, useState } from "react";
import NavBar from "@/components/NavBar";
import CsvImportPanel from "@/components/CsvImportPanel";
import { Prospect, ProspectInput } from "@/lib/types";
import {
  getProspects,
  creerProspect,
  modifierProspect,
  supprimerProspect,
  convertirEnClient,
  importerProspectsLot,
} from "@/lib/api";
import { PROSPECTS_BRUTS, mapperProspect } from "@/lib/seed-prospects";

// --- Référentiels (souples : on n'impose rien côté backend, juste des options
// pratiques côté UI) ---
const SECTEURS = [
  "SSIAD",
  "Cabinet médical",
  "IDEL",
  "PSDM",
  "Artisan-BTP",
  "Artisan",
  "Autre",
];

const STATUTS = [
  { code: "a_contacter", label: "À contacter" },
  { code: "contacte", label: "Contacté" },
  { code: "rdv_planifie", label: "RDV planifié" },
  { code: "en_discussion", label: "En discussion" },
  { code: "converti", label: "Converti" },
  { code: "perdu", label: "Perdu" },
];

// Colonnes acceptées par l'import CSV. Doit refléter le modèle Prospect réel.
const CSV_CHAMPS = [
  { cle: "nom", label: "Nom", requis: true },
  { cle: "secteur", label: "Secteur" },
  { cle: "telephone", label: "Téléphone" },
  { cle: "email", label: "Email" },
  { cle: "adresse", label: "Adresse" },
  { cle: "statut", label: "Statut" },
  { cle: "notes", label: "Notes" },
];

function labelStatut(code: string) {
  return STATUTS.find((s) => s.code === code)?.label ?? code;
}

function couleurSecteur(secteur?: string | null): string {
  if (!secteur) return "#94a3b8";
  const s = secteur.toLowerCase();
  if (
    s.includes("ssiad") ||
    s.includes("idel") ||
    s.includes("médical") ||
    s.includes("medical") ||
    s.includes("psdm") ||
    s.includes("infirm") ||
    s.includes("kiné") ||
    s.includes("kine")
  ) {
    return "#6C63FF"; // violet — santé
  }
  if (s.includes("artisan") || s.includes("btp")) {
    return "#00D4AA"; // teal — artisan/BTP
  }
  return "#94a3b8";
}

export default function PageProspects() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [vue, setVue] = useState<"liste" | "carte">("liste");
  const [filtreSecteur, setFiltreSecteur] = useState<string>("");
  const [filtreStatut, setFiltreStatut] = useState<string>("");

  const [formOuvert, setFormOuvert] = useState(false);
  const [prospectEdition, setProspectEdition] = useState<Prospect | null>(null);

  const [csvOuvert, setCsvOuvert] = useState(false);
  const [seedEnCours, setSeedEnCours] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function recharger() {
    try {
      setChargement(true);
      const data = await getProspects();
      setProspects(data);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    recharger();
  }, []);

  const prospectsFiltres = useMemo(() => {
    return prospects.filter((p) => {
      if (filtreSecteur && p.secteur !== filtreSecteur) return false;
      if (filtreStatut && p.statut !== filtreStatut) return false;
      return true;
    });
  }, [prospects, filtreSecteur, filtreStatut]);

  // --- Import du seed (les 120 prospects historiques) ---
  async function handleSeedImport() {
    if (
      !confirm(
        `Importer ${PROSPECTS_BRUTS.length} prospects depuis le seed historique ? ` +
          `Les doublons éventuels seront créés en plus de l'existant (la déduplication est manuelle ensuite).`
      )
    ) {
      return;
    }
    setSeedEnCours(true);
    setImportMsg(null);
    try {
      const data: ProspectInput[] = PROSPECTS_BRUTS.map(
        (p) => mapperProspect(p) as ProspectInput
      );
      const crees = await importerProspectsLot(data);
      setImportMsg(`✓ ${crees.length} prospect(s) importé(s) depuis le seed.`);
      await recharger();
    } catch (e) {
      setImportMsg(`✗ ${e instanceof Error ? e.message : "Erreur"}`);
    } finally {
      setSeedEnCours(false);
    }
  }

  // --- Import CSV (appelé par CsvImportPanel après mapping) ---
  async function handleCsvImport(lignes: Record<string, string>[]) {
    if (lignes.length === 0) {
      throw new Error("Le fichier ne contient aucune ligne.");
    }
    const data: ProspectInput[] = lignes
      .map((l) => ({
        nom: (l.nom || "").trim(),
        secteur: l.secteur?.trim() || undefined,
        telephone: l.telephone?.trim() || undefined,
        email: l.email?.trim() || undefined,
        adresse: l.adresse?.trim() || undefined,
        statut: l.statut?.trim() || "a_contacter",
        notes: l.notes?.trim() || undefined,
      }))
      .filter((p) => p.nom);

    if (data.length === 0) {
      throw new Error(
        "Aucune ligne avec un nom valide — vérifie que la colonne « Nom » est bien associée."
      );
    }

    const crees = await importerProspectsLot(data);
    setImportMsg(`✓ ${crees.length} prospect(s) importé(s) depuis le CSV.`);
    setCsvOuvert(false);
    await recharger();
  }

  // --- Formulaire (création + édition) ---
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const input: ProspectInput = {
      nom: String(fd.get("nom") || "").trim(),
      secteur: String(fd.get("secteur") || "").trim() || undefined,
      telephone: String(fd.get("telephone") || "").trim() || undefined,
      email: String(fd.get("email") || "").trim() || undefined,
      adresse: String(fd.get("adresse") || "").trim() || undefined,
      statut: String(fd.get("statut") || "a_contacter"),
      notes: String(fd.get("notes") || "").trim() || undefined,
    };
    if (!input.nom) {
      alert("Le nom est obligatoire.");
      return;
    }
    try {
      if (prospectEdition) {
        await modifierProspect(prospectEdition.id, input);
      } else {
        await creerProspect(input);
      }
      setFormOuvert(false);
      setProspectEdition(null);
      await recharger();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur d'enregistrement");
    }
  }

  async function handleSupprimer(p: Prospect) {
    if (!confirm(`Supprimer définitivement le prospect "${p.nom}" ?`)) return;
    try {
      await supprimerProspect(p.id);
      await recharger();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleConvertir(p: Prospect) {
    if (
      !confirm(
        `Convertir "${p.nom}" en client ? Une fiche client sera créée avec ses coordonnées.`
      )
    ) {
      return;
    }
    try {
      await convertirEnClient(p.id);
      setImportMsg(`✓ "${p.nom}" converti en client.`);
      await recharger();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="min-h-screen bg-bg text-textPrimary">
      <NavBar />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">Prospects</h1>
            <p className="text-sm text-textMuted">
              {prospects.length} prospect(s) au total
              {prospectsFiltres.length !== prospects.length &&
                ` — ${prospectsFiltres.length} affiché(s)`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setVue(vue === "liste" ? "carte" : "liste")}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-surfaceAlt"
            >
              {vue === "liste" ? "🗺️ Voir la carte" : "📋 Voir la liste"}
            </button>
            <button
              onClick={() => setCsvOuvert((v) => !v)}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-surfaceAlt"
            >
              📥 Importer CSV
            </button>
            <button
              onClick={handleSeedImport}
              disabled={seedEnCours}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-surfaceAlt disabled:opacity-50"
            >
              {seedEnCours
                ? "Import…"
                : `📦 Importer le seed (${PROSPECTS_BRUTS.length})`}
            </button>
            <button
              onClick={() => {
                setProspectEdition(null);
                setFormOuvert(true);
              }}
              className="rounded-lg bg-violet px-3 py-1.5 text-sm font-medium text-white hover:bg-violet/90"
            >
              + Nouveau
            </button>
          </div>
        </header>

        {importMsg && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm">
            <span>{importMsg}</span>
            <button
              onClick={() => setImportMsg(null)}
              className="ml-3 text-xs text-textMuted hover:text-textPrimary"
            >
              ✕
            </button>
          </div>
        )}

        {erreur && (
          <div className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber">
            {erreur}
          </div>
        )}

        {csvOuvert && (
          <CsvImportPanel
            titre="Prospects"
            champs={CSV_CHAMPS}
            modeleColonnes={[
              "nom",
              "secteur",
              "telephone",
              "email",
              "adresse",
              "statut",
              "notes",
            ]}
            onImporter={handleCsvImport}
            onFermer={() => setCsvOuvert(false)}
          />
        )}

        {formOuvert && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 space-y-3 rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-display text-lg">
              {prospectEdition ? "Modifier le prospect" : "Nouveau prospect"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-textMuted">Nom *</span>
                <input
                  name="nom"
                  required
                  defaultValue={prospectEdition?.nom ?? ""}
                  className="block w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-textMuted">Secteur</span>
                <select
                  name="secteur"
                  defaultValue={prospectEdition?.secteur ?? ""}
                  className="block w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {SECTEURS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-textMuted">Téléphone</span>
                <input
                  name="telephone"
                  defaultValue={prospectEdition?.telephone ?? ""}
                  className="block w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-textMuted">Email</span>
                <input
                  type="email"
                  name="email"
                  defaultValue={prospectEdition?.email ?? ""}
                  className="block w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-textMuted">Adresse</span>
                <input
                  name="adresse"
                  defaultValue={prospectEdition?.adresse ?? ""}
                  className="block w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-textMuted">Statut</span>
                <select
                  name="statut"
                  defaultValue={prospectEdition?.statut ?? "a_contacter"}
                  className="block w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm"
                >
                  {STATUTS.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-textMuted">Notes</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={prospectEdition?.notes ?? ""}
                  className="block w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
              >
                {prospectEdition ? "Enregistrer" : "Créer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOuvert(false);
                  setProspectEdition(null);
                }}
                className="text-sm text-textMuted hover:text-textPrimary"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={filtreSecteur}
            onChange={(e) => setFiltreSecteur(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          >
            <option value="">Tous les secteurs</option>
            {SECTEURS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {vue === "liste" ? (
          <ListeProspects
            prospects={prospectsFiltres}
            chargement={chargement}
            onModifier={(p) => {
              setProspectEdition(p);
              setFormOuvert(true);
            }}
            onSupprimer={handleSupprimer}
            onConvertir={handleConvertir}
          />
        ) : (
          <CarteProspects
            prospects={prospectsFiltres}
            onCoordsTrouvees={async (id, lat, lon) => {
              const p = prospects.find((x) => x.id === id);
              if (!p) return;
              try {
                await modifierProspect(id, {
                  nom: p.nom,
                  secteur: p.secteur ?? undefined,
                  telephone: p.telephone ?? undefined,
                  email: p.email ?? undefined,
                  adresse: p.adresse ?? undefined,
                  latitude: lat,
                  longitude: lon,
                  statut: p.statut,
                  notes: p.notes ?? undefined,
                });
                setProspects((prev) =>
                  prev.map((x) =>
                    x.id === id ? { ...x, latitude: lat, longitude: lon } : x
                  )
                );
              } catch {
                // silencieux : tant pis pour ce prospect, on continue
              }
            }}
          />
        )}
      </main>
    </div>
  );
}

// --- Liste --------------------------------------------------------------

function ListeProspects(props: {
  prospects: Prospect[];
  chargement: boolean;
  onModifier: (p: Prospect) => void;
  onSupprimer: (p: Prospect) => void;
  onConvertir: (p: Prospect) => void;
}) {
  if (props.chargement) {
    return <p className="text-sm text-textMuted">Chargement…</p>;
  }
  if (props.prospects.length === 0) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-textMuted">
        Aucun prospect — utilise « + Nouveau », l'import CSV ou le seed pour
        démarrer.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {props.prospects.map((p) => (
        <li
          key={p.id}
          className="rounded-xl border border-line bg-surface p-4 transition hover:border-violet/40"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-base text-textPrimary">
                  {p.nom}
                </h3>
                {p.secteur && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                    style={{ background: couleurSecteur(p.secteur) }}
                  >
                    {p.secteur}
                  </span>
                )}
                <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-textMuted">
                  {labelStatut(p.statut)}
                </span>
              </div>
              {p.adresse && (
                <p className="mt-1 text-xs text-textMuted">📍 {p.adresse}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-textMuted">
                {p.telephone && <span>📞 {p.telephone}</span>}
                {p.email && <span>✉️ {p.email}</span>}
              </div>
              {p.notes && (
                <p className="mt-2 text-xs text-textMuted">{p.notes}</p>
              )}
            </div>
            <div className="flex flex-shrink-0 gap-2">
              {p.statut !== "converti" && (
                <button
                  onClick={() => props.onConvertir(p)}
                  className="rounded-lg border border-teal/40 bg-teal/10 px-2.5 py-1 text-xs text-teal hover:bg-teal/20"
                >
                  → Client
                </button>
              )}
              <button
                onClick={() => props.onModifier(p)}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-textPrimary"
              >
                Modifier
              </button>
              <button
                onClick={() => props.onSupprimer(p)}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-textMuted hover:text-amber"
              >
                ✕
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

// --- Carte (Leaflet via CDN, géocodage Nominatim 1 req/sec) -------------

function CarteProspects(props: {
  prospects: Prospect[];
  onCoordsTrouvees: (
    id: string,
    lat: number,
    lon: number
  ) => void | Promise<void>;
}) {
  const [pretLeaflet, setPretLeaflet] = useState(false);
  const [geocodingRestant, setGeocodingRestant] = useState(0);

  // Charge Leaflet via CDN une seule fois (pas de dépendance npm à ajouter)
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).L) {
      setPretLeaflet(true);
      return;
    }
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setPretLeaflet(true);
    document.head.appendChild(script);
  }, []);

  // Géocode les prospects sans coordonnées (1 requête/seconde — limite Nominatim)
  useEffect(() => {
    const aGeocoder = props.prospects.filter(
      (p) => p.adresse && (p.latitude == null || p.longitude == null)
    );
    setGeocodingRestant(aGeocoder.length);
    if (aGeocoder.length === 0) return;

    let annule = false;
    (async () => {
      for (const p of aGeocoder) {
        if (annule) return;
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            p.adresse!
          )}`;
          const res = await fetch(url, {
            headers: { "Accept-Language": "fr" },
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data[0]) {
              const lat = parseFloat(data[0].lat);
              const lon = parseFloat(data[0].lon);
              if (!isNaN(lat) && !isNaN(lon)) {
                await props.onCoordsTrouvees(p.id, lat, lon);
              }
            }
          }
        } catch {
          // ignore, on continue
        }
        setGeocodingRestant((n) => Math.max(0, n - 1));
        await new Promise((r) => setTimeout(r, 1100));
      }
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.prospects.length, pretLeaflet]);

  // Rendu de la carte (re-rendu à chaque changement de liste filtrée)
  useEffect(() => {
    if (!pretLeaflet) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).L;
    if (!L) return;
    const el = document.getElementById("carte-prospects");
    if (!el) return;

    // Leaflet n'aime pas être initialisé 2x sur la même div : on réinitialise
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((el as any)._leaflet_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (el as any)._leaflet_id = null;
      el.innerHTML = "";
    }

    const pointsValides = props.prospects.filter(
      (p) => p.latitude != null && p.longitude != null
    );
    const centreParDefaut: [number, number] = [43.95, 7.3]; // Vésubie/Lantosque
    const centre: [number, number] =
      pointsValides.length > 0
        ? [pointsValides[0].latitude!, pointsValides[0].longitude!]
        : centreParDefaut;

    const map = L.map(el).setView(centre, pointsValides.length > 0 ? 10 : 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    pointsValides.forEach((p) => {
      const couleur = couleurSecteur(p.secteur);
      const marker = L.circleMarker([p.latitude!, p.longitude!], {
        radius: 8,
        fillColor: couleur,
        color: "#fff",
        weight: 2,
        fillOpacity: 0.9,
      }).addTo(map);
      marker.bindPopup(
        `<strong>${escapeHtml(p.nom)}</strong><br/>${escapeHtml(
          p.secteur ?? ""
        )}<br/>${escapeHtml(p.adresse ?? "")}<br/>${escapeHtml(
          p.telephone ?? ""
        )}`
      );
    });

    if (pointsValides.length > 1) {
      const bounds = L.latLngBounds(
        pointsValides.map((p) => [p.latitude!, p.longitude!])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    return () => {
      map.remove();
    };
  }, [pretLeaflet, props.prospects]);

  return (
    <div>
      {geocodingRestant > 0 && (
        <p className="mb-2 text-xs text-textMuted">
          ⏳ Localisation de {geocodingRestant} prospect(s) en cours… (1
          adresse/seconde via OpenStreetMap)
        </p>
      )}
      <div
        id="carte-prospects"
        className="rounded-xl border border-line"
        style={{ height: "600px", width: "100%" }}
      />
      <p className="mt-2 text-xs text-textMuted">
        Points violets : médical / SSIAD / IDEL / PSDM · Points turquoise :
        artisans / BTP
      </p>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
