import Link from "next/link";
import type { SesionUsuario } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export default function Header({ usuario }: { usuario: SesionUsuario | null }) {
  return (
    <header className="bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/requisiciones/historial" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ProDriven Global Brands" className="h-9 w-auto" />
          <div className="leading-tight">
            <p className="text-sm font-semibold sm:text-base">Tool Crib</p>
            <p className="text-[11px] text-navy-100 sm:text-xs">Requisiciones de material</p>
          </div>
        </Link>
        {usuario && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white">
              {usuario.nombre} · {usuario.perfil}
            </span>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
