"use client";

// Decor pur CSS (aucun cout JS au-dela du rendu initial) -- rendu
// uniquement quand le theme "Sakura Kawaii" est actif (voir NavBar.tsx).
// Chaque petale a sa propre position/duree/delai pour eviter un effet
// de vague trop mecanique. pointer-events: none (voir globals.css) donc
// ne genent jamais les clics sous le decor.

const PETALES = Array.from({ length: 18 }, (_, i) => ({
  gauche: `${(i * 97) % 100}%`,
  dureeChute: 9 + (i % 5) * 2.2,
  dureeBalancement: 2.4 + (i % 3) * 0.6,
  delai: -(i * 1.3),
  taille: 10 + (i % 4) * 3,
}));

export default function FallingPetals() {
  return (
    <div className="sakura-petals" aria-hidden="true">
      {PETALES.map((p, i) => (
        <span
          key={i}
          className="sakura-petal"
          style={{
            left: p.gauche,
            width: p.taille,
            height: p.taille,
            animationDuration: `${p.dureeChute}s, ${p.dureeBalancement}s`,
            animationDelay: `${p.delai}s, ${p.delai}s`,
          }}
        />
      ))}
    </div>
  );
}
