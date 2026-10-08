import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth/password";
import {
  buildSessionPayload,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  signSession,
} from "@/lib/auth/session-token";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import { RegisterSchema } from "@/lib/register-schema";
import { clientKey, consume, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * Crea una cuenta de cliente (rol `BUYER`) y abre sesion (spec 010).
 *
 * Nunca puede crear un ADMIN: el rol se fija aqui, en el servidor, y el payload
 * del registro ni siquiera lo contempla. Los administradores solo nacen desde
 * `/admin/usuarios` (spec 007) o del seed.
 */

export async function POST(request: Request): Promise<NextResponse> {
  const key = clientKey(request.headers);
  if (!consume(key, 5)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en unos minutos." },
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

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos invalidos",
        fields: Object.fromEntries(
          parsed.error.issues.map((issue) => {
            const key = issue.path[0];
            return [typeof key === "string" ? key : "form", issue.message];
          }),
        ),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const exists = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  }).catch(() => null);
  if (exists !== null) {
    return NextResponse.json(
      { error: "El correo ya esta registrado." },
      { status: 409 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name || null,
          passwordHash: await hashPassword(input.password),
          role: "BUYER",
          activo: true,
          debeCambiarContrasena: false,
        },
      });

      await tx.legalAcceptance.createMany({
        data: [
          {
            userId: user.id,
            tipo: "TERMINOS",
            version: input.aceptacion.terminos,
          },
          {
            userId: user.id,
            tipo: "PRIVACIDAD",
            version: input.aceptacion.privacidad,
          },
        ],
      });

      return user;
    });

    const token = await signSession(
      buildSessionPayload(result.id, "BUYER", result.sessionVersion, 0),
    );
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE.name, token, {
      httpOnly: SESSION_COOKIE.httpOnly,
      sameSite: SESSION_COOKIE.sameSite,
      secure: SESSION_COOKIE.secure,
      path: SESSION_COOKIE.path,
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    });

    return NextResponse.json({ ok: true, role: "BUYER" }, { status: 201 });
  } catch (error) {
    // El pre-chequeo de arriba cubre el caso normal; esta rama cubre la carrera
    // (dos altas con el mismo correo a la vez), que revienta en la restriccion
    // `unique` dentro de la transaccion.
    const described = describePrismaError(
      error,
      "Servicio no disponible. Intenta de nuevo en unos minutos.",
    );
    if (described.serverFault) {
      console.error("POST /api/auth/register:", error);
      return NextResponse.json(
        { error: described.message },
        { status: 503, headers: { "Retry-After": "30" } },
      );
    }
    return NextResponse.json({ error: described.message }, {
      status: described.status,
    });
  }
}
