import { NextResponse, type NextRequest } from "next/server";

import { limitaSesionTemporal } from "@/lib/auth/sesion-temporal";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session-token";

/**
 * Corta el acceso al panel de administracion antes de renderizar la pagina.
 *
 * Solo protege la navegacion. Las route handlers vuelven a comprobar la sesion
 * en el servidor (`requireAdmin`), porque una peticion directa a `/api/...` no
 * pasa por aqui y no debe apoyarse solo en esta comprobacion.
 *
 * @param request - Peticion entrante.
 * @returns Redireccion a `/login` o a `/` segun falte la sesion o falte el rol;
 *   **403** si la sesion sigue con la contrasena temporal; `null` si puede continuar.
 */
export async function middleware(
  request: NextRequest,
): Promise<NextResponse | null> {
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE.name)?.value,
  );
  if (session === null) {
    const target = new URL("/login", request.url);
    target.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(target);
  }

  /**
   * Sesion con la contrasena temporal sin cambiar (spec 007, D21).
   *
   * Va **despues** de validar la sesion y **antes** del rol. Se comprueba con el
   * `matcher` que hay, que es `["/admin/:path*", "/perfil"]`: el proxy **no ve
   * ninguna otra ruta**, asi que el limite no puede ser "redirigirlo todo a
   * `/perfil`", sino **denegar el panel** y dejar pasar el perfil, que es donde se
   * cambia. Ver `src/lib/auth/sesion-temporal.ts` para el por que de esa decision,
   * y para la otra barrera que la API si necesita: este `proxy` protege la
   * navegacion, pero una peticion directa a `/api/admin/...` no pasa por aqui, y por
   * eso `requireAdmin()` comprueba lo mismo y devuelve 403.
   *
   * Aqui se mira el `swc` **de la cookie**, no el de la base de datos, porque el
   * proxy corre en Edge y no tiene Prisma. La cookie va firmada, asi que un `swc`
   * editado a mano no pasa `verifySession`. Y la verdad sigue estando ahi:
   * `requireAdmin()` y `getSessionUser()` releen la columna y mandan sobre esto.
   */
  if (
    limitaSesionTemporal(request.nextUrl.pathname, session.swc) === "denegar"
  ) {
    return new NextResponse(
      "Tu sesión tiene una contraseña temporal: cámbiala en tu perfil antes de usar el panel.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  // `/perfil` es de cualquier usuario con sesion; solo `/admin/*` exige ADMIN. Sin
  // esta distincion, un BUYER que abriera su perfil caeria en un redirect a `/`.
  const esAdmin = request.nextUrl.pathname.startsWith("/admin");
  if (esAdmin && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return null;
}

export const config = {
  matcher: ["/admin/:path*", "/perfil"],
};