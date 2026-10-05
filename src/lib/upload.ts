import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AllowedType } from "@/lib/upload-validation";

export { MAX_IMAGE_BYTES, validateImage } from "@/lib/upload-validation";
export type { ValidatedImage } from "@/lib/upload-validation";

/**
 * Escritura de imagenes ya validadas en la carpeta publica del proyecto.
 *
 * Las reglas de aceptacion viven en `@/lib/upload-validation`; aqui solo se
 * decide donde y con que nombre se guarda lo que ya ha pasado ese filtro.
 */

/** Carpeta publica donde se guardan las imagenes. */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

/** Prefijo publico con el que se sirve lo guardado en `UPLOAD_DIR`. */
export const UPLOAD_URL_PREFIX = "/uploads/products";

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
 * @returns La ruta relativa servible desde el navegador.
 */
export async function storeImage(
  bytes: Uint8Array,
  ext: AllowedType["ext"],
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomBytes(16).toString("hex")}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), bytes, { flag: "wx" });
  return `${UPLOAD_URL_PREFIX}/${filename}`;
}