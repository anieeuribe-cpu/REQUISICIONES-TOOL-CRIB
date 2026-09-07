import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import { formatUSD } from "@/lib/business";
import { dataStore } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const requisiciones = await dataStore.listarRequisiciones();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-navy">Historial de requisiciones</h1>
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
            {requisiciones.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Aún no hay requisiciones.
                </td>
              </tr>
            )}
            {requisiciones.map((r) => (
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
