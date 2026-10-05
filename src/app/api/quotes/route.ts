import { NextResponse } from "next/server";

import { CreateQuoteSchema } from "@/lib/quote-schema";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import { clientKey, consume, retryAfterSeconds } from "@/lib/rate-limit";
import { validationError } from "@/lib/validation";

/**
 * Recibe una solicitud de cotizacion desde el formulario publico.
 *
 * Es un endpoint abierto por diseno, asi que se limita por IP: sin ese tope,
 * cualquiera puede llenar la tabla de solicitudes y agotar el pool de conexiones.
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

  const parsed = CreateQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }
  const input = parsed.data;

  try {
    const quote = await prisma.quoteRequest.create({
      data: {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone,
        details: input.details,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo enviar la solicitud.");
    if (fallo.serverFault) {
      console.error("POST /api/quotes error:", error);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}