import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/session-token";

/**
 * Cierra la sesion eliminando la cookie.
 *
 * La cookie se borra con los mismos atributos con los que se creo; si no,
 * el navegador conservaria una version anterior con otro ambito.
 */
export async function POST(): Promise<NextResponse> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE.name, "", {
    httpOnly: SESSION_COOKIE.httpOnly,
    sameSite: SESSION_COOKIE.sameSite,
    secure: SESSION_COOKIE.secure,
    path: SESSION_COOKIE.path,
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}