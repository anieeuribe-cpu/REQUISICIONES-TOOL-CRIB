import { NextResponse } from "next/server";
import { dataStore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: { folio: string } }) {
  const usuario = getCurrentUser();
  if (!usuario) {
    return NextResponse.json({ error: "Debes identificarte antes de continuar." }, { status: 401 });
  }
  if (usuario.perfil !== "ToolCrib") {
    return NextResponse.json(
      { error: "Solo el perfil Tool Crib puede marcar una requisición como Surtida." },
      { status: 403 }
    );
  }

  try {
    const requisicion = await dataStore.marcarSurtida(params.folio, usuario.nombre);
    return NextResponse.json({ requisicion });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
