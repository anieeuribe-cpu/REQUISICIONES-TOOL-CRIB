import * as XLSX from "xlsx";
import { dataStore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import type { Requisicion } from "@/lib/types";

// La exportación lee el detalle completo (con renglones) de cada
// requisición, lo que puede tardar — dale más tiempo que el límite
// por defecto de la función serverless.
export const maxDuration = 60;

/** Llama `fn` para cada elemento con un máximo de `limite` llamadas en paralelo a la vez. */
async function conConcurrenciaLimitada<T, R>(items: T[], limite: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(items.length);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < items.length) {
      const i = siguiente++;
      const item = items[i];
      if (item === undefined) continue;
      resultados[i] = await fn(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador));
  return resultados;
}

export async function GET() {
  const usuario = getCurrentUser();
  if (!usuario) {
    return new Response("Debes identificarte antes de exportar.", { status: 401 });
  }

  // listarRequisiciones() no trae renglones (para que el Historial cargue
  // rápido) — hay que releer cada una completa para el Excel.
  const resumenes = await dataStore.listarRequisiciones();
  const detalles = await conConcurrenciaLimitada(resumenes, 25, (r) => dataStore.obtenerRequisicion(r.folio));
  const requisiciones = detalles.filter((r): r is Requisicion => r !== null);

  const filas = requisiciones.flatMap((r) => {
    const base = {
      Folio: r.folio,
      Fecha: r.fecha,
      Nombre: r.nombre,
      "No. de Reloj": r.noReloj,
      Turno: r.turno,
      "Área/Depto": r.areaDepto,
      Estado: r.estado,
      "Nivel de Aprobación": r.nivelAprobacion,
      "Total USD (requisición)": r.totalUSD
    };
    const renglones = r.renglones.length > 0 ? r.renglones : [null];
    return renglones.map((ren) => ({
      ...base,
      "Número de Parte": ren?.numeroParte ?? "",
      Descripción: ren?.descripcion ?? "",
      Cantidad: ren?.cantidad ?? "",
      Origen: ren?.origen ?? "",
      Moneda: ren?.moneda ?? "",
      "Costo Unitario": ren?.costoUnitario ?? "",
      Localidad: ren?.localidad ?? "",
      "Aprobado/Rechazado por": r.aprobadoPor ?? "",
      "Fecha de Decisión": r.fechaAprobacion ?? "",
      "Motivo de Rechazo": r.motivoRechazo ?? "",
      "Surtido por": r.surtidoPor ?? "",
      "Fecha de Surtido": r.fechaSurtido ?? ""
    }));
  });

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
