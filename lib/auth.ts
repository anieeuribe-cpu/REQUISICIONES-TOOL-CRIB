import { cookies } from "next/headers";

/**
 * Identidad del usuario dentro de la app.
 *
 * Esto NO es una implementación de seguridad/autenticación real: es un
 * cookie de "quién soy" para poder llenar el solicitante y resolver el
 * rol (Almacén) sin construir un flujo de inicio de sesión completo.
 * En producción esto debe reemplazarse por el inicio de sesión único
 * (SSO) de Microsoft Entra ID que ya usan las demás apps internas de la
 * planta (por ejemplo con next-auth y el proveedor de Azure AD, o el
 * mismo reverse proxy/IdP corporativo) — ver docs/ARCHITECTURE.md,
 * sección "Autenticación". El resto de la app solo depende de
 * `getCurrentUser()`, así que cambiar la fuente de identidad no
 * requiere tocar las pantallas ni las rutas de API.
 */
export interface SesionUsuario {
  nombre: string;
  correo: string;
  noReloj: string;
}

const COOKIE_NAME = "tc_user";

export function getCurrentUser(): SesionUsuario | null {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SesionUsuario;
  } catch {
    return null;
  }
}

export function encodeSession(sesion: SesionUsuario): string {
  return Buffer.from(JSON.stringify(sesion), "utf8").toString("base64url");
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
