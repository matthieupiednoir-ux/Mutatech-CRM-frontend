"use client";

import { useEffect, useRef, useState } from "react";

export default function SignaturePad({
  onValider,
}: {
  onValider: (signatureDataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dessine, setDessine] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const enTrain = useRef(false);
  const dernier = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.strokeStyle = "#1A1A2E";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, []);

  function coords(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  }

  function debuter(e: React.MouseEvent | React.TouchEvent) {
    enTrain.current = true;
    dernier.current = coords(e);
    setErreur(null);
  }

  function dessiner(e: React.MouseEvent | React.TouchEvent) {
    if (!enTrain.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    const point = coords(e);
    if (ctx && dernier.current) {
      ctx.beginPath();
      ctx.moveTo(dernier.current.x, dernier.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    dernier.current = point;
    setDessine(true);
  }

  function arreter() {
    enTrain.current = false;
  }

  function effacer() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setDessine(false);
    setErreur(null);
  }

  function valider() {
    if (!dessine) {
      setErreur("Veuillez signer avant de valider.");
      return;
    }
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onValider(dataUrl);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="h-32 w-full touch-none rounded-lg border border-dashed border-line bg-surfaceAlt"
        onMouseDown={debuter}
        onMouseMove={dessiner}
        onMouseUp={arreter}
        onMouseLeave={arreter}
        onTouchStart={debuter}
        onTouchMove={dessiner}
        onTouchEnd={arreter}
      />
      {erreur && <p className="mt-1 text-xs text-amber">{erreur}</p>}
      <div className="mt-2 flex justify-center gap-2">
        <button
          type="button"
          onClick={effacer}
          className="rounded border border-line px-3 py-1.5 text-xs text-textMuted hover:text-textPrimary"
        >
          Effacer
        </button>
        <button
          type="button"
          onClick={valider}
          className="rounded bg-violet px-4 py-1.5 text-xs font-medium text-white hover:bg-violet/90"
        >
          Valider la signature
        </button>
      </div>
    </div>
  );
}
