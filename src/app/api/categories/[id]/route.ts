import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { describePrismaError } from "@/lib/prisma-error";
import { UpdateCategorySchema, slugify, validationError } from "@/lib/validation";

/**
 * `params` llega como promesa: es la convencion del App Router, y ya se usa
 * igual en `src/app/products/[slug]/page.tsx`.
 */
type Contexto = { params: Promise<{ id: string }> };

/**
 * Edita una categoria: nombre, descripcion e imagen. Solo administradores.
 *
 * El `slug` **no se toca nunca** (D13): es la URL publica de la categoria y ya
 * hay productos apuntando a ella, asi que cambiarlo dejaria enlaces muertos sin
 * avisar. `UpdateCategorySchema` ni siquiera acepta el campo, asi que aunque el
 * cliente lo mande se descarta antes de llegar a Prisma.
 *
 * Si el nombre nuevo deriva a un slug que ya pertenece a **otra** categoria se
 * responde 409 en vez de dejar dos categorias con la misma URL.
 */
export async function PATCH(
  request: Request,
  context: Contexto,
): Promise<NextResponse> {
  const { denial } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  const { id: idCrudo } = await context.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Peticion invalida" }, { status: 400 });
  }

  // El id de la URL manda sobre el del cuerpo: si no coinciden, es un error de
  // quien lo llama, no algo que "se promedie" hacia abajo.
  const parsed = UpdateCategorySchema.safeParse({ ...(raw as object), id: idCrudo });
  if (!parsed.success) {
    return NextResponse.json(validationError(parsed.error.issues), {
      status: 400,
    });
  }
  const input = parsed.data;

  try {
    const actual = await prisma.category.findUnique({
      where: { id: input.id },
      select: { id: true, slug: true },
    });
    if (actual === null) {
      return NextResponse.json(
        { error: "La categoría indicada no existe." },
        { status: 404 },
      );
    }

    // El slug no se escribe, pero el nombre si: si el nombre nuevo choca con el
    // slug de otra categoria hay que decirlo, porque ese nombre ya no podra
    // usarse para crear nada mas.
    const slugDerivado = slugify(input.name);
    const choque = await prisma.category.findFirst({
      where: { slug: slugDerivado, NOT: { id: input.id } },
      select: { id: true },
    });
    if (choque !== null) {
      return NextResponse.json(
        { error: "Ya existe otra categoría con ese nombre." },
        { status: 409 },
      );
    }

    const category = await prisma.category.update({
      where: { id: input.id },
      data: {
        name: input.name,
        description: input.description ?? null,
        image: input.image ?? null,
      },
    });
    return NextResponse.json(category);
  } catch (error) {
    // `P2025` sale como 404 por `describePrismaError`: alguien borro la fila
    // entre el `findUnique` y el `update`.
    const fallo = describePrismaError(error, "No se pudo actualizar la categoría.");
    if (fallo.serverFault) {
      console.error("PATCH /api/categories/[id] error:", fallo.message);
    }
    return NextResponse.json({ error: fallo.message }, { status: fallo.status });
  }
}