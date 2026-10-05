// Crea un usuario BUYER para probar que el rol no puede escribir.
// Usa el hasheador del propio proyecto, no una copia: asi el test verifica el
// mismo codigo que usa el login.
//
// Patron `main()` y no await en el nivel superior: el proyecto no declara
// "type": "module", asi que tsx compila esto como CommonJS y el await de nivel
// superior no es valido. Es el mismo motivo por el que prisma/seed.ts esta
// escrito asi.
import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hashPassword } from "../src/lib/auth/password";
import { PrismaClient } from "../src/generated/prisma/client";

const BUYER_EMAIL = "comprador@pingo-pop.local";
const BUYER_PASSWORD = "Comprador-de-prueba-1";

/**
 * Conecta con la base de datos a partir de `DATABASE_URL`.
 *
 * @returns Cliente de Prisma ya conectado.
 */
function createClient(): PrismaClient {
  const url = new URL(process.env.DATABASE_URL ?? "");
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: url.port === "" ? 3306 : Number(url.port),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
      connectionLimit: 2,
    }),
  });
}

async function main(): Promise<void> {
  const prisma = createClient();

  await prisma.user.upsert({
    where: { email: BUYER_EMAIL },
    update: {},
    create: {
      email: BUYER_EMAIL,
      passwordHash: await hashPassword(BUYER_PASSWORD),
      role: "BUYER",
    },
  });

  const found = await prisma.user.findUniqueOrThrow({
    where: { email: BUYER_EMAIL },
    select: { id: true, email: true, role: true, passwordHash: true },
  });

  console.log(`comprador id=${found.id} email=${found.email} rol=${found.role}`);
  console.log(`hash argon2id: ${found.passwordHash.startsWith("$argon2id$")}`);
  console.log("password del test: Comprador-de-prueba-1");

  await prisma.$disconnect();
}

main()
  .catch((error: unknown) => {
    console.error("No se pudo crear el comprador:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });