import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: { folio: string } }) {
  try {
    const requisicion = await dataStore.obtenerRequisicion(params.folio);
    if (!requisicion) {
      return NextResponse.json({ error: `No se encontró la requisición ${params.folio}.` }, { status: 404 });
    }
    return NextResponse.json({ requisicion });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
