"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import OriginBadge from "./OriginBadge";
import type { Origen } from "@/lib/types";

export default function OrigenEditable({
  folio,
  renglonId,
  origen
}: {
  folio: string;
  renglonId: number;
  origen: Origen;
}) {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar() {
    const nuevoOrigen: Origen = origen === "Americana" ? "Mexicana" : "Americana";
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/requisiciones/${folio}/renglones/${renglonId}/origen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origen: nuevoOrigen })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo actualizar el origen.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={cambiar} disabled={guardando} className="w-fit disabled:opacity-50">
        <OriginBadge origen={origen} />
      </button>
      {error && <p className="text-[10px] text-estado-rechazada">{error}</p>}
    </div>
  );
}
