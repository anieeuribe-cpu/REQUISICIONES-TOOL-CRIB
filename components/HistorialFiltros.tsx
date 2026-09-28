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

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-navy-50 text-left text-xs uppercase text-navy-700">
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Área/Dpto</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Firma requerida</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No hay requisiciones en este filtro.
                </td>
              </tr>
            )}
            {filtradas.map((r) => (
              <tr key={r.folio} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-navy">{r.folio}</td>
                <td className="px-4 py-3">{r.nombre}</td>
                <td className="px-4 py-3">{r.areaDepto}</td>
                <td className="px-4 py-3">{r.fecha}</td>
                <td className="px-4 py-3 font-medium">{formatUSD(r.totalUSD)}</td>
                <td className="px-4 py-3">{r.nivelAprobacion}</td>
                <td className="px-4 py-3">
                  <StatusBadge estado={r.estado} />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/requisiciones/${r.folio}`} className="text-sm font-medium text-navy hover:underline">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
