import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data";

export async function GET() {
  try {
    const tipoCambio = await dataStore.obtenerTipoCambioVigente();
    return NextResponse.json({ tipoCambio });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
