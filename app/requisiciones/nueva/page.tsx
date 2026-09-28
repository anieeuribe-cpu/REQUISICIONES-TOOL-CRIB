import RequisicionForm from "@/components/RequisicionForm";
import { getCurrentUser } from "@/lib/auth";

export default function NuevaRequisicionPage() {
  const usuario = getCurrentUser();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-navy">Nueva requisición</h1>
      <RequisicionForm nombreInicial={usuario?.nombre ?? ""} noRelojInicial={usuario?.noReloj ?? ""} />
    </div>
  );
}
