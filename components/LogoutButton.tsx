"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-full bg-navy-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-600"
      onClick={async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        router.push("/");
        router.refresh();
      }}
    >
      Cambiar de usuario
    </button>
  );
}
