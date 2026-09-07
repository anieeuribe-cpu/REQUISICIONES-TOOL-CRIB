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
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
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
