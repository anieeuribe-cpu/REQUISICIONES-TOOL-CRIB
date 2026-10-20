"use client";

export default function LogoutButton() {
  return (
    <button
      type="button"
      className="rounded-full bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-600"
      onClick={async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        // Recarga completa (no router.push()/router.refresh()): ese combo
        // podía producir "Rendered more hooks than during the previous
        // render" en el Router de Next — ver el comentario en
        // IdentifyGate.tsx#onSubmit para el detalle.
        window.location.href = "/";
      }}
    >
      Cambiar de usuario
    </button>
  );
}
