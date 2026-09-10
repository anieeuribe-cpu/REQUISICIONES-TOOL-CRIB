"use client";

import { useEffect, useRef, useState } from "react";
import OriginBadge from "./OriginBadge";
import type { ParteCatalogo } from "@/lib/types";

export default function PartAutocomplete({
  value,
  onSelect,
  onManual
}: {
  value: string;
  onSelect: (parte: ParteCatalogo) => void;
  /** El usuario indicó que el número de parte no está en el catálogo y quiere capturarlo a mano. */
  onManual: () => void;
}) {
  const [texto, setTexto] = useState(value);
  const [opciones, setOpciones] = useState<ParteCatalogo[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTexto(value), [value]);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  useEffect(() => {
    const prefijo = texto.trim();
    if (prefijo.length < 2) {
      setOpciones([]);
      return;
    }
    setCargando(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/catalogo/search?q=${encodeURIComponent(prefijo)}`);
        const data = await res.json();
        setOpciones(data.partes ?? []);
      } finally {
        setCargando(false);
      }
    }, 200); // debounce: evita una llamada por cada tecla contra el catálogo de 84,000 filas
    return () => clearTimeout(timeout);
  }, [texto]);

  const mostrarDropdown = abierto && texto.trim().length > 0;

  return (
    <div className="relative" ref={contenedorRef}>
      <input
        className="input-field"
        placeholder="Número de parte…"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => texto.trim().length > 0 && setAbierto(true)}
        autoComplete="off"
      />
      {mostrarDropdown && (
        <ul className="absolute z-10 mt-1 max-h-72 w-80 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {cargando && <li className="px-3 py-2 text-xs text-gray-500">Buscando…</li>}
          {!cargando &&
            opciones.map((parte, i) => (
              // La misma pieza puede existir en varias ubicaciones del catálogo real (mismo
              // numeroParte, distinta localidad) — el índice evita colisiones de key en ese caso.
              <li key={`${parte.numeroParte}-${parte.localidad}-${i}`}>
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-navy-50"
                  onClick={() => {
                    setTexto(parte.numeroParte);
                    onSelect(parte);
                    setAbierto(false);
                  }}
                >
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="font-semibold text-navy">{parte.numeroParte}</span>
                    <span className="text-xs text-gray-600">{parte.descripcion}</span>
                    {parte.localidad && (
                      <span className="text-[11px] text-gray-400">Localidad: {parte.localidad}</span>
                    )}
                  </span>
                  <OriginBadge origen={parte.origen} />
                </button>
              </li>
            ))}
          {!cargando && texto.trim().length >= 2 && opciones.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">Sin resultados en el catálogo.</li>
          )}
          <li className="border-t border-gray-100">
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm font-medium text-navy hover:bg-navy-50"
              onClick={() => {
                onManual();
                setAbierto(false);
              }}
            >
              Otro — no está en el catálogo, capturar manualmente
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
