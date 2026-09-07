import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (q.trim().length === 0) {
    return NextResponse.json({ partes: [] });
  }
  try {
    const partes = await dataStore.buscarPartes(q, 25);
    return NextResponse.json({ partes });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
