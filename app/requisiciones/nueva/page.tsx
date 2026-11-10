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

  // El tipo de cambio y los aprobadores ya NO se piden aquí (en el
  // servidor, antes de mostrar la pantalla): eso bloqueaba toda la pantalla
  // ~15-18s esperando 2 llamadas a Power Automate antes de dejar ver ni
  // siquiera el campo de Nombre. Ahora el formulario los pide él mismo
  // desde el navegador apenas se monta (ver RequisicionForm.tsx) — la
  // pantalla aparece al instante, y el botón "Guardar" se queda deshabilitado
  // hasta que esos datos lleguen, así que no hay ventana de carrera posible
  // (no puede guardarse sin ellos, nada más que esperar un poco en vez de
  // caer al camino lento de que el servidor los vuelva a pedir).
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-navy">Nueva requisición</h1>
      <RequisicionForm nombreInicial={usuario?.nombre ?? ""} noRelojInicial="" tipoCambioInicial={null} aprobadoresIniciales={null} />
    </div>
  );
}
