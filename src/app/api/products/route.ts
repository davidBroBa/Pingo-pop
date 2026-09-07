import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products error:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los productos." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const description = String(body.description ?? "").trim();
    const price = Number(body.price);
    const categoryId = Number(body.categoryId);
    const featured = Boolean(body.featured);

    if (!name || !slug || !price || !categoryId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 },
      );
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price,
        categoryId,
        featured,
        active: true,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);

    return NextResponse.json(
      { error: "No se pudo crear el producto." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const id = Number(body.id);
    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const description = String(body.description ?? "").trim();
    const price = Number(body.price);
    const categoryId = Number(body.categoryId);
    const featured = Boolean(body.featured);
    const active = Boolean(body.active);

    if (!id || !name || !slug || !price || !categoryId) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: {
        id,
      },
      data: {
        name,
        slug,
        description: description || null,
        price,
        categoryId,
        featured,
        active,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("PUT /api/products error:", error);

    return NextResponse.json(
      { error: "No se pudo actualizar el producto." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "Producto inválido." },
        { status: 400 },
      );
    }

    await prisma.product.update({
      where: {
        id,
      },
      data: {
        active: false,
      },
    });

    return NextResponse.json({
      message: "Producto eliminado correctamente.",
    });
  } catch (error) {
    console.error("DELETE /api/products error:", error);

    return NextResponse.json(
      { error: "No se pudo eliminar el producto." },
      { status: 500 },
    );
  }
}
