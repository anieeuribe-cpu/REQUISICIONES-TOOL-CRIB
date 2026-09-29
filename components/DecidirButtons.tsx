"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DecidirButtons({ folio }: { folio: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);

  async function decidir(decision: "Aprobada" | "Rechazada") {
    if (decision === "Rechazada" && !pidiendoMotivo) {
      setPidiendoMotivo(true);
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/requisiciones/${folio}/decidir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, motivoRechazo: decision === "Rechazada" ? motivo : undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo registrar la decisión.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {pidiendoMotivo && (
        <input
          className="input-field"
          placeholder="Motivo del rechazo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary border-estado-rechazada text-estado-rechazada hover:bg-red-50"
          onClick={() => decidir("Rechazada")}
          disabled={enviando}
        >
          {enviando ? "Rechazando…" : pidiendoMotivo ? "Confirmar rechazo" : "Rechazar"}
        </button>
        <button type="button" className="btn-primary" onClick={() => decidir("Aprobada")} disabled={enviando}>
          {enviando ? "Aprobando…" : "Aprobar"}
        </button>
      </div>
      {error && <p className="text-xs text-estado-rechazada">{error}</p>}
    </div>
  );
}
