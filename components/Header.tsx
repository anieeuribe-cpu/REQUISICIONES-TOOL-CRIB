import Link from "next/link";
import type { SesionUsuario } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

const NAV_LINKS = [
  { href: "/requisiciones/nueva", label: "Nueva requisición" },
  { href: "/requisiciones/historial", label: "Historial" }
];

export default function Header({ usuario }: { usuario: SesionUsuario | null }) {
  return (
    <header className="bg-navy text-white shadow-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-sm font-bold text-navy"
          >
            TC
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold sm:text-base">Tool Crib</p>
            <p className="text-[11px] text-navy-100 sm:text-xs">Requisiciones de material</p>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-navy-100 transition hover:bg-navy-700 hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          {usuario && (
            <div className="ml-2 flex items-center gap-2 border-l border-navy-600 pl-3 text-xs text-navy-100">
              <span>{usuario.nombre}</span>
              <LogoutButton />
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
