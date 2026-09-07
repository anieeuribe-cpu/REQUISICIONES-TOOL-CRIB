import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { encodeSession, getCurrentUser, SESSION_COOKIE_NAME } from "@/lib/auth";

const bodySchema = z.object({
  nombre: z.string().trim().min(1, "El nombre es requerido."),
  correo: z.string().trim().email("Correo inválido."),
  noReloj: z.string().trim().min(1, "El número de reloj es requerido.")
});

export async function GET() {
  return NextResponse.json({ usuario: getCurrentUser() });
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const sesion = parsed.data;
  cookies().set(SESSION_COOKIE_NAME, encodeSession(sesion), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return NextResponse.json({ usuario: sesion });
}

export async function DELETE() {
  cookies().delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
