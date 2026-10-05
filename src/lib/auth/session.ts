import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  type SessionPayload,
  verifySession,
} from "@/lib/auth/session-token";

/**
 * Lee la sesion actual desde la cookie firmada.
 *
 * Devuelve `null` si no hay cookie, si la firma no valida o si esta expirada.
 * La verificacion criptografica ocurre aqui y en el middleware; no basta con
 * confiar en el contenido de la cookie.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE.name)?.value);
}