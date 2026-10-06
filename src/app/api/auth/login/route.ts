import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  buildSessionPayload,
  signSession,
} from "@/lib/auth/session-token";
import { prisma } from "@/lib/prisma";
import { clientKey, consume, retryAfterSeconds } from "@/lib/rate-limit";

/** Contrato de entrada del endpoint de login. */
const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no valido").max(254),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres").max(200),
});

/**
 * Autentica a un usuario y emite la cookie de sesion firmada.
 *
 * Ante credenciales invalidas responde siempre 401 con el mismo texto, exista o
 * no la cuenta, para no permitir enumerar usuarios. Cuando el email no existe se
 * ejecuta igualmente una verificacion contra un hash ficticio, de modo que el
 * tiempo de respuesta tampoco revela si el alta existe.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const key = clientKey(request.headers);
  if (!consume(key)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Intenta de nuevo mas tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(key)) },
      },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // Sin este bloque, una caida de la base de datos sale como 500 sin controlar
  // desde el manejador de Next. Ademas delifica: un 500 distingue "la base de
  // datos no esta" de un 401, lo que rompe la garantia de no filtrar si la
  // cuenta existe. 503 dice "vuelve a intentarlo", que es lo cierto.
  let user: {
    id: number;
    passwordHash: string;
    role: "BUYER" | "ADMIN";
    sessionVersion: number;
  } | null;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      // `sessionVersion` viaja en la cookie firmada: es lo que permite revocar todas
      // las sesiones al cambiar la contrasena (spec 006).
      select: {
        id: true,
        passwordHash: true,
        role: true,
        sessionVersion: true,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login: no se pudo leer el usuario:", error);
    return NextResponse.json(
      { error: "Servicio no disponible. Intenta de nuevo en unos minutos." },
      { status: 503, headers: { "Retry-After": "30" } },
    );
  }

  if (user === null) {
    // Coste equivalente al de un acierto para que el tiempo no delate la cuenta.
    await verifyPassword(DUMMY_HASH, password);
    return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    return NextResponse.json({ error: "Credenciales invalidas" }, { status: 401 });
  }

  const token = await signSession(
    buildSessionPayload(user.id, user.role, user.sessionVersion),
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE.name, token, {
    httpOnly: SESSION_COOKIE.httpOnly,
    sameSite: SESSION_COOKIE.sameSite,
    secure: SESSION_COOKIE.secure,
    path: SESSION_COOKIE.path,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return NextResponse.json({ ok: true, role: user.role });
}

/**
 * Hash argon2 valido pero sin ninguna cuenta asociada.
 *
 * Solo sirve para igualar el coste de CPU entre "usuario no existe" y
 * "contrasena incorrecta". No protege ningun secreto.
 */
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHR2YWx1ZQ$J8Q7vJ2n0Zq5Yy1sR4wX0Y9d3kQ8mN1pR2tV6bJ7cA";