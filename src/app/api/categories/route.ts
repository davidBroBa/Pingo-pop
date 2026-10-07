import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import { clientKey, consume, MAX_LECTURAS_PUBLICAS, retryAfterSeconds } from "@/lib/rate-limit";
import {
  CreateCategorySchema,
  slugify,
  validationError,
} from "@/lib/validation";

/**
 * Lista categorias. Publico: alimenta los filtros del catalogo.
 *
 * Lleva rate limit de lectura (RF-33), igual que `GET /api/products`: la
 * firma recibe `request` porque las cabeceras de la IP llegan ahi.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const key = clientKey(request.headers);
  if (!consume(key, MAX_LECTURAS_PUBLICAS)) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Intenta de nuevo mas tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(key)) } },
    );
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudieron obtener las categorías.");
    if (fallo.serverFault) {
      console.error("GET /api/categories error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/** Crea una categoria. Solo administradores. */
export async function POST(request: Request): Promise<NextResponse> {
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

  const parsed = CreateCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }
  const input = parsed.data;
  const slug = input.slug ?? slugify(input.name);

  try {
    const duplicate = await prisma.category.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (duplicate !== null) {
      return NextResponse.json(
        { error: "Ya existe una categoría con ese slug." },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        image: input.image ?? null,
      },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo crear la categoría.");
    if (fallo.serverFault) {
      console.error("POST /api/categories error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}