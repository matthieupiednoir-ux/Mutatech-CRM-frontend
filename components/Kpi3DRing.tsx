"use client";

export interface KpiRingItem {
  label: string;
  valeur: string;
  couleur: string;
}

// Anneau de KPI en rotation 3D (CSS pur, pas de dependance Three.js
// supplementaire dans le CRM). Auto-rotation lente, mise en pause au
// survol pour laisser le temps de lire. Respecte prefers-reduced-motion
// via la regle globale deja presente dans globals.css.
export default function Kpi3DRing({ items }: { items: KpiRingItem[] }) {
  const n = items.length || 1;
  const rayon = n <= 4 ? 190 : 225;

  return (
    <div className="kpi3d-scene">
      <div className="kpi3d-ring" style={{ animationDuration: `${n * 4}s` }}>
        {items.map((item, i) => {
          const angle = (360 / n) * i;
          return (
            <div
              key={item.label}
              className="kpi3d-orb"
              style={{
                transform: `rotateY(${angle}deg) translateZ(${rayon}px)`,
                borderColor: item.couleur,
                boxShadow: `0 0 26px -6px ${item.couleur}`,
              }}
            >
              <p className="kpi3d-label">{item.label}</p>
              <p className="kpi3d-valeur" style={{ color: item.couleur }}>
                {item.valeur}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
