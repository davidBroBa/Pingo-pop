import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { LegalDataSchema } from "@/lib/legal-data";
import { writeLegalData } from "@/lib/legal-settings";
import { describePrismaError } from "@/lib/prisma-error";
import { validationError } from "@/lib/validation";

/**
 * Guarda los seis datos legales del responsable.
 *
 * `requireAdmin()` corre **antes de tocar nada**: sin sesion 401, con un rol que
 * no sea ADMIN 403. Los datos son del negocio (D18), no codigo, asi que esta es
 * la unica via por la que se rellenan y no hay ninguna variable de entorno de
 * la que leerlos ni de la que depender para que el sitio arranque.
 *
 * El cuerpo lo valida `LegalDataSchema` en el borde: un RFC con 4 caracteres, un
 * correo que no es correo o un texto por encima de su longitud salen con **400**
 * y el campo concreto del problema, sin llegar a Prisma.
 *
 * El log **solo** se escribe si el fallo es del servidor, y solo con
 * `fallo.message`: el objeto crudo de Prisma puede llevar la cadena de conexion.
 *
 * @param request - Peticion JSON con los seis campos. `""` y `"   "` son ausencia.
 * @returns 200 con los seis campos guardados, o el motivo del rechazo.
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

  const parsed = LegalDataSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }

  try {
    const guardados = await writeLegalData(parsed.data);
    return NextResponse.json({ legal: guardados });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudieron guardar los datos legales.");
    if (fallo.serverFault) {
      console.error("PATCH /api/admin/legal error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}