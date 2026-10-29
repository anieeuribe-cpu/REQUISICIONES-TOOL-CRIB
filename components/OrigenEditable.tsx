"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import OriginBadge from "./OriginBadge";

const OPCIONES = ["Americana", "Mexicana", "Otro"];

function opcionInicial(origen: string): string {
  return OPCIONES.includes(origen) ? origen : "Otro";
}

export default function OrigenEditable({
  folio,
  renglonId,
  origen
}: {
  folio: string;
  renglonId: number;
  origen: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [opcion, setOpcion] = useState(() => opcionInicial(origen));
  const [otroTexto, setOtroTexto] = useState(() => (opcionInicial(origen) === "Otro" ? origen : ""));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Se muestra de inmediato al guardar, sin esperar a router.refresh() (que
  // no avisa cuándo termina): si no, al cerrar el editor se alcanzaba a ver
  // un instante el origen VIEJO (el prop `origen` sigue siendo el de antes
  // hasta que el refresh trae los datos nuevos). Como siempre coincide con
  // lo que el refresh va a confirmar, no hay que revertirlo después.
  const [valorOptimista, setValorOptimista] = useState<string | null>(null);
  const origenMostrado = valorOptimista ?? origen;

  async function guardar() {
    const nuevoOrigen = opcion === "Otro" ? otroTexto.trim() : opcion;
    if (!nuevoOrigen) {
      setError("Escribe el origen.");
      return;
    }
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
      setValorOptimista(nuevoOrigen);
      setEditando(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpcion(opcionInicial(origenMostrado));
          setOtroTexto(opcionInicial(origenMostrado) === "Otro" ? origenMostrado : "");
          setEditando(true);
        }}
        className="w-fit"
      >
        <OriginBadge origen={origenMostrado} />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <select className="input-field w-32 text-xs" value={opcion} onChange={(e) => setOpcion(e.target.value)}>
        {OPCIONES.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {opcion === "Otro" && (
        <input
          className="input-field w-32 text-xs"
          placeholder="Especifica el origen"
          value={otroTexto}
          onChange={(e) => setOtroTexto(e.target.value)}
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="text-xs font-semibold text-navy hover:underline disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          disabled={guardando}
          className="text-xs text-gray-500 hover:underline"
        >
          Cancelar
        </button>
      </div>
      {error && <p className="text-[10px] text-estado-rechazada">{error}</p>}
    </div>
  );
}
