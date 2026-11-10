import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data";

// Sin esto, Next.js la trataba como ruta estática: la ejecutaba una sola vez
// al momento de construir el despliegue y servía esa misma respuesta
// congelada a todo mundo hasta el siguiente deploy — cualquier cambio en
// "Lista Aprobadores" (SharePoint) después de eso simplemente no se veía.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const aprobadores = await dataStore.listarAprobadores();
    return NextResponse.json({ aprobadores });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
