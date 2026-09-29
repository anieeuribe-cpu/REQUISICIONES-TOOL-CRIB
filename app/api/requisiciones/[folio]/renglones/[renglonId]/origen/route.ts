import { NextResponse } from "next/server";
import { z } from "zod";
import { dataStore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

const bodySchema = z.object({
  origen: z.enum(["Americana", "Mexicana"])
});

export async function POST(request: Request, { params }: { params: { folio: string; renglonId: string } }) {
  const usuario = getCurrentUser();
  if (!usuario) {
    return NextResponse.json({ error: "Debes identificarte antes de continuar." }, { status: 401 });
  }
  if (usuario.perfil !== "ToolCrib") {
    return NextResponse.json({ error: "Solo el perfil Tool Crib puede editar el origen." }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const renglonId = Number(params.renglonId);
  if (!renglonId) {
    return NextResponse.json({ error: "Renglón inválido." }, { status: 400 });
  }

  try {
    await dataStore.editarOrigenRenglon(renglonId, parsed.data.origen);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
