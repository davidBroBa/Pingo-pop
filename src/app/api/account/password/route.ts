import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ChangePasswordSchema,
  passwordPolicyProblems,
} from "@/lib/account-schema";
import { getSessionUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { SESSION_COOKIE } from "@/lib/auth/session-token";
import { prisma } from "@/lib/prisma";
import { clientKey, consume, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * Cambia la contrasena de la cuenta con sesion y **revoca todas sus sesiones**.
 *
 * Al cambiar la contrasena se incrementa `sessionVersion` del usuario. Como ese
 * valor viaja dentro de la cookie firmada, toda cookie emitida antes queda en una
 * version anterior y deja de valer en cuanto se comprueba contra la base de datos
 * (`getSessionUser`). Eso incluye la del dispositivo que hace el cambio: se pide la
 * contrasena de nuevo a proposito, porque cambiar la contrasena es una operacion de
 * seguridad y no un guardado de formulario (spec 006, D3).
 *
 * El endpoint lleva rate limit como el login: sin el, un atacante con una sesion
 * robada podria agotar los intentos de adivinar la contrasena actual.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const key = clientKey(request.headers);
  if (!consume(key, 5)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo en unos minutos." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(key)) },
      },
    );
  }

  const session = await getSessionUser();
  if (session === null) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const parsed = ChangePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos invalidos",
        fields: { form: "Revisa los campos del formulario." },
      },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  let usuario: {
    passwordHash: string;
    role: "BUYER" | "ADMIN";
    sessionVersion: number;
  } | null;
  try {
    usuario = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true, role: true, sessionVersion: true },
    });
  } catch (error) {
    console.error("POST /api/account/password: no se pudo leer el usuario:", error);
    return NextResponse.json(
      { error: "Servicio no disponible. Intenta de nuevo en unos minutos." },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }

  if (usuario === null) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 401 con texto generico: mismo mensaje tanto si la contrasena actual no es
  // correcta como si la cuenta ya no existe. Sin esto, el endpoint confirmaria si una
  // direccion de correo tiene cuenta.
  const actualValida = await verifyPassword(usuario.passwordHash, currentPassword);
  if (!actualValida) {
    return NextResponse.json(
      { error: "La contrasena actual no es correcta." },
      { status: 401 },
    );
  }

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "La contrasena nueva debe ser distinta de la actual." },
      { status: 400 },
    );
  }

  // La politica depende del rol, que no se deduce del esquema de validacion.
  const problemas = passwordPolicyProblems(newPassword, usuario.role);
  if (problemas.length > 0) {
    return NextResponse.json(
      { error: problemas.join(" "), fields: { newPassword: problemas[0] ?? "" } },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await hashPassword(newPassword);

    // Un solo `update`: hash y version suben juntos, o no sube ninguno. Si se
    // cambiaran por separado, una caida entre medias podria dejar una contrasena
    // nueva con la version vieja, es decir, sesiones vivas.
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
  } catch (error) {
    console.error("POST /api/account/password: no se pudo guardar:", error);
    return NextResponse.json(
      { error: "No se pudo cambiar la contrasena. Intenta de nuevo." },
      { status: 500 },
    );
  }

  // Cookie borrada con los mismos atributos con los que se creo. No se emite cookie
  // nueva a proposito: el cambio cierra tambien este dispositivo (D3).
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE.name, "", {
    httpOnly: SESSION_COOKIE.httpOnly,
    sameSite: SESSION_COOKIE.sameSite,
    secure: SESSION_COOKIE.secure,
    path: SESSION_COOKIE.path,
    maxAge: 0,
  });

  return NextResponse.json({
    ok: true,
    mensaje: "Contrasena cambiada. Vuelve a iniciar sesion.",
  });
}
