import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword, meetsPasswordPolicy } from "../src/lib/auth/password";

/**
 * Carga los datos de demostracion y el primer administrador.
 *
 * Ejecutar con `npm run db:seed`. Es idempotente: se puede volver a lanzar sin
 * duplicar categorias ni productos.
 *
 * Las credenciales NO estan escritas aqui. Vienen de `DATABASE_URL` y de
 * `ADMIN_EMAIL` / `ADMIN_PASSWORD`, de modo que ningun secreto acaba en el
 * repositorio ni en un fichero de ejemplo.
 */

/**
 * Construye el cliente de Prisma para el proceso del seed.
 *
 * Duplicate de la logica de `@/lib/prisma` a proposito: este script corre con
 * `tsx`, fuera del bundler de Next, donde `server-only` no resuelve.
 *
 * @returns Cliente conectado usando `DATABASE_URL`.
 * @throws Si `DATABASE_URL` falta o no es una URL de MySQL valida.
 */
function createClient(): PrismaClient {
  const url = new URL(requireEnv("DATABASE_URL"));
  if (url.protocol !== "mysql:") {
    throw new Error(
      `DATABASE_URL debe usar el esquema mysql://, no ${url.protocol}`,
    );
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (database.length === 0) {
    throw new Error("DATABASE_URL no indica el nombre de la base de datos.");
  }

  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: url.port === "" ? 3306 : Number(url.port),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database,
      connectionLimit: 5,
    }),
  });
}

/**
 * Lee una variable de entorno obligatoria.
 *
 * @param name - Nombre de la variable.
 * @returns Su valor.
 * @throws Si falta o esta vacia.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Falta la variable de entorno ${name} para ejecutar el seed.`);
  }
  return value;
}

/** Carga las categorias y los productos de ejemplo del catalogo. */
async function seedCatalog(prisma: PrismaClient): Promise<void> {
  const categories = [
    {
      name: "Pines metálicos",
      slug: "pines-metalicos",
      description: "Pines de catálogo VIP, listos para pedir.",
    },
    {
      name: "Botones fotográficos",
      slug: "botones-fotograficos",
      description: "Botones personalizados con tus diseños favoritos.",
    },
    {
      name: "Impresión 3D",
      slug: "impresion-3d",
      description:
        "Réplicas ya hechas, y también figuras creadas desde tu archivo.",
    },
    {
      name: "Llaveros",
      slug: "llaveros",
      description: "Llaveros de catálogo para regalos y proyectos.",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  /** Resuelve el id de una categoria por su slug. */
  const idOf = async (slug: string): Promise<number> => {
    const found = await prisma.category.findUniqueOrThrow({
      where: { slug },
      select: { id: true },
    });
    return found.id;
  };

  const products = [
    {
      name: "Pin VIP",
      slug: "pin-vip",
      description: "Pin metálico de catálogo VIP, listo para pedir.",
      price: 35,
      featured: true,
      categoryId: await idOf("pines-metalicos"),
    },
    {
      name: "Botón personalizado",
      slug: "boton-personalizado",
      description: "Botón fotográfico personalizado con tu imagen.",
      price: 15,
      featured: true,
      categoryId: await idOf("botones-fotograficos"),
    },
    {
      name: "Figura personalizada 3D",
      slug: "figura-personalizada-3d",
      description: "Figura personalizada fabricada mediante impresión 3D.",
      price: 150,
      featured: true,
      categoryId: await idOf("impresion-3d"),
    },
    {
      name: "Llavero VIP",
      slug: "llavero-vip",
      description: "Llavero de catálogo VIP para regalos y proyectos.",
      price: 30,
      featured: false,
      categoryId: await idOf("llaveros"),
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }
}

/**
 * Crea el administrador inicial, o actualiza el hash del existente.
 *
 * La contrasena se lee de `ADMIN_PASSWORD`, jamas de este fichero: el
 * repositorio es publico, asi que una contrasena escrita aqui seria una
 * credencial de ADMIN publicada para cualquiera que clone.
 *
 * El minimo duro es el mismo que impone `LoginSchema` (8 caracteres): por
 * debajo, la cuenta se crearia sin poder entrar. La politica de 12 caracteres
 * con mayuscula, minuscula y digito se comprueba y se avisa, pero no bloquea:
 * es una recomendacion para produccion, y aqui manda el login.
 *
 * @param prisma - Cliente de Prisma.
 * @returns `true` si se dejo un administrador listo para entrar.
 */
async function seedAdmin(prisma: PrismaClient): Promise<boolean> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (email === undefined || email.length === 0 || password === undefined) {
    console.warn(
      "Sin ADMIN_EMAIL/ADMIN_PASSWORD: no se ha creado ningun administrador. " +
        "Define ambas en .env y vuelve a lanzar el seed.",
    );
    return false;
  }

  if (!meetsPasswordPolicy(password)) {
    // El login exige 8 caracteres (`LoginSchema`), asi que por debajo de 8 la
    // cuenta quedaria creada pero imposible de usar. Por encima de 8, el seed
    // solo avisa: la politica de 12 caracteres con mayuscula, minuscula y
    // digito es una recomendacion para produccion, no un requisito del login.
    if (password.length < 8) {
      throw new Error(
        `ADMIN_PASSWORD tiene ${password.length} caracteres y el login exige ` +
          "8 como minimo: la cuenta quedaria creada pero no se podria entrar. " +
          "Pon 8 o mas, o sube el minimo de LoginSchema junto con este script.",
      );
    }

    console.warn(
      `AVISO: ADMIN_PASSWORD tiene ${password.length} caracteres y no cumple la ` +
        "politica de 12 con mayuscula, minuscula y digito. Funciona, pero para " +
        "produccion usa una mas larga. No la publiques ni la reutilices.",
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "ADMIN" },
    create: { email, passwordHash, role: "ADMIN" },
  });

  console.log(`Administrador listo: ${email}`);
  return true;
}

async function main(): Promise<void> {
  const prisma = createClient();

  await seedCatalog(prisma);
  console.log("Catalogo de ejemplo cargado.");

  await seedAdmin(prisma);
  console.log("Seed completado.");
}

main()
  .catch((error: unknown) => {
    console.error(
      "El seed ha fallado:",
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  })
  .finally(() => {
    // `main` deja el cliente abierto; sin esto el proceso no termina.
    process.exit();
  });
