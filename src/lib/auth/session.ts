import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

import {
  SESSION_COOKIE,
  isSessionCurrent,
  type SessionPayload,
  verifySession,
} from "@/lib/auth/session-token";

/**
 * Lee la sesion actual desde la cookie firmada.
 *
 * Devuelve `null` si no hay cookie, si la firma no valida o si esta expirada.
 * La verificacion criptografica ocurre aqui y en el middleware; no basta con
 * confiar en el contenido de la cookie.
 *
 * Ojo: esto **no** comprueba si la sesion fue revocada. Una cookie firmada sigue
 * valiendo hasta su `exp` (8 horas) aunque el usuario haya cambiado la contrasena.
 * Para una decision que deba fiarse de la revocacion, usar {@link getSessionUser}.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE.name)?.value);
}

/**
 * Lee la sesion **comprobando que no haya sido revocada**.
 *
 * A diferencia de {@link getSession}, consulta la base de datos y compara el `sv` de
 * la cookie con el `sessionVersion` del usuario. Es la comprobacion que hace falta
 * cuando la decision de seguridad depende de que la sesion siga viva: al cambiar la
 * contrasena se incrementa `sessionVersion` y toda cookie emitida antes queda
 * invalida (spec 006).
 *
 * **Coste:** una consulta a la base de datos por llamada. Es aceptable en las rutas
 * administrativas, que son de trafico bajo, y es el precio de poder revocar. El
 * middleware de Edge no puede hacer esto: alli no hay Prisma.
 *
 * @returns El payload si la cookie es autentica, vigente y no revocada; `null` en
 *   cualquier otro caso, incluida una caida de la base de datos (fail closed: si no
 *   se puede comprobar la revocacion, se deniega).
 */
export async function getSessionUser(): Promise<SessionPayload | null> {
  const session = await getSession();

  if (session === null) {
    return null;
  }

  let usuario: {
    sessionVersion: number;
    role: "BUYER" | "ADMIN";
    debeCambiarContrasena: boolean;
  } | null;
  try {
    usuario = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { sessionVersion: true, role: true, debeCambiarContrasena: true },
    });
  } catch (error) {
    // Fail closed: sin base de datos no se puede saber si la sesion fue revocada.
    // Un `null` aqui produce un 401 limpio; dar el acceso seria peor.
    console.error(
      "getSessionUser: no se pudo leer el usuario:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }

  if (usuario === null) {
    return null;
  }

  if (!isSessionCurrent(session.sv, usuario.sessionVersion)) {
    return null;
  }

  // El rol se relee de la base de datos y no de la cookie: si a alguien se le baja
  // el rol, su sesion deja de darle panel aunque el token siga firmado y sin expirar.
  //
  // `swc` se relee **por el mismo motivo y con la misma regla**. La cookie lleva el
  // distintivo para que el `proxy` decida rapido —corre en Edge y no tiene Prisma—,
  // pero aqui **manda la base de datos**: si el `swc` de la cookie dijera 0 y la
  // columna dijera `true`, se devuelve `swc: 1`.
  //
  // **Si se borra esta ultima linea, nada falla.** El `select` seguiria trayendo la
  // columna, el token seguiria siendo valido y el panel seguiria abriendose con una
  // sesion que deberia estar limitada. Por eso va en el mismo `return` que el rol y
  // no en una linea suelta: es el unico sitio donde "manda la base de datos" se
  // convierte en algo que se puede ver de un vistazo.
  return {
    ...session,
    role: usuario.role,
    swc: usuario.debeCambiarContrasena ? 1 : 0,
  };
}