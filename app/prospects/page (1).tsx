"use client";

import { useEffect, useRef, useState } from "react";
import NavBar from "@/components/NavBar";
import { Prospect, ProspectInput } from "@/lib/types";
import {
  getProspects,
  creerProspect,
  modifierProspect,
  supprimerProspect,
  convertirEnClient,
  importerProspectsLot,
  ApiError,
} from "@/lib/api";
import { PROSPECTS_BRUTS, mapperProspect } from "@/lib/seed-prospects";

const PROSPECT_VIDE: ProspectInput = {
  nom: "",
  secteur: "SSIAD",
  email: "",
  telephone: "",
  adresse: "",
  statut: "a_contacter",
  notes: "",
};

const STATUT_LABEL: Record<string, string> = {
  a_contacter: "À contacter",
  contacte: "Contacté",
  rdv_planifie: "RDV planifié",
  converti: "Converti",
  perdu: "Perdu",
};

const STATUT_COULEUR: Record<string, string> = {
  a_contacter: "text-textMuted border-line",
  contacte: "text-violet border-violet/40 bg-violet/10",
  rdv_planifie: "text-amber border-amber/40 bg-amber/10",
  converti: "text-teal border-teal/40 bg-teal/10",
  perdu: "text-textMuted border-line opacity-60",
};

const STATUT_MARKER: Record<string, string> = {
  a_contacter: "#77778A",
  contacte: "#6C63FF",
  rdv_planifie: "#F5A623",
  converti: "#00D4AA",
  perdu: "#444",
};

const FILTRES_NICHE = [
  { id: "all", label: "Tous" },
  { id: "SSIAD", label: "SSIAD" },
  { id: "Cabinet médical", label: "Médical" },
  { id: "Artisan", label: "Artisans" },
];

const VUE_MODES = [
  { id: "liste", label: "📋 Liste" },
  { id: "carte", label: "🗺️ Carte" },
];

// Cache géocodage en mémoire (évite de re-géocoder à chaque rendu)
const geoCache: Record<string, [number, number]> = {};

