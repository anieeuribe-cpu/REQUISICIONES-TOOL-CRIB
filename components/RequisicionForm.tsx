"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import OriginBadge from "./OriginBadge";
import PartAutocomplete from "./PartAutocomplete";
import { formatMXN, formatUSD, nivelAprobacionPorMonto, totalUSD } from "@/lib/business";
import type { Origen, ParteCatalogo, RenglonRequisicion } from "@/lib/types";

const TURNOS_SUGERIDOS = ["4", "9", "53", "54"];
const TURNO_OTRO = "Otro";

interface FilaRenglon extends RenglonRequisicion {
  clientId: string;
  manual: boolean;
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
    localidad: "",
    capturaManual: false,
    manual: false
  };
}

function monedaDeOrigen(origen: Origen) {
  return origen === "Americana" ? "USD" : "MXN";
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
  const [turnoSeleccion, setTurnoSeleccion] = useState(TURNOS_SUGERIDOS[0]!);
  const [turnoManual, setTurnoManual] = useState("");
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
      moneda: monedaDeOrigen(parte.origen),
      costoUnitario: parte.costo,
      localidad: parte.localidad,
      capturaManual: false,
      manual: false
    });
  }

  function activarCapturaManual(clientId: string) {
    actualizarFila(clientId, {
      descripcion: "",
      origen: "Americana",
      moneda: "USD",
      costoUnitario: 0,
      localidad: "",
      capturaManual: true,
      manual: true
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
  const turno = turnoSeleccion === TURNO_OTRO ? turnoManual.trim() : turnoSeleccion;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (filas.some((f) => !f.numeroParte || f.cantidad <= 0)) {
      setError("Cada renglón necesita un número de parte válido y cantidad mayor a cero.");
      return;
    }
    if (filas.some((f) => f.manual && (!f.descripcion.trim() || !f.localidad.trim()))) {
      setError("Completa descripción y localidad en los renglones capturados manualmente.");
      return;
    }
    if (!areaDepto.trim()) {
      setError("El área/departamento es requerido.");
      return;
    }
    if (!turno) {
      setError("Indica el turno.");
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
          renglones: filas.map(({ clientId, manual, ...r }) => r)
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
          <select
            className="input-field"
            value={turnoSeleccion}
            onChange={(e) => setTurnoSeleccion(e.target.value)}
          >
            {TURNOS_SUGERIDOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value={TURNO_OTRO}>Otro</option>
          </select>
          {turnoSeleccion === TURNO_OTRO && (
            <input
              className="input-field mt-1"
              placeholder="Especifica el turno"
              value={turnoManual}
              onChange={(e) => setTurnoManual(e.target.value)}
              required
            />
          )}
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
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-2">Número de parte</th>
              <th className="py-2 pr-2">Descripción</th>
              <th className="py-2 pr-2">Origen</th>
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
                  {fila.manual ? (
                    <div className="flex flex-col gap-1">
                      <input
                        className="input-field"
                        placeholder="Número de parte (manual)"
                        value={fila.numeroParte}
                        onChange={(e) => actualizarFila(fila.clientId, { numeroParte: e.target.value })}
                      />
                      <button
                        type="button"
                        className="self-start text-xs text-navy hover:underline"
                        onClick={() =>
                          actualizarFila(fila.clientId, { manual: false, capturaManual: false, numeroParte: "" })
                        }
                      >
                        Buscar en catálogo
                      </button>
                    </div>
                  ) : (
                    <PartAutocomplete
                      value={fila.numeroParte}
                      onSelect={(p) => seleccionarParte(fila.clientId, p)}
                      onManual={() => activarCapturaManual(fila.clientId)}
                    />
                  )}
                </td>
                <td className="py-2 pr-2">
                  {fila.manual ? (
                    <input
                      className="input-field w-40"
                      placeholder="Descripción"
                      value={fila.descripcion}
                      onChange={(e) => actualizarFila(fila.clientId, { descripcion: e.target.value })}
                    />
                  ) : (
                    <span className="text-gray-700">{fila.descripcion || "—"}</span>
                  )}
                </td>
                <td className="py-2 pr-2">
                  {fila.manual ? (
                    <select
                      className="input-field w-32"
                      value={fila.origen}
                      onChange={(e) => {
                        const origen = e.target.value as Origen;
                        actualizarFila(fila.clientId, { origen, moneda: monedaDeOrigen(origen) });
                      }}
                    >
                      <option value="Americana">Americana</option>
                      <option value="Mexicana">Mexicana</option>
                    </select>
                  ) : fila.numeroParte ? (
                    <OriginBadge origen={fila.origen} />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
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
                <td className="py-2 pr-2 whitespace-nowrap">
                  {fila.manual ? (
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input-field w-24"
                      value={fila.costoUnitario}
                      onChange={(e) => actualizarFila(fila.clientId, { costoUnitario: Number(e.target.value) })}
                    />
                  ) : (
                    <span className="text-gray-700">
                      {fila.moneda === "USD" ? formatUSD(fila.costoUnitario) : formatMXN(fila.costoUnitario)}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-2">
                  {fila.manual ? (
                    <input
                      className="input-field w-28"
                      value={fila.localidad}
                      onChange={(e) => actualizarFila(fila.clientId, { localidad: e.target.value })}
                    />
                  ) : (
                    <span className="text-gray-700">{fila.localidad || "—"}</span>
                  )}
                </td>
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
