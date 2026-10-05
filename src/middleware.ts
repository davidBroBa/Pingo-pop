import { NextResponse, type NextRequest } from "next/server";

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
 *   `null` si la peticion puede continuar.
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
  if (session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return null;
}

export const config = {
  matcher: ["/admin/:path*"],
};