import type { Origen } from "@/lib/types";

const ESTILOS: Record<Origen, string> = {
  Americana: "bg-blue-100 text-blue-800",
  Mexicana: "bg-green-100 text-green-800"
};

const ETIQUETAS: Record<Origen, string> = {
  Americana: "Americana (USD)",
  Mexicana: "Mexicana (MXN)"
};

export default function OriginBadge({ origen }: { origen: Origen }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${ESTILOS[origen]}`}>
      {ETIQUETAS[origen]}
    </span>
  );
}
