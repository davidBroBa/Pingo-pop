import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { getDatabaseConfig } from "@/lib/env";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Cliente de Prisma compartido por toda la aplicacion.
 *
 * En desarrollo se guarda en `globalThis` para no abrir un pool de conexiones
 * nuevo en cada recarga en caliente de Next.js. En produccion no hace falta: el
 * proceso vive mas que una recarga y el singleton es el propio modulo.
 */
const adapter = new PrismaMariaDb(getDatabaseConfig());

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
