"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { SesionUsuario } from "@/lib/auth";

export default function IdentifyGate({
  usuarioInicial,
  children
}: {
  usuarioInicial: SesionUsuario | null;
  children: React.ReactNode;
}) {
  const [usuario, setUsuario] = useState(usuarioInicial);
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
      <div className="card p-6">
        <h1 className="mb-1 text-lg font-bold text-navy">Identifícate</h1>
        <p className="mb-4 text-sm text-gray-600">
          Ingresa tus datos para usar la plataforma de requisiciones del Tool Crib.
        </p>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
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
