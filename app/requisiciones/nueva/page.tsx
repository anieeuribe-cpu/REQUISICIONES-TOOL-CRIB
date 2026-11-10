import RequisicionForm from "@/components/RequisicionForm";
import { dataStore } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";

export default async function NuevaRequisicionPage() {
  const usuario = getCurrentUser();

  if (usuario?.perfil !== "Captura") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-navy">Nueva requisición</h1>
        <div className="card p-5 text-sm text-gray-600">
          Solo el perfil <strong>Captura</strong> puede crear requisiciones. Cierra sesión y vuelve a entrar con ese
          perfil si necesitas capturar una.
        </div>
      </div>
    );
  }

  // Se piden aquí, en el servidor, antes de que la pantalla aparezca — para
  // que cuando se dé "Guardar" ya estén listos sí o sí (ver
  // RequisicionForm.tsx). Si algo falla (por ejemplo no hay tipo de cambio
  // vigente marcado en SharePoint), no se tira toda la pantalla: se deja en
  // null y el formulario los vuelve a pedir desde el navegador como
  // respaldo.
  const [tipoCambio, aprobadores] = await Promise.all([
    dataStore.obtenerTipoCambioVigente().catch(() => null),
    dataStore.listarAprobadores().catch(() => null)
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-navy">Nueva requisición</h1>
      <RequisicionForm
        nombreInicial={usuario?.nombre ?? ""}
        noRelojInicial=""
        tipoCambioInicial={tipoCambio?.valorMXNporUSD ?? null}
        aprobadoresIniciales={aprobadores}
      />
    </div>
  );
}
