"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SignaturePad from "@/components/SignaturePad";
import { DevisPublic } from "@/lib/types";
import { getDevisPublic, signerDevisPublic, calculerTotaux, ApiError } from "@/lib/api";

export default function SignerPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [devis, setDevis] = useState<DevisPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState(false);

  function charger() {
    setLoading(true);
    getDevisPublic(token)
      .then(setDevis)
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.message : "Lien invalide ou expiré."
        )
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    charger();
  }, [token]);

  async function handleSigner(dataUrl: string) {
    setSignature(true);
    setError(null);
    try {
      const misAJour = await signerDevisPublic(token, dataUrl);
      setDevis(misAJour);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Erreur lors de la signature."
      );
    } finally {
      setSignature(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-textMuted">Chargement du devis…</p>
      </main>
    );
  }

  if (error && !devis) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <p className="font-display text-lg text-amber">{error}</p>
          <p className="mt-2 text-sm text-textMuted">
            Vérifie le lien reçu par email, ou contacte Mutatech.
          </p>
        </div>
      </main>
    );
  }

  if (!devis) return null;

  const { totalHt, totalTva, totalTtc } = calculerTotaux(
    devis.lignes,
    devis.taux_tva
  );
  const dejaSigne = !!devis.signe_le;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-8 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-teal">
          Mutatech
        </p>
        <h1 className="mt-2 font-display text-2xl text-textPrimary">
          Devis {devis.numero}
        </h1>
        <p className="mt-1 text-sm text-textMuted">Pour {devis.client_nom}</p>
      </header>

      <div className="space-y-6 rounded-xl border border-line bg-surface p-5 sm:p-8">
        {devis.objet && (
          <p className="text-sm text-textPrimary">
            <span className="text-textMuted">Objet : </span>
            {devis.objet}
          </p>
        )}

        {devis.contexte && (
          <p className="text-sm italic text-textMuted">{devis.contexte}</p>
        )}

        <div className="space-y-2">
          {devis.lignes.map((ligne, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-line pb-2 text-sm"
            >
              <span className="text-textPrimary">{ligne.description}</span>
              <span className="text-textMuted">
                {ligne.quantite} × {ligne.prix_unitaire.toFixed(2)} € ={" "}
                <span className="text-textPrimary">
                  {(ligne.quantite * ligne.prix_unitaire).toFixed(2)} €
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1 text-right text-sm">
          <p className="text-textMuted">Total HT : {totalHt.toFixed(2)} €</p>
          <p className="text-textMuted">TVA : {totalTva.toFixed(2)} €</p>
          <p className="font-display text-base font-bold text-teal">
            Total TTC : {totalTtc.toFixed(2)} €
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber">
            {error}
          </p>
        )}

        <div className="border-t border-line pt-6">
          {dejaSigne ? (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-teal/30 bg-teal/10 text-xl">
                ✓
              </div>
              <p className="font-display text-sm text-teal">
                Document signé électroniquement
              </p>
              {devis.signe_le && (
                <p className="mt-1 text-xs text-textMuted">
                  le{" "}
                  {new Date(devis.signe_le).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {devis.signature_image && (
                <img
                  src={devis.signature_image}
                  alt="Signature"
                  className="mx-auto mt-4 h-20 rounded bg-white p-2"
                />
              )}
            </div>
          ) : (
            <div>
              <p className="mb-3 text-center text-sm text-textPrimary">
                Bon pour accord — signez ci-dessous pour valider ce devis.
              </p>
              <SignaturePad onValider={handleSigner} />
              {signature && (
                <p className="mt-2 text-center text-xs text-violet">
                  Enregistrement de la signature…
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-textMuted">
        Mutatech — contact@mutatech.fr
      </p>
    </main>
  );
}
