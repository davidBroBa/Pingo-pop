import { NextResponse } from "next/server";

import { UpdateProfileSchema } from "@/lib/account-schema";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * Edita el perfil de la cuenta con sesion: **solo el nombre visible**.
 *
 * El `email` no se cambia por aqui, y `UpdateProfileSchema` es `.strict()` para que
 * un `PATCH` con campos de mas falle en vez de dar la sensacion de que se han
 * guardado. El `select` de la lectura tampoco trae jamas `passwordHash` (RF-7).
 */
export async function PATCH(request: Request): Promise<NextResponse> {
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

  const parsed = UpdateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
      fields[key] ??= issue.message;
    }
    return NextResponse.json({ error: "Datos invalidos", fields }, { status: 400 });
  }

  try {
    const usuario = await prisma.user.update({
      where: { id: session.userId },
      data: { name: parsed.data.name },
      // El select evita que un cambio futuro del modelo acabe devolviendo el hash.
      select: { id: true, name: true },
    });

    return NextResponse.json({ ok: true, name: usuario.name });
  } catch (error) {
    console.error("PATCH /api/account/profile: no se pudo guardar:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el perfil. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
