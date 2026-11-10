import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data";

// Mismo problema que en /api/aprobadores: sin esto, Next.js servía el tipo
// de cambio congelado desde el momento del último despliegue, sin importar
// qué se cambiara después en la lista TipoCambio de SharePoint.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tipoCambio = await dataStore.obtenerTipoCambioVigente();
    return NextResponse.json({ tipoCambio });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
