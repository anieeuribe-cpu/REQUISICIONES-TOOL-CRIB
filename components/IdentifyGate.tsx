"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { Perfil, SesionUsuario } from "@/lib/auth";

const PERFILES: { valor: Perfil; etiqueta: string; descripcion?: string; requierePin: boolean }[] = [
  { valor: "Captura", etiqueta: "Captura", descripcion: "Crea y llena nuevas requisiciones", requierePin: false },
  { valor: "Supervisor", etiqueta: "Supervisor", requierePin: true },
  { valor: "Superintendente", etiqueta: "Superintendente", requierePin: true },
  { valor: "Gerente", etiqueta: "Gerente", requierePin: true },
  { valor: "ToolCrib", etiqueta: "Tool Crib", requierePin: true }
];

export default function IdentifyGate({
  usuarioInicial,
  children
}: {
  usuarioInicial: SesionUsuario | null;
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] = useState(usuarioInicial);

  // usuarioInicial cambia cuando el servidor vuelve a renderizar (p.ej. tras
  // cerrar sesión y hacer router.refresh()); useState solo toma el valor
  // inicial una vez, así que sin esto el gate se quedaba "pegado" con la
  // sesión vieja en memoria.
  useEffect(() => {
    setUsuario(usuarioInicial);
  }, [usuarioInicial]);
  const [nombre, setNombre] = useState("");
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

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
      setUsuario(data.usuario);
      router.refresh();
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
