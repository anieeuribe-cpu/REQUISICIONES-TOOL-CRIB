"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { SesionUsuario } from "@/lib/auth";

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
  const [correo, setCorreo] = useState("");
  const [noReloj, setNoReloj] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, correo, noReloj })
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
        <form className="flex flex-col gap-3 p-6" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Nombre completo
            <input
              className="input-field"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Correo corporativo
            <input
              type="email"
              className="input-field"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            No. de Reloj
            <input
              className="input-field"
              value={noReloj}
              onChange={(e) => setNoReloj(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-estado-rechazada">{error}</p>}
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
