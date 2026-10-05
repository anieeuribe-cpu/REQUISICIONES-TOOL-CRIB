import * as XLSX from "xlsx";
import { dataStore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const usuario = getCurrentUser();
  if (!usuario) {
    return new Response("Debes identificarte antes de exportar.", { status: 401 });
  }

  const requisiciones = await dataStore.listarRequisiciones();

  const filas = requisiciones.flatMap((r) =>
    r.renglones.map((ren) => ({
      Folio: r.folio,
      Fecha: r.fecha,
      Nombre: r.nombre,
      "No. de Reloj": r.noReloj,
      Turno: r.turno,
      "Área/Depto": r.areaDepto,
      Estado: r.estado,
      "Nivel de Aprobación": r.nivelAprobacion,
      "Total USD (requisición)": r.totalUSD,
      "Número de Parte": ren.numeroParte,
      Descripción: ren.descripcion,
      Cantidad: ren.cantidad,
      Máquina: ren.maquina,
      Origen: ren.origen,
      Moneda: ren.moneda,
      "Costo Unitario": ren.costoUnitario,
      Localidad: ren.localidad,
      "Aprobado/Rechazado por": r.aprobadoPor ?? "",
      "Fecha de Decisión": r.fechaAprobacion ?? "",
      "Motivo de Rechazo": r.motivoRechazo ?? "",
      "Surtido por": r.surtidoPor ?? "",
      "Fecha de Surtido": r.fechaSurtido ?? ""
    }))
  );

  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = Object.keys(filas[0] ?? {}).map((clave) => ({ wch: Math.max(clave.length, 14) }));

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Requisiciones");
  const buffer = XLSX.write(libro, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="requisiciones-${fecha}.xlsx"`
    }
  });
}
