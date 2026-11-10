import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data";

export async function GET() {
  try {
    const aprobadores = await dataStore.listarAprobadores();
    return NextResponse.json({ aprobadores });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
