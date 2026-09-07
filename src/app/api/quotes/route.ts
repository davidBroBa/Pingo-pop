import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, email, phone, details, items } = body;

    if (
      !name ||
      !phone ||
      !details ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios." },
        { status: 400 },
      );
    }

    const quote = await prisma.quoteRequest.create({
      data: {
        name,
        email: email || null,
        phone,
        details,
        items: {
          create: items.map(
            (item: { productId: number; quantity: number }) => ({
              productId: Number(item.productId),
              quantity: Number(item.quantity) || 1,
            }),
          ),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error("Error creating quote:", error);

    return NextResponse.json(
      { error: "No se pudo enviar la solicitud." },
      { status: 500 },
    );
  }
}
