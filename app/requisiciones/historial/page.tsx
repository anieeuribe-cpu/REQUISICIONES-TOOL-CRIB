import HistorialFiltros from "@/components/HistorialFiltros";
import { dataStore } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const requisiciones = await dataStore.listarRequisiciones();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-navy">Historial de requisiciones</h1>
      <HistorialFiltros requisiciones={requisiciones} />
    </div>
  );
}
