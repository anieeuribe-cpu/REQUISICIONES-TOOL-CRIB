import RequisicionForm from "@/components/RequisicionForm";
import { getCurrentUser } from "@/lib/auth";

export default function NuevaRequisicionPage() {
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-navy">Nueva requisición</h1>
      <RequisicionForm nombreInicial={usuario?.nombre ?? ""} noRelojInicial={usuario?.noReloj ?? ""} />
    </div>
  );
}
