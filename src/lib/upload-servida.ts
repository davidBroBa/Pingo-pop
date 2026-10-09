/**
 * Lectura segura de uploads para `GET /uploads/[...path]` (spec 011).
 *
 * El 404 de ficheros nuevos en produccion ocurre porque Next 16 sirve de
 * `public/` solo lo que resolvio al arrancar. Un route handler que lee disco en
 * cada peticion devuelve cualquier imagen recien subida sin recrear el
 * contenedor.
 *
 * Este modulo es puro: decide **si** y **como** se puede servir un path, sin
 * tocar el sistema de ficheros. La resolucion a disco y la lectura las hace la
 * ruta, confinadas a `public/uploads`.
 */

/** Carpetas que el manejador sabe servir. */
export type CarpetaUpload = "products" | "site";

/** Lo que se devuelve cuando el path es servible. */
export type RutaUpload = {
  carpeta: CarpetaUpload;
  nombre: string;
  mime: string;
};

/** Nombre de fichero: 32 hex (lo que genera `randomBytes(16).hex`) + extension. */
const NOMBRE_REGEX = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

/** MIME por extension, limitado a la lista blanca de la subida. */
const MIME_POR_EXTENSION: Record<"jpg" | "png" | "webp", string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** MIME de una extension, o `null` si no esta en la lista blanca. */
function mimeDeExtension(ext: string | undefined): string | null {
  if (ext === "jpg" || ext === "png" || ext === "webp") {
    return MIME_POR_EXTENSION[ext];
  }
  return null;
}

/**
 * Interpreta los segmentos de `[...path]` de `/uploads/[...path]`.
 *
 * La unica forma aceptada es `<carpeta>/<32hex>.<ext>` con `carpeta` en
 * `products` o `site`. Cualquier otra forma devuelve `null`, y la ruta responde
 * 400 (malformada) o 404 (no existe), sin llegar nunca a disco: la extension
 * no permitida no se expone, tal y como pide la spec.
 *
 * @param segmentos - Los segmentos decodificados que da Next en `params.path`.
 */
export function interpretaRutaUpload(
  segmentos: readonly string[],
): RutaUpload | null {
  if (segmentos.length !== 2) return null;

  const [carpeta, nombre] = segmentos;
  if (carpeta !== "products" && carpeta !== "site") return null;
  if (!NOMBRE_REGEX.test(nombre)) return null;

  const ext = nombre.split(".").pop();
  const mime = mimeDeExtension(ext);
  if (mime === null) return null;
  return { carpeta, nombre, mime };
}