import { notFound } from "next/navigation";
import DevAprobarPanel from "@/components/DevAprobarPanel";
import OriginBadge from "@/components/OriginBadge";
import StatusBadge from "@/components/StatusBadge";
import SurtirButton from "@/components/SurtirButton";
import { formatMXN, formatUSD } from "@/lib/business";
import { dataStore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{etiqueta}</p>
      <p className="text-sm font-medium text-gray-900">{valor}</p>
    </div>
  );
}

export default async function DetalleRequisicionPage({ params }: { params: { folio: string } }) {
  const requisicion = await dataStore.obtenerRequisicion(params.folio);
  if (!requisicion) notFound();

  const usuario = getCurrentUser();
  const rol = usuario ? await dataStore.obtenerRol(usuario.correo) : null;
  const esModoMock = (process.env.DATA_MODE ?? "mock") === "mock";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-navy">{requisicion.folio}</h1>
        <StatusBadge estado={requisicion.estado} />
      </div>

      <section className="card grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6">
        <Dato etiqueta="Nombre" valor={requisicion.nombre} />
        <Dato etiqueta="No. de Reloj" valor={requisicion.noReloj} />
        <Dato etiqueta="Turno" valor={requisicion.turno} />
        <Dato etiqueta="Área/Dpto" valor={requisicion.areaDepto} />
        <Dato etiqueta="Fecha" valor={requisicion.fecha} />
        <Dato etiqueta="Solicitante" valor={requisicion.solicitanteCorreo} />
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy">Renglones</h2>
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-2">Número de parte</th>
              <th className="py-2 pr-2">Descripción</th>
              <th className="py-2 pr-2">Origen</th>
              <th className="py-2 pr-2">Cantidad</th>
              <th className="py-2 pr-2">Máquina</th>
              <th className="py-2 pr-2">Costo</th>
              <th className="py-2 pr-2">Localidad</th>
              <th className="py-2 pr-2">Importe</th>
            </tr>
          </thead>
          <tbody>
            {requisicion.renglones.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="py-2 pr-2 font-medium text-navy">
                  {r.numeroParte}
                  {r.capturaManual && (
                    <span className="ml-1.5 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                      Manual
                    </span>
                  )}
                </td>
                <td className="py-2 pr-2">{r.descripcion}</td>
                <td className="py-2 pr-2">
                  <OriginBadge origen={r.origen} />
                </td>
                <td className="py-2 pr-2">{r.cantidad}</td>
                <td className="py-2 pr-2">{r.maquina}</td>
                <td className="py-2 pr-2 whitespace-nowrap">
                  {r.moneda === "USD" ? formatUSD(r.costoUnitario) : formatMXN(r.costoUnitario)}
                </td>
                <td className="py-2 pr-2">{r.localidad}</td>
                <td className="py-2 pr-2 whitespace-nowrap font-medium">
                  {r.moneda === "USD"
                    ? formatUSD(r.cantidad * r.costoUnitario)
                    : formatMXN(r.cantidad * r.costoUnitario)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <Dato etiqueta="Total (USD)" valor={formatUSD(requisicion.totalUSD)} />
        <Dato etiqueta="Firma requerida" valor={requisicion.nivelAprobacion} />
        <Dato etiqueta="Aprobador asignado" valor={requisicion.aprobadorCorreo ?? "—"} />
        {requisicion.estado === "Aprobada" && rol?.esAlmacen && <SurtirButton folio={requisicion.folio} />}
      </section>

      {(requisicion.estado === "Aprobada" || requisicion.estado === "Rechazada" || requisicion.estado === "Surtida") && (
        <section className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Dato etiqueta="Decidido por" valor={requisicion.aprobadoPor ?? "—"} />
          <Dato etiqueta="Fecha de decisión" valor={requisicion.fechaAprobacion?.slice(0, 10) ?? "—"} />
          {requisicion.estado === "Rechazada" && (
            <Dato etiqueta="Motivo de rechazo" valor={requisicion.motivoRechazo ?? "—"} />
          )}
          {requisicion.estado === "Surtida" && (
            <>
              <Dato etiqueta="Surtido por" valor={requisicion.surtidoPor ?? "—"} />
              <Dato etiqueta="Fecha de surtido" valor={requisicion.fechaSurtido?.slice(0, 10) ?? "—"} />
            </>
          )}
        </section>
      )}

      {esModoMock && requisicion.estado === "Pendiente" && (
        <DevAprobarPanel folio={requisicion.folio} aprobador={requisicion.aprobadorCorreo} />
      )}
    </div>
  );
}
