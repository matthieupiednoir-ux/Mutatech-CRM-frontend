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

const FILTRES_NICHE = [
  { id: "all", label: "Tous" },
  { id: "SSIAD", label: "SSIAD" },
  { id: "Cabinet médical", label: "Médical" },
  { id: "PSDM", label: "PSDM" },
  { id: "Artisan", label: "Artisans" },
];

// Couleurs des points sur la carte par secteur
const COULEUR_CARTE: Record<string, string> = {
  SSIAD: "#a89eff",
  "Cabinet médical": "#a89eff",
  PSDM: "#f0b429",
  Artisan: "#5fe0c0",
  PME: "#77778A",
  Autre: "#77778A",
};

declare global {
  interface Window {
    L: any;
  }
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
  const [geoEnCours, setGeoEnCours] = useState(0);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const prospectsRef = useRef<Prospect[]>([]);
  prospectsRef.current = prospects;

  function charger() {
    setLoading(true);
    getProspects()
      .then(setProspects)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Erreur de chargement"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, []);

  // --- Carte (chargement Leaflet via CDN, géocodage à la volée) ---

  function chargerLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      if (window.L) {
        resolve();
        return;
      }
      const lien = document.createElement("link");
      lien.rel = "stylesheet";
      lien.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
      document.head.appendChild(lien);

      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  function initCarte() {
    if (!window.L || !mapDivRef.current || mapRef.current) return;
    mapRef.current = window.L.map(mapDivRef.current).setView([43.85, 7.28], 11);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapRef.current);
    layerRef.current = window.L.layerGroup().addTo(mapRef.current);
    rafraichirMarqueurs();
  }

  function rafraichirMarqueurs() {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();
    prospectsRef.current.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const couleur = COULEUR_CARTE[p.secteur || "Autre"] || "#77778A";
      const marker = window.L.circleMarker([p.latitude, p.longitude], {
        radius: 8,
        fillColor: couleur,
        color: "#0A0A0E",
        weight: 2,
        fillOpacity: 0.95,
      });
      marker.bindPopup(
        `<strong>${escapeHtml(p.nom)}</strong><br><span style="color:#666">${escapeHtml(p.secteur || "")}</span><br>${escapeHtml(p.adresse || "")}<br>${p.telephone ? `<a href="tel:${p.telephone}">📞 ${p.telephone}</a><br>` : ""}<em>${STATUT_LABEL[p.statut] || p.statut}</em>`
      );
      marker.addTo(layerRef.current);
    });
  }

  function escapeHtml(str: string) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  }

  async function geocoderAdresse(adresse: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(adresse);
      const res = await fetch(url);
      const data = await res.json();
      if (data && data[0]) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.warn("Géocodage impossible pour", adresse, e);
    }
    return null;
  }

  async function geocoderManquants() {
    const manquants = prospectsRef.current.filter(
      (p) => p.adresse && (p.latitude == null || p.longitude == null)
    );
    if (manquants.length === 0) return;
    setGeoEnCours(manquants.length);

    for (const p of manquants) {
      const coords = await geocoderAdresse(p.adresse!);
      if (coords) {
        try {
          await modifierProspect(p.id, {
            nom: p.nom,
            secteur: p.secteur || undefined,
            email: p.email || undefined,
            telephone: p.telephone || undefined,
            adresse: p.adresse || undefined,
            latitude: coords.lat,
            longitude: coords.lng,
            statut: p.statut,
            notes: p.notes || undefined,
          });
          // Met à jour localement sans tout recharger, pour afficher le marqueur immédiatement
          prospectsRef.current = prospectsRef.current.map((x) =>
            x.id === p.id ? { ...x, latitude: coords.lat, longitude: coords.lng } : x
          );
          setProspects([...prospectsRef.current]);
          rafraichirMarqueurs();
        } catch (e) {
          console.warn("Sauvegarde des coordonnées échouée pour", p.nom, e);
        }
      }
      setGeoEnCours((n) => Math.max(0, n - 1));
      // Respecte la limite d'1 requête/seconde de Nominatim (usage gratuit)
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  useEffect(() => {
    if (vue !== "carte") return;
    chargerLeaflet().then(() => {
      initCarte();
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
      geocoderManquants();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vue]);

  useEffect(() => {
    if (vue === "carte") rafraichirMarqueurs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prospects]);

  // --- CRUD standard ---

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
    if (
      !confirm(
        `Transformer "${prospect.nom}" en client ? Cette action créera une nouvelle fiche client avec ses coordonnées.`
      )
    )
      return;
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
    if (
      !confirm(
        `Importer les ${PROSPECTS_BRUTS.length} prospects de l'ancien gestionnaire HTML ? À faire une seule fois.`
      )
    )
      return;
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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl text-textPrimary">
            Prospects{" "}
            {prospects.length > 0 && (
              <span className="ml-2 font-mono text-sm font-normal text-textMuted">
                ({prospects.length})
              </span>
            )}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleImporter}
              disabled={importEnCours}
              className="rounded-lg border border-violet/40 px-4 py-2 text-sm font-medium text-violet hover:bg-violet/10 disabled:opacity-50"
            >
              {importEnCours
                ? "Import en cours…"
                : `Importer les ${PROSPECTS_BRUTS.length} prospects existants`}
            </button>
            <button
              onClick={ouvrirNouveau}
              className="rounded-lg bg-violet px-4 py-2 text-sm font-medium text-white hover:bg-violet/90"
            >
              + Nouveau prospect
            </button>
          </div>
        </div>

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

        {/* Onglets Liste / Carte */}
        <div className="mb-5 flex gap-1 border-b border-line">
          <button
            onClick={() => setVue("liste")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              vue === "liste"
                ? "border-violet text-textPrimary"
                : "border-transparent text-textMuted hover:text-textPrimary"
            }`}
          >
            📋 Liste
          </button>
          <button
            onClick={() => setVue("carte")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              vue === "carte"
                ? "border-violet text-textPrimary"
                : "border-transparent text-textMuted hover:text-textPrimary"
            }`}
          >
            🗺️ Carte
          </button>
        </div>

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
                <input
                  required
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Secteur</span>
                <select
                  value={form.secteur}
                  onChange={(e) => setForm({ ...form, secteur: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="SSIAD">SSIAD</option>
                  <option value="PME">PME</option>
                  <option value="Artisan">Artisan</option>
                  <option value="Cabinet médical">Cabinet médical</option>
                  <option value="PSDM">PSDM (prestataire / distributeur matériel)</option>
                  <option value="Autre">Autre</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Téléphone
                </span>
                <input
                  value={form.telephone}
                  onChange={(e) =>
                    setForm({ ...form, telephone: e.target.value })
                  }
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">
                  Adresse{" "}
                  <span className="text-textMuted/60">
                    (utilisée pour la localiser automatiquement sur la carte)
                  </span>
                </span>
                <textarea
                  value={form.adresse}
                  onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-textMuted">
                  Statut
                </span>
                <select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                >
                  <option value="a_contacter">À contacter</option>
                  <option value="contacte">Contacté</option>
                  <option value="rdv_planifie">RDV planifié</option>
                  <option value="perdu">Perdu</option>
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-textMuted">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surfaceAlt px-3 py-2 text-textPrimary"
                />
              </label>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={enregistrement}
                className="rounded-lg bg-violet px-5 py-2 text-sm font-medium text-white hover:bg-violet/90 disabled:opacity-50"
              >
                {enregistrement ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={() => setFormOuvert(false)}
                className="text-sm text-textMuted hover:text-textPrimary"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {vue === "carte" ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-textMuted">
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: "#a89eff" }}
                />
                Médical &amp; SSIAD
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: "#f0b429" }}
                />
                PSDM
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: "#5fe0c0" }}
                />
                Artisans &amp; BTP
              </span>
              {geoEnCours > 0 && (
                <span className="text-amber">
                  ⏳ Localisation de {geoEnCours} prospect(s) en cours…
                </span>
              )}
            </div>
            <div
              ref={mapDivRef}
              style={{ height: "560px" }}
              className="overflow-hidden rounded-xl border border-line"
            />
          </div>
        ) : (
          <>
            {prospects.length > 0 && (
              <div className="mb-4 flex gap-2">
                {FILTRES_NICHE.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFiltreNiche(f.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                      filtreNiche === f.id
                        ? "border-violet bg-violet text-white"
                        : "border-line text-textMuted hover:text-textPrimary"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <p className="text-sm text-textMuted">Chargement…</p>
            ) : prospectsFiltres.length === 0 ? (
              prospects.length > 0 && (
                <p className="text-sm text-textMuted">
                  Aucun prospect dans ce filtre.
                </p>
              )
            ) : (
              <div className="space-y-2">
                {prospectsFiltres.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4"
                  >
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
                      <span
                        className={`whitespace-nowrap rounded border px-2 py-1 text-xs font-medium ${STATUT_COULEUR[prospect.statut]}`}
                      >
                        {STATUT_LABEL[prospect.statut]}
                      </span>
                      {prospect.statut !== "converti" && (
                        <button
                          onClick={() => handleConvertir(prospect)}
                          disabled={conversionEnCours === prospect.id}
                          className="whitespace-nowrap rounded bg-teal px-3 py-1.5 text-xs font-medium text-ink hover:bg-teal/90 disabled:opacity-50"
                        >
                          {conversionEnCours === prospect.id
                            ? "…"
                            : "Convertir en client"}
                        </button>
                      )}
                      <button
                        onClick={() => ouvrirEdition(prospect)}
                        className="text-xs text-violet hover:text-teal"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleSupprimer(prospect.id)}
                        className="text-xs text-textMuted hover:text-amber"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
