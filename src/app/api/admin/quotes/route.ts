import { NextResponse } from "next/server";

import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { QuoteStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import { contarAntiguas, MESES_RETENCION } from "@/lib/retention";
import { validationError } from "@/lib/validation";

/**
 * Los cinco valores de `QuoteStatus`, tomados del cliente generado.
 *
 * Se leen del enum y no se escriben a mano: si mañana se añade un estado al
 * esquema, esta lista lo recoge sin que nadie se acuerde de updating el
 * endpoint. Y como el enum tambien es lo que Prisma acepta, un valor fuera de
 * aqui **no puede** llegar a la base de datos (RF-26).
 *
 * Consecuencia buscada: un estado inventado sale con **400** y no con un 500. Un
 * 500 diria que el servidor esta roto cuando lo que esta mal es lo que se ha
 * mandado.
 */
const ESTADOS = Object.values(QuoteStatus);

/** Cambio de estado: id de la solicitud y estado nuevo. */
const UpdateQuoteSchema = z.object({
  id: z.coerce
    .number({ error: "La solicitud no es valida" })
    .int("La solicitud no es valida")
    .positive("La solicitud no es valida"),
  status: z.enum(ESTADOS, {
    error: `El estado debe ser uno de: ${ESTADOS.join(", ")}.`,
  }),
});

/**
 * Listado de solicitudes de cotizacion para el panel. Solo administradores.
 *
 * `requireAdmin()` va **antes de la consulta**: sin sesion 401 y con un rol que
 * no sea ADMIN 403. Aqui hay nombre, correo, telefono y direccion de entrega de
 * personas que no sabe que estan en el sistema, asi que esta ruta no tiene
 * ninguna version publica (RF-28).
 *
 * El recorte de datos es explicito (`select`), no un `include` de todo: asi una
 * columna nueva del modelo no aparece por sorpresa en una respuesta HTTP.
 *
 * El **`hoy` se lee aqui**, en el servidor, y se devuelve en la respuesta: el
 * panel no lee el reloj (P8), reutiliza esta fecha para que el contador y las
 * marcas por antiguedad se calculen contra el mismo instante.
 *
 * @returns 200 con `{ hoy, mesesRetencion, vencidas, solicitudes }`.
 */
export async function GET(): Promise<NextResponse> {
  const { denial } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  try {
    const solicitudes = await prisma.quoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        details: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { items: true, legalAcceptances: true } },
        // Que version de cada documento acepto esa solicitud (RF-21). Sin esto
        // el panel no puede demostrar que texto estaba vigente el dia del envio.
        legalAcceptances: {
          select: { tipo: true, version: true, aceptadoAt: true },
          orderBy: { aceptadoAt: "asc" },
        },
      },
    });

    const hoy = new Date();

    return NextResponse.json({
      hoy: hoy.toISOString(),
      mesesRetencion: MESES_RETENCION,
      // El numero de vencidas sale de la funcion pura, no de un filtro escrito
      // aqui: la regla de "12 meses y solo en estado terminal" esta en un sitio
      // y con sus tests (RF-23, RF-24).
      vencidas: contarAntiguas(solicitudes, hoy),
      solicitudes,
    });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudieron obtener las solicitudes.");
    if (fallo.serverFault) {
      console.error("GET /api/admin/quotes error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/**
 * Cambia el estado de una solicitud. Solo administradores.
 *
 * El estado viaja en el **cuerpo** y no en la ruta (P5): es un solo campo, y
 * `/api/admin/quotes/[id]` ya existe para el detalle y el borrado.
 *
 * @param request - Peticion JSON con `{ id, status }`.
 * @returns 200 con la solicitud actualizada, 400 si el estado no es del enum, o
 *   404 si la solicitud no existe.
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

  const parsed = UpdateQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }

  try {
    const quote = await prisma.quoteRequest.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
      select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json(quote);
  } catch (error) {
    // `P2025` sale como 404 por `describePrismaError`.
    const fallo = describePrismaError(error, "No se pudo actualizar la solicitud.");
    if (fallo.serverFault) {
      console.error("PATCH /api/admin/quotes error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}