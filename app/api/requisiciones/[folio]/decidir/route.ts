import { NextResponse } from "next/server";
import { z } from "zod";
import { dataStore } from "@/lib/data";
import { getCurrentUser, type Perfil } from "@/lib/auth";

const PERFILES_APROBADORES: Perfil[] = ["Supervisor", "Superintendente", "Gerente"];

const bodySchema = z.object({
  decision: z.enum(["Aprobada", "Rechazada"]),
  motivoRechazo: z.string().trim().optional()
});

export async function POST(request: Request, { params }: { params: { folio: string } }) {
  const usuario = getCurrentUser();
  if (!usuario) {
    return NextResponse.json({ error: "Debes identificarte antes de continuar." }, { status: 401 });
  }
  if (!PERFILES_APROBADORES.includes(usuario.perfil)) {
    return NextResponse.json(
      { error: "Tu perfil no tiene permiso para aprobar o rechazar requisiciones." },
      { status: 403 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const requisicion = await dataStore.obtenerRequisicion(params.folio);
  if (!requisicion) {
    return NextResponse.json({ error: `No se encontró la requisición ${params.folio}.` }, { status: 404 });
  }
  if (requisicion.nivelAprobacion !== usuario.perfil) {
    return NextResponse.json(
      {
        error: `Esta requisición requiere aprobación de ${requisicion.nivelAprobacion}, no de ${usuario.perfil}.`
      },
      { status: 403 }
    );
  }

  try {
    const actualizada = await dataStore.decidirRequisicion(
      params.folio,
      parsed.data.decision,
      usuario.nombre,
      parsed.data.motivoRechazo
    );
    return NextResponse.json({ requisicion: actualizada });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
