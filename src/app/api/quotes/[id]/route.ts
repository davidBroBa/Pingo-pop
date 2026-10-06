import { NextResponse } from "next/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";

/**
 * `params` llega como promesa: es la convencion del App Router, y ya se usa
 * igual en `src/app/api/categories/[id]/route.ts`.
 */
type Contexto = { params: Promise<{ id: string }> };

/**
 * Id numerico de la solicitud, validado antes de tocar la base de datos.
 *
 * Sale de la URL, o sea de entrada no confiable: `"abc"`, `"-1"`, `"1e9"` o
 * `"1; DROP TABLE"` tienen que ser un **400**, no un 500 de Prisma ni una
 * consulta rara.
 */
const IdSchema = z.coerce
  .number({ error: "La solicitud no es valida" })
  .int("La solicitud no es valida")
  .positive("La solicitud no es valida");

/**
 * ⚠️ **ESTA RUTA NO ES PUBLICA**, aunque cuelgue de `/api/quotes`.
 *
 * RF-28 deja la via publica en **solo de creacion**: aqui no hay ni un `GET` que
 * liste, y los dos verbos que si existen exigen `requireAdmin()`, que ademas
 * comprueba la revocacion de la sesion contra la base de datos (401 sin sesion,
 * 403 con un rol que no sea ADMIN). Un `GET` publico aqui seria la via por la
 * que cualquiera leeria nombre, correo, telefono y direccion de entrega de otra
 * persona.
 */

/**
 * Detalle de una solicitud con sus partidas y que documentos acepto (RF-21).
 *
 * @param _request - No se usa: no hay cuerpo ni parametros en esta operacion.
 * @param context - Params de la ruta, con el id de la solicitud.
 * @returns 200 con la solicitud, sus partidas, sus productos y sus aceptaciones;
 *   401/403 sin permisos de administrador; 404 si no existe.
 */
export async function GET(
  _request: Request,
  context: Contexto,
): Promise<NextResponse> {
  const { denial } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  const { id: idCrudo } = await context.params;
  const parsed = IdSchema.safeParse(idCrudo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La solicitud indicada no es valida." },
      { status: 400 },
    );
  }

  try {
    const quote = await prisma.quoteRequest.findUnique({
      where: { id: parsed.data },
      include: {
        items: { include: { product: true } },
        legalAcceptances: { orderBy: { aceptadoAt: "asc" } },
      },
    });

    if (quote === null) {
      return NextResponse.json(
        { error: "La solicitud indicada no existe." },
        { status: 404 },
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo obtener la solicitud.");
    if (fallo.serverFault) {
      console.error("GET /api/quotes/[id] error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/**
 * Borra una solicitud **completa**: la solicitud, sus partidas y el registro de
 * aceptacion, en **una sola transaccion** (RF-14, RF-24, R9).
 *
 * ## Por que se borra tambien la evidencia, y por que NO contradice al `SET NULL`
 *
 * Son **dos cosas distintas a proposito**, y parece una contradiccion si no se
 * dice:
 *
 *  - **El `ON DELETE SET NULL` de la FK** es la **red de seguridad** para cuando
 *    algo *no* borra la fila: un `prisma migrate reset`, un borrado manual desde
 *    un cliente de base de datos, o un futuro script. En ese caso la aceptacion
 *    sobrevive sin dato personal, y sigue diciendo que version estaba vigente.
 *  - **Este `DELETE` explicito** es el ejercicio de un **derecho de supresion**: la
 *    persona pidió que sus datos se borraran (RF-12), y el registro de aceptacion
 *    es tambien dato suyo, porque guarda **que** acepto y **cuando** (RF-20). Por
 *    eso va incluido en la misma operacion.
 *
 * Que el borrado sea de los dos lados no es una concession: es lo unico que
 * cumple RF-24, y el aviso de privacidad lo dice asi ("se elimina junto con sus
 * partidas en una sola operacion"). Borrar la solicitud y dejar sus partidas, o
 * dejar la aceptacion apuntando a un id que ya no existe, seria dar la impresion
 * de un borrado que no ha ocurrido.
 *
 * El orden de las tres borradas es el que impone la integridad referencial: las
 * partidas van primero porque `QuoteRequestItem.quoteRequestId` no tiene
 * `onDelete`, y `LegalAcceptance` puede ir en cualquier momento porque su FK si
 * es `SET NULL`. Con `$transaction` interactiva, **las tres o ninguna**: si algo
 * falla a la mitad, Prisma revierte y no queda ni una fila huerfana. Ese es el
 * riesgo R9, el peor de esta spec, y la razon de que no sea "borrar y ya".
 *
 * @param _request - No se usa: el id va en la URL y el borrado no tiene cuerpo.
 * @param context - Params de la ruta, con el id de la solicitud.
 * @returns 200 si se borro; 401/403 sin permisos; 404 si no existia.
 */
export async function DELETE(
  _request: Request,
  context: Contexto,
): Promise<NextResponse> {
  const { denial } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  const { id: idCrudo } = await context.params;
  const parsed = IdSchema.safeParse(idCrudo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La solicitud indicada no es valida." },
      { status: 400 },
    );
  }

  const id = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Primero las hijas, por el orden que impone la FK.
      await tx.quoteRequestItem.deleteMany({ where: { quoteRequestId: id } });
      await tx.legalAcceptance.deleteMany({ where: { quoteRequestId: id } });

      // Esta es la que decide si existia: `P2025` sale como 404 por
      // `describePrismaError`. Si no existia, las dos de arriba no han borrado
      // nada (no habia nada que borrar) y la transaccion revierte igualmente.
      await tx.quoteRequest.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo borrar la solicitud.");
    if (fallo.serverFault) {
      console.error("DELETE /api/quotes/[id] error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}