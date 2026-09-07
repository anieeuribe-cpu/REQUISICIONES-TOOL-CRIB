import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-navy sm:text-3xl">
        Requisiciones de material — Tool Crib
      </h1>
      <p className="max-w-xl text-sm text-gray-600">
        Captura, aprobación y seguimiento de requisiciones de material, con el catálogo de
        partes de la planta y el flujo de aprobación por monto.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/requisiciones/nueva" className="btn-primary">
          Nueva requisición
        </Link>
        <Link href="/requisiciones/historial" className="btn-secondary">
          Ver historial
        </Link>
      </div>
    </div>
  );
}
