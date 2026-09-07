"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded px-2 py-1 font-medium text-navy-100 underline-offset-2 hover:text-white hover:underline"
      onClick={async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}
