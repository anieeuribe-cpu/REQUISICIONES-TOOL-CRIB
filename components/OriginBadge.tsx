function estiloDe(origen: string): string {
  if (origen === "Americana") return "bg-blue-100 text-blue-800";
  if (origen === "Mexicana") return "bg-green-100 text-green-800";
  return "bg-gray-100 text-gray-800"; // "Otro: ..." u otro texto libre
}

function etiquetaDe(origen: string): string {
  if (origen === "Americana") return "Americana (USD)";
  if (origen === "Mexicana") return "Mexicana (MXN)";
  return origen || "—";
}

export default function OriginBadge({ origen }: { origen: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${estiloDe(origen)}`}
    >
      {etiquetaDe(origen)}
    </span>
  );
}
