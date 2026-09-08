import { NextResponse } from "next/server";
import { z } from "zod";
import { dataStore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

const renglonSchema = z.object({
  numeroParte: z.string().trim().min(1, "Falta el número de parte de un renglón."),
  descripcion: z.string().trim().min(1),
  cantidad: z.number().positive("La cantidad debe ser mayor a cero."),
  maquina: z.string().trim().min(1, "Falta la máquina de un renglón."),
  origen: z.enum(["Americana", "Mexicana"]),
  moneda: z.enum(["USD", "MXN"]),
  costoUnitario: z.number().nonnegative(),
  localidad: z.string().trim().min(1),
  capturaManual: z.boolean().default(false)
});

const nuevaRequisicionSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido."),
  noReloj: z.string().trim().min(1, "El número de reloj es requerido."),
  turno: z.string().trim().min(1, "El turno es requerido."),
  areaDepto: z.string().trim().min(1, "El área/departamento es requerido."),
  fecha: z.string().trim().min(1, "La fecha es requerida."),
  renglones: z.array(renglonSchema).min(1, "Agrega al menos un renglón.")
});

export async function GET() {
  try {
    const requisiciones = await dataStore.listarRequisiciones();
    return NextResponse.json({ requisiciones });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const parsed = nuevaRequisicionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const usuario = getCurrentUser();
  const solicitanteCorreo = usuario?.correo ?? "";
  if (!solicitanteCorreo) {
    return NextResponse.json({ error: "Debes identificarte antes de crear una requisición." }, { status: 401 });
  }

  try {
    const requisicion = await dataStore.crearRequisicion({ ...parsed.data, solicitanteCorreo });
    return NextResponse.json({ requisicion }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
