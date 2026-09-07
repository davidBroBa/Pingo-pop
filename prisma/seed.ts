import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: "localhost",
  port: 3306,
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "pingo_pop",
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const categories = [
    {
      name: "Pines metálicos",
      slug: "pines-metalicos",
      description: "Pines personalizados con acabados profesionales.",
    },
    {
      name: "Botones fotográficos",
      slug: "botones-fotograficos",
      description: "Botones personalizados con tus diseños favoritos.",
    },
    {
      name: "Impresión 3D",
      slug: "impresion-3d",
      description: "Figuras y piezas personalizadas impresas en 3D.",
    },
    {
      name: "Llaveros",
      slug: "llaveros",
      description: "Llaveros personalizados para regalos y proyectos.",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: category,
      create: category,
    });
  }

  const pines = await prisma.category.findUniqueOrThrow({
    where: {
      slug: "pines-metalicos",
    },
  });

  const botones = await prisma.category.findUniqueOrThrow({
    where: {
      slug: "botones-fotograficos",
    },
  });

  const impresion3d = await prisma.category.findUniqueOrThrow({
    where: {
      slug: "impresion-3d",
    },
  });

  const llaveros = await prisma.category.findUniqueOrThrow({
    where: {
      slug: "llaveros",
    },
  });

  const products = [
    {
      name: "Pin personalizado",
      slug: "pin-personalizado",
      description: "Pin metálico personalizado con tu diseño.",
      price: 35,
      featured: true,
      categoryId: pines.id,
    },
    {
      name: "Botón personalizado",
      slug: "boton-personalizado",
      description: "Botón fotográfico personalizado con tu imagen.",
      price: 15,
      featured: true,
      categoryId: botones.id,
    },
    {
      name: "Figura personalizada 3D",
      slug: "figura-personalizada-3d",
      description: "Figura personalizada fabricada mediante impresión 3D.",
      price: 150,
      featured: true,
      categoryId: impresion3d.id,
    },
    {
      name: "Llavero personalizado",
      slug: "llavero-personalizado",
      description: "Llavero personalizado para regalos y proyectos especiales.",
      price: 30,
      featured: false,
      categoryId: llaveros.id,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      update: product,
      create: product,
    });
  }

  console.log("Seed completado correctamente.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
