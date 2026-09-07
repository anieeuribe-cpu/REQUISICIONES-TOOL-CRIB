import type { EstadoRequisicion } from "@/lib/types";

export default function StatusBadge({ estado }: { estado: EstadoRequisicion }) {
  return <span className={`badge-estado badge-${estado}`}>{estado}</span>;
}
