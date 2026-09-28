"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { formatUSD } from "@/lib/business";
import type { EstadoRequisicion, Requisicion } from "@/lib/types";

type ClaveFiltro = "Todas" | EstadoRequisicion;

const FILTROS: { clave: ClaveFiltro; etiqueta: string; color: string }[] = [
  { clave: "Todas", etiqueta: "Todas", color: "#374151" },
  { clave: "Pendiente", etiqueta: "Pendientes por autorizar", color: "#b8860b" },
  { clave: "Aprobada", etiqueta: "Pendientes por surtir", color: "#1c7c3f" },
  { clave: "Rechazada", etiqueta: "Rechazadas", color: "#b91c1c" },
  { clave: "Surtida", etiqueta: "Surtidas", color: "#0f1c3f" }
];

export default function HistorialFiltros({ requisiciones }: { requisiciones: Requisicion[] }) {
  const [filtro, setFiltro] = useState<ClaveFiltro>("Todas");

  const conteos = useMemo(() => {
    const c: Record<ClaveFiltro, number> = {
      Todas: requisiciones.length,
      Pendiente: 0,
      Aprobada: 0,
      Rechazada: 0,
      Surtida: 0
    };
    for (const r of requisiciones) c[r.estado]++;
    return c;
  }, [requisiciones]);

  const filtradas = filtro === "Todas" ? requisiciones : requisiciones.filter((r) => r.estado === filtro);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const activo = filtro === f.clave;
          return (
            <button
              key={f.clave}
              type="button"
              onClick={() => setFiltro(f.clave)}
              className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
              style={
                activo
                  ? { backgroundColor: f.color, borderColor: f.color, color: "#fff" }
                  : { backgroundColor: "#fff", borderColor: f.color, color: f.color }
              }
            >
              {conteos[f.clave]} {f.etiqueta}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {filtradas.length === 0 && (
          <div className="card px-4 py-8 text-center text-sm text-gray-500">No hay requisiciones en este filtro.</div>
        )}
        {filtradas.map((r) => (
          <Link
            key={r.folio}
            href={`/requisiciones/${r.folio}`}
            className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:border-navy-200 hover:shadow"
          >
            <div>
              <p className="text-sm font-bold text-navy">Folio: {r.folio}</p>
              <p className="text-xs text-gray-500">
                {r.areaDepto} · {r.nombre} · {r.fecha} · {formatUSD(r.totalUSD)} · Firma {r.nivelAprobacion}
              </p>
            </div>
            <StatusBadge estado={r.estado} />
          </Link>
        ))}
      </div>
    </div>
  );
}
