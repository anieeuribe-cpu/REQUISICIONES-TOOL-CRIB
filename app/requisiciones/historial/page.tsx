import Link from "next/link";
import HistorialFiltros from "@/components/HistorialFiltros";
import { dataStore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const usuario = getCurrentUser();
  const requisiciones = await dataStore.listarRequisiciones();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-navy">Historial de requisiciones</h1>
        {usuario?.perfil === "Captura" && (
          <Link href="/requisiciones/nueva" className="btn-primary rounded-full">
            + Nueva requisición
          </Link>
        )}
      </div>
      <HistorialFiltros requisiciones={requisiciones} />
    </div>
  );
}
