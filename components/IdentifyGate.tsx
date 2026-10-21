"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Perfil, SesionUsuario } from "@/lib/auth";

const PERFILES: { valor: Perfil; etiqueta: string; descripcion?: string; requierePin: boolean }[] = [
  { valor: "Captura", etiqueta: "Captura", descripcion: "Crea y llena nuevas requisiciones", requierePin: false },
  { valor: "ToolCrib", etiqueta: "Tool Crib", descripcion: "Surte requisiciones aprobadas", requierePin: true }
];

// Se recuerdan en este navegador (no van en la cookie de sesión, que ahora
// se borra al cerrar el navegador) para que la próxima vez solo haya que
// confirmar con un clic, sin volver a escribir nombre/PIN.
const CLAVE_NOMBRE = "tc_recordado_nombre";
const CLAVE_PERFIL = "tc_recordado_perfil";
const CLAVE_PIN = "tc_recordado_pin";

function leerRecordado(clave: string): string {
  try {
    return localStorage.getItem(clave) ?? "";
  } catch {
    return "";
  }
}

function guardarRecordado(clave: string, valor: string) {
  try {
    if (valor) localStorage.setItem(clave, valor);
    else localStorage.removeItem(clave);
  } catch {
    // Si el navegador bloquea localStorage (modo privado, etc.), simplemente
    // no se recuerda — no es un error que deba interrumpir el login.
  }
}

export default function IdentifyGate({
  usuarioInicial,
  children
}: {
  usuarioInicial: SesionUsuario | null;
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] = useState(usuarioInicial);

  // Login y logout ahora recargan la página completa (ver onSubmit y
  // LogoutButton.tsx), así que usuarioInicial ya siempre llega correcto en
  // un montaje nuevo — este efecto queda solo como red de seguridad.
  useEffect(() => {
    setUsuario(usuarioInicial);
  }, [usuarioInicial]);
  const [nombre, setNombre] = useState("");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // localStorage no existe en el servidor, así que se lee recién montado en
  // el navegador (si no, el nombre/perfil renderizados en el servidor no
  // coincidirían con lo que ve el cliente al hidratar).
  useEffect(() => {
    const nombreGuardado = leerRecordado(CLAVE_NOMBRE);
    const perfilGuardado = leerRecordado(CLAVE_PERFIL) as Perfil | "";
    if (nombreGuardado) setNombre(nombreGuardado);
    if (perfilGuardado && PERFILES.some((p) => p.valor === perfilGuardado)) {
      setPerfil(perfilGuardado);
      if (perfilGuardado === "ToolCrib") setPin(leerRecordado(CLAVE_PIN));
    }
  }, []);

  const perfilSeleccionado = PERFILES.find((p) => p.valor === perfil);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!perfil) {
      setError("Elige tu perfil para entrar.");
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, perfil, pin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo identificar.");
      guardarRecordado(CLAVE_NOMBRE, nombre);
      guardarRecordado(CLAVE_PERFIL, perfil);
      guardarRecordado(CLAVE_PIN, perfil === "ToolCrib" ? pin : "");
      // Recarga completa de página (no router.push()/router.refresh()):
      // esa combinación — y hasta refresh() solo, llamado dentro de un
      // handler async justo después de un setState — producía "Rendered
      // more hooks than during the previous render" en el Router de Next
      // (confirmado reproduciendo el error con un build de producción
      // real). Una recarga dura es más lenta por una fracción de segundo,
      // pero nunca falla: vuelve a pedir la página al servidor, que ya lee
      // la cookie de sesión recién creada. app/page.tsx redirige a
      // /requisiciones/historial, así que si no era un link profundo
      // terminamos ahí de todas formas.
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  if (usuario) return <>{children}</>;

  return (
    <div className="mx-auto max-w-sm py-12">
      <div className="card overflow-hidden">
        <div className="flex flex-col items-center gap-2 bg-navy px-6 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ProDriven Global Brands" className="h-9 w-auto" />
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">Requisiciones de material</h1>
          <p className="text-sm text-navy-100">Tool Crib</p>
        </div>
        <form className="flex flex-col gap-4 p-6" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Nombre completo
            <input
              className="input-field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </label>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-gray-700">Elige tu perfil para entrar</p>
            {PERFILES.map((p) => (
              <button
                key={p.valor}
                type="button"
                onClick={() => setPerfil(p.valor)}
                className={`rounded-md border p-3 text-left transition ${
                  perfil === p.valor ? "border-navy bg-navy-50" : "border-gray-200 hover:border-navy-200"
                }`}
              >
                <p className="text-sm font-bold text-navy">{p.etiqueta}</p>
                {p.descripcion && <p className="text-xs text-gray-500">{p.descripcion}</p>}
              </button>
            ))}
          </div>

          {perfilSeleccionado?.requierePin && (
            <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
              PIN de {perfilSeleccionado.etiqueta}
              <input
                type="password"
                inputMode="numeric"
                className="input-field"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </label>
          )}

          {error && <p className="text-sm text-estado-rechazada">{error}</p>}
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
