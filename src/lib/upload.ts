import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AllowedType } from "@/lib/upload-validation";

export { MAX_IMAGE_BYTES, validateImage } from "@/lib/upload-validation";
export type { ValidatedImage } from "@/lib/upload-validation";

/**
 * Escritura de imagenes ya validadas en las carpetas publicas del proyecto.
 *
 * Las reglas de aceptacion viven en `@/lib/upload-validation`; aqui solo se
 * decide **donde** y con que nombre se guarda lo que ya ha pasado ese filtro.
 */

/**
 * Destinos de subida, como registro congelado.
 *
 * Se eligio un parametro `target` en vez de un endpoint por destino porque la
 * frontera de seguridad (quien puede subir, que se acepta, como se nombra el
 * fichero) queda **en un solo sitio**. Un endpoint nuevo por carpeta obligaria
 * a duplicar esa frontera, y es justo la clase de duplicacion que un dia se
 * desincroniza.
 *
 * El objeto esta congelado: aunque alguien le anada una clave en caliente, el
 * modulo ya exportado no lo ve. Las claves son exactamente las carpetas que hay
 * bajo `public/uploads/`, y cada una tiene su regex en `src/lib/validation.ts`
 * (`imagePath` para productos, `siteImagePath` para el sitio).
 */
export const UPLOAD_TARGETS = Object.freeze({
  products: {
    dir: path.join(process.cwd(), "public", "uploads", "products"),
    prefix: "/uploads/products",
  },
  site: {
    dir: path.join(process.cwd(), "public", "uploads", "site"),
    prefix: "/uploads/site",
  },
} as const);

/** Destinos admitidos, derivados de las claves del registro. */
export type UploadTarget = keyof typeof UPLOAD_TARGETS;

/**
 * Comprueba si un valor es un destino de subida admitido.
 *
 * Se exporta aparte para que el endpoint pueda **responder 400** con un
 * mensaje claro, en vez de fiarse de que el valor cae en el `default`.
 */
export function esUploadTarget(valor: unknown): valor is UploadTarget {
  return (
    typeof valor === "string" &&
    Object.prototype.hasOwnProperty.call(UPLOAD_TARGETS, valor)
  );
}

/** Prefijo publico del destino de productos, el que usa el catalogo. */
export const UPLOAD_URL_PREFIX = UPLOAD_TARGETS.products.prefix;

/**
 * Guarda una imagen validada con un nombre aleatorio.
 *
 * El nombre original se descarta por completo. Eso anula el path traversal
 * (`../../evil.js` no puede llegar a construir una ruta) y garantiza que la
 * extension servida sea una de la lista blanca, de modo que el navegador nunca
 * interprete lo subido como documento activo.
 *
 * @param bytes - Contenido de la imagen.
 * @param ext - Extension sin punto, procedente de la lista blanca.
 * @param target - Carpeta de destino. `products` por defecto, para que los
 *   formularios de producto no cambien ni una linea.
 * @returns La ruta relativa servible desde el navegador.
 */
export async function storeImage(
  bytes: Uint8Array,
  ext: AllowedType["ext"],
  target: UploadTarget = "products",
): Promise<string> {
  const destino = UPLOAD_TARGETS[target];
  await mkdir(destino.dir, { recursive: true });
  const filename = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(destino.dir, filename), bytes, { flag: "wx" });
  return `${destino.prefix}/${filename}`;
}