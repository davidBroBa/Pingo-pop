import { prisma } from "@/lib/prisma";

/**
 * Lectura y escritura de la fila unica de `SiteSettings`.
 *
 * El id esta **fijado a 1** y no se busca "la primera fila": si se buscara por
 * orden, dos escrituras simultaneas podrian dejar dos filas y la lectura
 * siguiente devolveria la que le pareciera. Con id fijo no hay ambiguedad, y
 * `upsert` crea la fila la primera vez sin necesidad de un paso de siembra que se
 * pueda olvidar.
 */

/** Id de la fila unica. Coincide con el `@default(1)` del esquema. */
export const SINGLETON_ID = 1;

/**
 * Lee la foto del hero.
 *
 * **Tolerante a fallos a proposito**: si la base de datos esta caida o la tabla
 * no existe todavia, la portada tiene que seguir sirviendo con el `Pingo` de
 * reserva. Un ajuste del sitio no puede dejar la web entera sin pintar, asi que
 * aqui no se propaga la excepcion: se registra sin datos del objeto y se
 * devuelve `null`.
 *
 * @returns La ruta guardada, o `null` si no hay ninguna o si no se pudo leer.
 */
export async function readHeroImage(): Promise<string | null> {
  try {
    const fila = await prisma.siteSettings.findUnique({
      where: { id: SINGLETON_ID },
      select: { heroImage: true },
    });
    if (fila === null || fila.heroImage === null) return null;
    return fila.heroImage.trim() === "" ? null : fila.heroImage;
  } catch (error) {
    // Solo el nombre del error: el objeto puede llevar la cadena de conexion.
    console.error(
      "No se pudo leer la foto del hero:",
      error instanceof Error ? error.name : "desconocido",
    );
    return null;
  }
}

/**
 * Guarda la foto del hero, o la quita si se pasa `null`.
 *
 * La ruta **no se valida aqui**: llega validada por `siteImagePath` en el
 * endpoint. Este modulo es la capa de persistencia y no duplica las reglas.
 *
 * @param path - Ruta bajo `/uploads/site/`, o `null` para dejarla vacia.
 */
export async function writeHeroImage(path: string | null): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, heroImage: path },
    update: { heroImage: path },
  });
}