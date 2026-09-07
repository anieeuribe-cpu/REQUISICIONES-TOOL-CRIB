import { NextResponse } from "next/server";
import { z } from "zod";
import { simularDecisionAprobador } from "@/lib/data/mock";

/**
 * Solo existe en modo mock (DATA_MODE=mock). Simula lo que en producción
 * hace el flujo de Power Automate (docs/POWER-AUTOMATE-FLOW.md) cuando el
 * aprobador toca "Aprobar"/"Rechazar" en el correo: aquí es un botón en la
 * pantalla de Detalle, solo para poder probar la app de punta a punta sin
 * un tenant real.
 */
const bodySchema = z.object({
  decision: z.enum(["Aprobada", "Rechazada"]),
  motivoRechazo: z.string().trim().optional()
});

export async function POST(request: Request, { params }: { params: { folio: string } }) {
  if ((process.env.DATA_MODE ?? "mock") !== "mock") {
    return NextResponse.json({ error: "Este endpoint solo existe en modo mock." }, { status: 404 });
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  try {
    const requisicion = await simularDecisionAprobador(
      params.folio,
      parsed.data.decision,
      parsed.data.motivoRechazo
    );
    return NextResponse.json({ requisicion });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
