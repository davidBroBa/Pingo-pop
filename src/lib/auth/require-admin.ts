import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { sesionLimitada } from "@/lib/auth/sesion-temporal";
import type { SessionPayload } from "@/lib/auth/session-token";

/** Respuesta de error de autorizacion ya serializada. */
type Denial = NextResponse<{ error: string }>;

/**
 * Exige una sesion de administrador vigente en una route handler.
 *
 * Toda escritura o lectura de datos administrativos debe pasar por aqui. Es la
 * unica barrera fiable: el middleware cubre la navegacion, pero una peticion
 * directa a `/api/...` lo evita por completo.
 *
 * Usa `getSessionUser()` y no `getSession()` a proposito: asi comprueba que la sesion
 * **no haya sido revocada** (spec 006) y que el rol siga siendo ADMIN **en la base de
 * datos**, no el que dice la cookie. Una cookie firmada y sin expirar no es prueba
 * suficiente despues de un cambio de contrasena o de una baja de rol.
 *
 * ## La tercera comprobacion: la contrasena temporal (spec 007, D21)
 *
 * El `proxy` ya devuelve 403 en `/admin/*` cuando la sesion sigue con la contrasena
 * temporal, asi que en una navegacion normal aqui no se llega. Se comprueba igual, y
 * no es Belt-and-braces decorativo: **el `proxy` no protege esta ruta**. Una peticion
 * directa a `POST /api/admin/productos` no pasa por su `matcher`, asi que sin esta
 * comprobacion un ADMIN recien creado tendria el panel cerrado y podria escribir
 * productos, cotizaciones y datos legales desde la API. "El dano se limita a
 * `/perfil`" seria falso.
 *
 * Y sale de `getSessionUser()`, o sea que el valor viene de la **base de datos**, no de
 * la cookie. Es el mismo numero que lee el `proxy`, pero con la fuente de verdad
 * detras: el `proxy` va rapido porque corre en Edge y no tiene Prisma, y aqui manda
 * la columna.
 *
 * El texto dice que se cambie la contrasena y no solo "403", porque quien recibe
 * esto viene de pulsar un boton del panel y sin un motivo no puede hacer nada. La
 * unica accion que le queda esta en `/perfil`, y por eso el aviso de ahi es
 * obligatorio y no decorativo.
 *
 * @returns La sesion del administrador, o una respuesta 401/403 lista para devolver.
 */
export async function requireAdmin(): Promise<
  { session: SessionPayload; denial: null } | { session: null; denial: Denial }
> {
  const session = await getSessionUser();
  if (session === null) {
    return {
      session: null,
      denial: NextResponse.json(
        { error: "No autenticado" },
        { status: 401 },
      ),
    };
  }
  /**
   * El rol va **primero**, y la contrasena temporal despues, a proposito: un BUYER
   * con contrasena temporal tiene un problema (el rol), y decirle lo de la contrasena
   * seria hablarle del problema equivocado. El orden de estas comprobaciones es el
   * orden en el que se explican al usuario.
   */
  if (session.role !== "ADMIN") {
    return {
      session: null,
      denial: NextResponse.json(
        { error: "Se requieren permisos de administrador" },
        { status: 403 },
      ),
    };
  }
  if (sesionLimitada(session.swc)) {
    return {
      session: null,
      denial: NextResponse.json(
        {
          error:
            "Tu sesión tiene una contraseña temporal. Cámbiala en tu perfil antes de usar el panel.",
        },
        { status: 403 },
      ),
    };
  }
  return { session, denial: null };
}