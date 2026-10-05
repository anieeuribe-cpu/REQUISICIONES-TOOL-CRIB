import type { Metadata } from "next";
import Header from "@/components/Header";
import IdentifyGate from "@/components/IdentifyGate";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Requisiciones de Material — Tool Crib"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const usuario = getCurrentUser();
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#f4f5f8]">
        <Header usuario={usuario} />
        <main className="mx-auto w-[88%] max-w-[1800px] py-6">
          <IdentifyGate usuarioInicial={usuario}>{children}</IdentifyGate>
        </main>
      </body>
    </html>
  );
}
