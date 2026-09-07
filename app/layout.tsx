import type { Metadata } from "next";
import Header from "@/components/Header";
import IdentifyGate from "@/components/IdentifyGate";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Requisiciones de Material — Tool Crib",
  description: "Plataforma de requisiciones de material del Tool Crib de la planta."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = getCurrentUser();
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#f4f5f8]">
        <Header usuario={usuario} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <IdentifyGate usuarioInicial={usuario}>{children}</IdentifyGate>
        </main>
      </body>
    </html>
  );
}
