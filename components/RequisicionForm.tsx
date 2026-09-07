"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PartAutocomplete from "./PartAutocomplete";
import { formatMXN, formatUSD, nivelAprobacionPorMonto, totalUSD } from "@/lib/business";
import type { ParteCatalogo, RenglonRequisicion, Turno } from "@/lib/types";

const TURNOS: Turno[] = ["1er Turno", "2do Turno", "3er Turno"];

interface FilaRenglon extends RenglonRequisicion {
  clientId: string;
}

function filaVacia(): FilaRenglon {
  return {
    clientId: crypto.randomUUID(),
    numeroParte: "",
    descripcion: "",
    cantidad: 1,
    maquina: "",
    origen: "Americana",
    moneda: "USD",
    costoUnitario: 0,
    localidad: ""
  };
}

export default function RequisicionForm({
  nombreInicial,
  noRelojInicial
}: {
  nombreInicial: string;
  noRelojInicial: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [noReloj, setNoReloj] = useState(noRelojInicial);
  const [turno, setTurno] = useState<Turno>("1er Turno");
  const [areaDepto, setAreaDepto] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [filas, setFilas] = useState<FilaRenglon[]>([filaVacia()]);
  const [valorMXNporUSD, setValorMXNporUSD] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    fetch("/api/tipo-cambio")
      .then((r) => r.json())
      .then((d) => setValorMXNporUSD(d.tipoCambio?.valorMXNporUSD ?? null))
      .catch(() => setValorMXNporUSD(null));
  }, []);

  function actualizarFila(clientId: string, cambios: Partial<FilaRenglon>) {
    setFilas((prev) => prev.map((f) => (f.clientId === clientId ? { ...f, ...cambios } : f)));
  }

  function seleccionarParte(clientId: string, parte: ParteCatalogo) {
    actualizarFila(clientId, {
      numeroParte: parte.numeroParte,
      descripcion: parte.descripcion,
      origen: parte.origen,
      moneda: parte.origen === "Americana" ? "USD" : "MXN",
      costoUnitario: parte.costo,
      localidad: parte.localidad
    });
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitarFila(clientId: string) {
    setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.clientId !== clientId) : prev));
  }

  const total = useMemo(() => {
    if (valorMXNporUSD == null) return null;
    try {
      return totalUSD(filas, valorMXNporUSD);
    } catch {
      return null;
    }
  }, [filas, valorMXNporUSD]);

  const nivel = total != null ? nivelAprobacionPorMonto(total) : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (filas.some((f) => !f.numeroParte || f.cantidad <= 0)) {
      setError("Cada renglón necesita un número de parte válido y cantidad mayor a cero.");
      return;
    }
    if (!areaDepto.trim()) {
      setError("El área/departamento es requerido.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/requisiciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          noReloj,
          turno,
          areaDepto,
          fecha,
          renglones: filas.map(({ clientId, ...r }) => r)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar la requisición.");
      router.push(`/requisiciones/${data.requisicion.folio}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Nombre
          <input className="input-field" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          No. de Reloj
          <input className="input-field" value={noReloj} onChange={(e) => setNoReloj(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Turno
          <select className="input-field" value={turno} onChange={(e) => setTurno(e.target.value as Turno)}>
            {TURNOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Área/Dpto
          <input
            className="input-field"
            value={areaDepto}
            onChange={(e) => setAreaDepto(e.target.value)}
            placeholder="Ej. Mantenimiento"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
          Fecha
          <input
            type="date"
            className="input-field"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </label>
      </section>

      <section className="card overflow-x-auto p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">Renglones</h2>
          <button type="button" className="btn-secondary" onClick={agregarFila}>
            + Agregar renglón
          </button>
        </div>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-2">Número de parte</th>
              <th className="py-2 pr-2">Descripción</th>
              <th className="py-2 pr-2">Cantidad</th>
              <th className="py-2 pr-2">Máquina</th>
              <th className="py-2 pr-2">Costo</th>
              <th className="py-2 pr-2">Localidad</th>
              <th className="py-2 pr-2">Importe</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.clientId} className="border-b border-gray-100 align-top">
                <td className="py-2 pr-2">
                  <PartAutocomplete value={fila.numeroParte} onSelect={(p) => seleccionarParte(fila.clientId, p)} />
                </td>
                <td className="py-2 pr-2 text-gray-700">{fila.descripcion || "—"}</td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    min={1}
                    className="input-field w-20"
                    value={fila.cantidad}
                    onChange={(e) => actualizarFila(fila.clientId, { cantidad: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    className="input-field w-32"
                    value={fila.maquina}
                    onChange={(e) => actualizarFila(fila.clientId, { maquina: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-2 whitespace-nowrap text-gray-700">
                  {fila.moneda === "USD" ? formatUSD(fila.costoUnitario) : formatMXN(fila.costoUnitario)}
                  <span className="ml-1 text-xs text-gray-400">({fila.origen === "Americana" ? "US" : "MX"})</span>
                </td>
                <td className="py-2 pr-2 text-gray-700">{fila.localidad || "—"}</td>
                <td className="py-2 pr-2 whitespace-nowrap font-medium text-navy">
                  {fila.moneda === "USD"
                    ? formatUSD(fila.cantidad * fila.costoUnitario)
                    : formatMXN(fila.cantidad * fila.costoUnitario)}
                </td>
                <td className="py-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-estado-rechazada hover:underline"
                    onClick={() => quitarFila(fila.clientId)}
                  >
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Total (siempre en USD)</p>
          <p className="text-2xl font-bold text-navy">{total != null ? formatUSD(total) : "Calculando…"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Firma requerida</p>
          <p className="text-lg font-semibold text-navy">{nivel ?? "—"}</p>
        </div>
        <button type="submit" className="btn-primary" disabled={enviando || total == null}>
          {enviando ? "Guardando…" : "Guardar requisición"}
        </button>
      </section>

      {error && <p className="text-sm font-medium text-estado-rechazada">{error}</p>}
    </form>
  );
}
