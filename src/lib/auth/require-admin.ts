import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import type { SessionPayload } from "@/lib/auth/session-token";

/** Respuesta de error de autorizacion ya serializada. */
type Denial = NextResponse<{ error: string }>;

/**
 * Exige una sesion de administrador en una route handler.
 *
 * Toda escritura o lectura de datos administrativos debe pasar por aqui. Es la
 * unica barrera fiable: el middleware cubre la navegacion, pero una peticion
 * directa a `/api/...` lo evita por completo.
 *
 * @returns La sesion del administrador, o una respuesta 401/403 lista para devolver.
 */
export async function requireAdmin(): Promise<
  { session: SessionPayload; denial: null } | { session: null; denial: Denial }
> {
  const session = await getSession();
  if (session === null) {
    return {
      session: null,
      denial: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      ),
    };
  }
  if (session.role !== "ADMIN") {
    return {
      session: null,
      denial: NextResponse.json(
        { error: "Se requieren permisos de administrador" },
        { status: 403 },
      ),
    };
  }
  return { session, denial: null };
}