"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Solo se renderiza en modo mock (DATA_MODE=mock). En producción esta
 * decisión la toma el aprobador desde el botón "Aprobar"/"Rechazar" del
 * correo (Power Automate), no desde la app — ver docs/POWER-AUTOMATE-FLOW.md.
 */
export default function DevAprobarPanel({ folio, aprobador }: { folio: string; aprobador?: string }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decidir(decision: "Aprobada" | "Rechazada") {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/dev/aprobar/${folio}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, motivoRechazo: motivo })
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
    <div className="card border-dashed border-navy-200 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-500">
        Modo demo — simula el correo de aprobación{aprobador ? ` (${aprobador})` : ""}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="input-field sm:max-w-xs"
          placeholder="Motivo si rechaza (opcional)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <div className="flex gap-2">
          <button type="button" className="btn-primary" disabled={enviando} onClick={() => decidir("Aprobada")}>
            Aprobar
          </button>
          <button
            type="button"
            className="btn-secondary border-estado-rechazada text-estado-rechazada hover:bg-red-50"
            disabled={enviando}
            onClick={() => decidir("Rechazada")}
          >
            Rechazar
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-estado-rechazada">{error}</p>}
    </div>
  );
}
