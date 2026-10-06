import { NextResponse } from "next/server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import {
  decisionDeIdempotencia,
  normalizarToken,
} from "@/lib/quote-idempotency";
import { CreateQuoteSchema, registrosDeAceptacion } from "@/lib/quote-schema";
import { clientKey, consume, retryAfterSeconds } from "@/lib/rate-limit";
import { validationError } from "@/lib/validation";

/**
 * Recibe una solicitud de cotizacion desde el formulario publico.
 *
 * Es un endpoint abierto por diseno, asi que se limita por IP: sin ese tope,
 * cualquiera puede llenar la tabla de solicitudes y agotar el pool de conexiones.
 *
 * **Es el unico verbo publico de `/api/quotes`** (RF-28): no hay ningun `GET`
 * aqui que liste o lea cotizaciones. Detalle y borrado viven en
 * `/api/quotes/[id]`, que **tambien** es de administracion.
 *
 * ## Idempotencia y aceptacion, en una sola transaccion (RF-19, RF-27)
 *
 * El orden importa y es el del plan §9:
 *
 *  1. rate limit;
 *  2. `idempotencyKey` con `normalizarToken()`: si no es un UUID v4, **400** y sin
 *     tocar la base de datos. Un token invalido no se trata como "primera vez".
 *  3. `CreateQuoteSchema`, que incluye la casilla de aceptacion: sin marcar, 400.
 *  4. Una transaccion que decide crear o devolver la existente **con una lectura
 *     dentro de ella**, y que anota los `LegalAcceptance` junto a la solicitud.
 *
 * Que la lectura este dentro de la transaccion y no antes es lo que hace que dos
 * pulsaciones simultaneas no creen dos solicitudes: la segunda ve la fila que
 * acaba de escribir la primera. Y si las dos llegan exactamente a la vez, el
 * indice unico de `idempotencyKey` (la migracion 2) hace que una falle, y el
 * `catch` la relee y responde 200 con esa misma solicitud en vez de 409.
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
    return NextResponse.json({ error: "Peticion invalida" }, { status: 400 });
  }

  // El token se valida **antes** de mirar nada mas. Ausente, `""` o manipulado:
  // los tres salen con 400, y ninguno consulta la base de datos.
  const token = normalizarToken(tokenDe(raw));
  if (token === null) {
    return NextResponse.json(
      {
        error: "Datos invalidos",
        fields: {
          idempotencyKey: "No se pudo leer el identificador de esta solicitud.",
        },
      },
      { status: 400 },
    );
  }

  const parsed = CreateQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }
  const input = parsed.data;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const existente = await tx.quoteRequest.findUnique({
        where: { idempotencyKey: token },
        select: { id: true },
      });

      const decision = decisionDeIdempotencia(token, existente);

      // Rama inalcanzable: el token ya se normalizo antes de la transaccion. Se
      // cubre igualmente para que el `catch` de fuera no tenga que distinguir un
      // error propio de uno de Prisma.
      if ("error" in decision) {
        return { estado: "token invalido" as const };
      }

      if (decision.reutilizar) {
        const previa = await tx.quoteRequest.findUniqueOrThrow({
          where: { id: decision.id },
          include: { items: { include: { product: true } } },
        });
        return { estado: "reutilizada" as const, quote: previa };
      }

      const quote = await tx.quoteRequest.create({
        data: {
          name: input.name,
          email: input.email ?? null,
          phone: input.phone,
          details: input.details,
          idempotencyKey: token,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Los cuatro campos de RF-20 y ni uno mas: `aceptadoAt` lo pone la base de
      // datos, `quoteRequestId` se acaba de conocer. Sin IP, sin nombre, sin
      // correo: el vinculo con la persona ya esta en `quoteRequestId`.
      await tx.legalAcceptance.createMany({
        data: registrosDeAceptacion().map((registro) => ({
          ...registro,
          quoteRequestId: quote.id,
        })),
      });

      return { estado: "creada" as const, quote };
    });

    if (resultado.estado === "token invalido") {
      return NextResponse.json(
        { error: "El identificador de esta solicitud no es valido." },
        { status: 400 },
      );
    }

    // Ya existe con ese token: **200 y no 201**, porque no se creo nada.
    if (resultado.estado === "reutilizada") {
      return NextResponse.json(resultado.quote, { status: 200 });
    }

    return NextResponse.json(resultado.quote, { status: 201 });
  } catch (error) {
    // Dos peticiones con el mismo token pueden haber llegado en el mismo frame: una
    // gano la carrera y la otra choca con el indice unico. En ese caso la respuesta
    // correcta es la misma solicitud con 200, no un 409 que el visitante leeria
    // como "tu envio ha fallado".
    const releida = await reutilizarPorToken(error, token);
    if (releida !== null) {
      return NextResponse.json(releida, { status: 200 });
    }

    const fallo = describePrismaError(error, "No se pudo enviar la solicitud.");
    if (fallo.serverFault) {
      // Solo el mensaje: el objeto de Prisma puede llevar la cadena de conexion.
      console.error("POST /api/quotes error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/**
 * Saca el `idempotencyKey` de un cuerpo que todavia no se ha validado.
 *
 * Existe para poder mirar **solo** ese campo antes del esquema completo. No es un
 * atajo para saltarse la validacion: el cuerpo entero se valida despues, igual
 * que siempre, y este `Record` solo evita un `any`.
 *
 * @param raw - El cuerpo ya parseado como JSON, de tipo desconocido.
 * @returns El valor del campo, o `undefined` si el cuerpo no es un objeto.
 */
function tokenDe(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  return (raw as Record<string, unknown>).idempotencyKey;
}

/**
 * Recupera la solicitud que gano la carrera cuando el fallo es el indice unico.
 *
 * **El discriminante es la busqueda por el token, no `meta.target`.** Con el
 * adaptador de MariaDB, el `P2002` del indice unico llega **sin `target`**, asi
 * que inspeccionarlo no dice nada (`JSON.stringify(undefined)` devuelve
 * `undefined`, y `.includes` sobre eso revienta con un `TypeError` que
 * convertiria un doble clic correcto en un 500). Ademas, aunque viniera, un
 * `P2002` puede ser de cualquier columna y se confundiria con una carrera.
 *
 * La comprobacion inequivoca es otra: si **existe una fila con MI token**, la
 * peticion que ha fallado es la segunda del doble clic, y la respuesta correcta
 * es esa fila con 200. Como la busqueda es por el token normalizado de esta misma
 * peticion, es imposible que devuelva la solicitud de otro visitante. Y si no hay
 * fila con ese token, el `P2002` era de otra columna y lo traduce
 * `describePrismaError` como 409, que es lo correcto.
 *
 * @param error - Lo que lanzo la transaccion.
 * @param token - El token normalizado de esta peticion.
 * @returns La solicitud ya creada, o `null` si este error no es una carrera.
 */
async function reutilizarPorToken(error: unknown, token: string): Promise<unknown> {
  // `instanceof` y no un `"code" in error`: es el mismo criterio que usa
  // `describePrismaError`, y un objeto cualquiera con un campo `code` no tiene que
  // poder hacerse pasar por una carrera de indice unico.
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code !== "P2002") return null;

  try {
    return await prisma.quoteRequest.findUnique({
      where: { idempotencyKey: token },
      include: { items: { include: { product: true } } },
    });
  } catch {
    return null;
  }
}