async function geocodeAdresse(adresse: string): Promise<[number, number] | null> {
  if (!adresse) return null;
  if (geoCache[adresse]) return geoCache[adresse];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(adresse)}&limit=1&countrycodes=fr`;
    const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
    const data = await res.json();
    if (data && data[0]) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geoCache[adresse] = coords;
      return coords;
    }
  } catch {}
  return null;
}

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [formOuvert, setFormOuvert] = useState(false);
  const [prospectEnEdition, setProspectEnEdition] = useState<string | null>(null);
  const [form, setForm] = useState<ProspectInput>({ ...PROSPECT_VIDE });
  const [enregistrement, setEnregistrement] = useState(false);
  const [conversionEnCours, setConversionEnCours] = useState<string | null>(null);
  const [importEnCours, setImportEnCours] = useState(false);
  const [filtreNiche, setFiltreNiche] = useState("all");
  const [vue, setVue] = useState<"liste" | "carte">("liste");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  function charger() {
    setLoading(true);
    getProspects()
      .then(setProspects)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { charger(); }, []);

  // Initialise et peuple la carte Leaflet quand on passe en vue carte
  useEffect(() => {
    if (vue !== "carte" || !mapRef.current) return;

    let cancelled = false;

    async function initMap() {
      // Import Leaflet dynamiquement (pas de SSR)
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css" as any);

      if (cancelled || !mapRef.current) return;

      // Détruit la carte précédente si elle existe
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current).setView([43.85, 7.3], 10);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      const prospectsFiltres =
        filtreNiche === "all"
          ? prospects
          : prospects.filter((p) => p.secteur === filtreNiche);

      // Géocode et pose les marqueurs
      for (const prospect of prospectsFiltres) {
        if (cancelled) break;

        let coords: [number, number] | null = null;

        // Utilise les coordonnées stockées en base si disponibles
        if (prospect.latitude && prospect.longitude) {
          coords = [prospect.latitude, prospect.longitude];
        } else if (prospect.adresse) {
          coords = await geocodeAdresse(prospect.adresse);
        }

        if (!coords || cancelled) continue;

        const couleur = STATUT_MARKER[prospect.statut] || "#77778A";

        const icon = L.divIcon({
          html: `<div style="
            width:12px;height:12px;border-radius:50%;
            background:${couleur};border:2px solid white;
            box-shadow:0 1px 3px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          className: "",
        });

        L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(`
            <strong style="font-size:13px">${prospect.nom}</strong><br>
            <span style="font-size:11px;color:#666">${prospect.secteur || ""}</span><br>
            <span style="font-size:11px">${prospect.telephone || ""}</span><br>
            <span style="font-size:11px;color:${couleur};font-weight:600">${STATUT_LABEL[prospect.statut]}</span>
          `);
      }
    }

    initMap();
    return () => { cancelled = true; };
  }, [vue, prospects, filtreNiche]);

  // Nettoie la carte en quittant la vue carte
  useEffect(() => {
    if (vue !== "carte" && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, [vue]);

  function ouvrirNouveau() {
    setForm({ ...PROSPECT_VIDE });
    setProspectEnEdition(null);
    setFormOuvert(true);
  }

  function ouvrirEdition(prospect: Prospect) {
    setForm({
      nom: prospect.nom,
      secteur: prospect.secteur || "SSIAD",
      email: prospect.email || "",
      telephone: prospect.telephone || "",
      adresse: prospect.adresse || "",
      statut: prospect.statut,
      notes: prospect.notes || "",
    });
    setProspectEnEdition(prospect.id);
    setFormOuvert(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnregistrement(true);
    setError(null);
    try {
      if (prospectEnEdition) {
        await modifierProspect(prospectEnEdition, form);
      } else {
        await creerProspect(form);
      }
      setFormOuvert(false);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'enregistrement");
    } finally {
      setEnregistrement(false);
    }
  }

  async function handleSupprimer(id: string) {
    if (!confirm("Supprimer ce prospect ?")) return;
    try {
      await supprimerProspect(id);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de suppression");
    }
  }

  async function handleConvertir(prospect: Prospect) {
    if (!confirm(`Transformer "${prospect.nom}" en client ?`)) return;
    setConversionEnCours(prospect.id);
    setError(null);
    setInfo(null);
    try {
      await convertirEnClient(prospect.id);
      setInfo(`"${prospect.nom}" a été ajouté à tes clients !`);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur de conversion");
    } finally {
      setConversionEnCours(null);
    }
  }

  async function handleImporter() {
    if (!confirm(`Importer les ${PROSPECTS_BRUTS.length} prospects de l'ancien gestionnaire HTML ? À faire une seule fois.`)) return;
    setImportEnCours(true);
    setError(null);
    try {
      const donnees = PROSPECTS_BRUTS.map(mapperProspect);
      await importerProspectsLot(donnees);
      charger();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur d'import");
    } finally {
      setImportEnCours(false);
    }
  }

  const prospectsFiltres =
    filtreNiche === "all"
      ? prospects
      : prospects.filter((p) => p.secteur === filtreNiche);

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* En-tête */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-textPrimary">
            Prospects{" "}
            {prospects.length > 0 && (
              <span className="ml-2 font-mono text-sm font-normal text-textMuted">
                ({prospects.length})
              </span>
            )}
          </h1>
          <button
            onClick={ouvrirNouveau}
            className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
          >
            + Nouveau prospect
          </button>
        </div>

        {/* Messages */}
        {error && (
          <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}
        {info && (
          <p className="mb-4 rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-sm text-teal">
            {info}
          </p>
        )}

        {/* Bouton import si vide */}
        {!loading && prospects.length === 0 && (
          <div className="mb-6 rounded-lg border border-dashed border-violet/40 bg-violet/5 p-4">
            <p className="mb-2 text-sm text-textPrimary">Aucun prospect en base.</p>
            <button
              onClick={handleImporter}
              disabled={importEnCours}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
            >
              {importEnCours ? "Import en cours…" : `Importer les ${PROSPECTS_BRUTS.length} prospects existants`}
            </button>
          </div>
        )}

        {/* Formulaire */}
        {formOuvert && (
          <form
            onSubmit={handleSubmit}
            className="mb-8 space-y-4 rounded-xl border border-line bg-surface p-5"
          >
            <h2 className="font-display text-lg text-textPrimary">
              {prospectEnEdition ? "Modifier le prospect" : "Nouveau prospect"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Nom</span>
                <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Secteur</span>
                <select value={form.secteur} onChange={(e) => setForm({ ...form, secteur: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  <option value="SSIAD">SSIAD</option>
                  <option value="PME">PME</option>
                  <option value="Artisan">Artisan</option>
                  <option value="Cabinet médical">Cabinet médical</option>
                  <option value="Autre">Autre</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Téléphone</span>
                <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Adresse</span>
                <textarea value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Statut</span>
                <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary">
                  <option value="a_contacter">À contacter</option>
                  <option value="contacte">Contacté</option>
                  <option value="rdv_planifie">RDV planifié</option>
                  <option value="perdu">Perdu</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Notes</span>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary" />
              </label>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50">
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button type="button" onClick={() => setFormOuvert(false)}
                className="text-sm text-textMuted hover:text-textPrimary">Annuler</button>
            </div>
          </form>
        )}

        {/* Filtres + toggle vue */}
        {prospects.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {FILTRES_NICHE.map((f) => (
                <button key={f.id} onClick={() => setFiltreNiche(f.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    filtreNiche === f.id
                      ? "border-violet bg-violet text-white"
                      : "border-line text-textMuted hover:text-textPrimary"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 rounded-lg border border-line p-1">
              {VUE_MODES.map((m) => (
                <button key={m.id} onClick={() => setVue(m.id as "liste" | "carte")}
                  className={`rounded px-3 py-1 text-xs font-medium transition ${
                    vue === m.id
                      ? "bg-violet text-white"
                      : "text-textMuted hover:text-textPrimary"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-textMuted">Chargement…</p>
        ) : vue === "carte" ? (
          <div className="overflow-hidden rounded-xl border border-line">
            <div ref={mapRef} style={{ height: "520px", width: "100%" }} />
            <div className="flex flex-wrap gap-4 border-t border-line bg-surface px-4 py-3">
              {Object.entries(STATUT_MARKER).map(([statut, couleur]) => (
                <span key={statut} className="flex items-center gap-1.5 text-xs text-textMuted">
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: couleur, display: "inline-block", border: "1.5px solid white" }} />
                  {STATUT_LABEL[statut]}
                </span>
              ))}
            </div>
          </div>
        ) : prospectsFiltres.length === 0 ? (
          prospects.length > 0 && <p className="text-sm text-textMuted">Aucun prospect dans ce filtre.</p>
        ) : (
          <div className="space-y-2">
            {prospectsFiltres.map((prospect) => (
              <div key={prospect.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4">
                <div className="flex-1">
                  <p className="font-display text-sm font-bold text-textPrimary">
                    {prospect.nom}{" "}
                    <span className="ml-2 font-mono text-xs font-normal text-textMuted">
                      {prospect.secteur}
                    </span>
                  </p>
                  <p className="text-xs text-textMuted">
                    {prospect.telephone || "—"}
                    {prospect.notes ? ` · ${prospect.notes}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`whitespace-nowrap rounded border px-2 py-1 text-xs font-medium ${STATUT_COULEUR[prospect.statut]}`}>
                    {STATUT_LABEL[prospect.statut]}
                  </span>
                  {prospect.statut !== "converti" && (
                    <button onClick={() => handleConvertir(prospect)} disabled={conversionEnCours === prospect.id}
                      className="whitespace-nowrap rounded bg-teal px-3 py-1.5 text-xs font-medium text-ink hover:bg-teal/90 disabled:opacity-50">
                      {conversionEnCours === prospect.id ? "…" : "Convertir en client"}
                    </button>
                  )}
                  <button onClick={() => ouvrirEdition(prospect)} className="text-xs text-violet hover:text-teal">
                    Modifier
                  </button>
                  <button onClick={() => handleSupprimer(prospect.id)} className="text-xs text-textMuted hover:text-amber">
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
