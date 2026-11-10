"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SurtirButton({ folio }: { folio: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function marcarSurtida() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/requisiciones/${folio}/surtir`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo marcar como Surtida.");
      // No se reactiva el botón aquí: router.refresh() no avisa cuándo
      // termina, así que si se reactivaba de inmediato el botón volvía a
      // aparecer clickeable con el estado viejo (todavía "Aprobada") mientras
      // la pantalla traía los datos ya actualizados — eso se veía como que
      // el botón "reaparecía y luego se quitaba". Se deja en "Marcando…"
      // hasta que este botón desaparece solo (la requisición ya no es
      // "Aprobada" en la pantalla nueva). Solo se reactiva si hubo error.
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" className="btn-primary" onClick={marcarSurtida} disabled={enviando}>
        {enviando ? "Marcando…" : "Marcar como Surtida"}
      </button>
      {error && <p className="text-xs text-estado-rechazada">{error}</p>}
    </div>
  );
}
