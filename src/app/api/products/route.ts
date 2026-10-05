import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import {
  CreateProductSchema,
  UpdateProductSchema,
  DeleteProductSchema,
  slugify,
  validationError,
} from "@/lib/validation";

/**
 * Lista productos.
 *
 * GET es publico: el catalogo es la cara visible de la tienda. Las
 * operaciones de escritura si exigen rol ADMIN, comprobado en el servidor.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudieron obtener los productos.");
    if (fallo.serverFault) {
      console.error("GET /api/products error:", error);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/** Crea un producto. Solo administradores. */
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

  const parsed = CreateProductSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }
  const input = parsed.data;

  try {
    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        description: input.description ?? null,
        price: input.price,
        categoryId: input.categoryId,
        featured: input.featured,
        active: true,
        image: input.image ?? null,
      },
      include: { category: true },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo crear el producto.");
    if (fallo.serverFault) {
      console.error("POST /api/products error:", error);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/** Actualiza un producto. Solo administradores. */
export async function PUT(request: Request): Promise<NextResponse> {
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

  const parsed = UpdateProductSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }
  const input = parsed.data;

  try {
    const product = await prisma.product.update({
      where: { id: input.id },
      data: {
        name: input.name,
        slug: input.slug ?? slugify(input.name),
        description: input.description ?? null,
        price: input.price,
        categoryId: input.categoryId,
        featured: input.featured,
        active: input.active,
        image: input.image ?? null,
      },
      include: { category: true },
    });
    return NextResponse.json(product);
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo actualizar el producto.");
    if (fallo.serverFault) {
      console.error("PUT /api/products error:", error);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}

/** Baja logica de un producto. Solo administradores. */
export async function DELETE(request: Request): Promise<NextResponse> {
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

  const parsed = DeleteProductSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }

  try {
    await prisma.product.update({
      where: { id: parsed.data.id },
      data: { active: false },
    });
    return NextResponse.json({ message: "Producto eliminado correctamente." });
  } catch (error) {
    const fallo = describePrismaError(error, "No se pudo eliminar el producto.");
    if (fallo.serverFault) {
      console.error("DELETE /api/products error:", error);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}