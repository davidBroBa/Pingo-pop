import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { describePrismaError } from "@/lib/prisma-error";
import { writeHeroImage } from "@/lib/site-settings";
import { siteImagePath, validationError } from "@/lib/validation";

import { z } from "zod";

/** Cuerpo del `PATCH`. Solo la foto: lo demas del sitio sigue siendo codigo. */
const UpdateSiteSchema = z.object({
  heroImage: siteImagePath,
});

/**
 * Guarda la foto del hero.
 *
 * Solo para administradores: `requireAdmin()` corre **antes** de tocar nada y
 * devuelve 401 sin sesion, 403 con un rol que no sea ADMIN. La ruta llega
 * validada por `siteImagePath`, que solo admite `/uploads/site/<32 hex>.<ext>`
 * y rechaza traversal, URLs externas y la forma de la carpeta de productos.
 *
 * @param request - Peticion JSON con `heroImage`, o cadena vacia para quitarla.
 * @returns 200 con la ruta guardada, o el motivo del rechazo.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const { denial } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Peticion invalida" }, { status: 400 });
  }

  const parsed = UpdateSiteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }

  // `""` y los espacios son "quitar la foto": el preprocess los deja en
  // `undefined`, y a la base de datos le llega `null`.
  const heroImage = parsed.data.heroImage ?? null;

  try {
    await writeHeroImage(heroImage);
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo guardar la foto.");
    if (fallo.serverFault) {
      console.error("Error guardando la foto del hero:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }

  return NextResponse.json({ heroImage });
}