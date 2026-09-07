"use client";

import { useEffect, useRef, useState } from "react";
import type { ParteCatalogo } from "@/lib/types";

export default function PartAutocomplete({
  value,
  onSelect
}: {
  value: string;
  onSelect: (parte: ParteCatalogo) => void;
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
        setAbierto(true);
      } finally {
        setCargando(false);
      }
    }, 200); // debounce: evita una llamada por cada tecla contra el catálogo de 84,000 filas
    return () => clearTimeout(timeout);
  }, [texto]);

  return (
    <div className="relative" ref={contenedorRef}>
      <input
        className="input-field"
        placeholder="Número de parte…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onFocus={() => opciones.length > 0 && setAbierto(true)}
        autoComplete="off"
      />
      {abierto && (cargando || opciones.length > 0) && (
        <ul className="absolute z-10 mt-1 max-h-64 w-72 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {cargando && <li className="px-3 py-2 text-xs text-gray-500">Buscando…</li>}
          {!cargando &&
            opciones.map((parte) => (
              <li key={parte.numeroParte}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-navy-50"
                  onClick={() => {
                    setTexto(parte.numeroParte);
                    onSelect(parte);
                    setAbierto(false);
                  }}
                >
                  <span className="font-semibold text-navy">{parte.numeroParte}</span>
                  <span className="text-xs text-gray-600">{parte.descripcion}</span>
                </button>
              </li>
            ))}
          {!cargando && opciones.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">Sin resultados.</li>
          )}
        </ul>
      )}
    </div>
  );
}
