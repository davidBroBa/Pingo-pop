/**
 * Validacion pura de imagenes subidas, sin dependencia del sistema de archivos.
 *
 * Vive separada de `@/lib/upload` para poder probarla sin tocar disco. Aqui solo
 * se decide si un archivo es una imagen aceptable; rellenar el disco es otra
 * capa.
 */

/** Tamano maximo por imagen: 5 MiB. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Tipos admitidos y su firma binaria esperada. */
const ALLOWED_TYPES = [
  { mime: "image/jpeg", ext: "jpg", magic: [0xff, 0xd8, 0xff] },
  { mime: "image/png", ext: "png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/webp", ext: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
] as const;

/** Regla de la lista blanca. */
export type AllowedType = (typeof ALLOWED_TYPES)[number];

/** Resultado de validar un archivo. Discriminado por `ok`. */
export type ValidatedImage =
  | { ok: true; bytes: Uint8Array; ext: AllowedType["ext"]; mime: AllowedType["mime"] }
  | { ok: false; reason: string };

/** Localiza la regla cuyo prefijo de firma coincide con el archivo. */
function matchMagic(bytes: Uint8Array): AllowedType | null {
  for (const candidate of ALLOWED_TYPES) {
    if (candidate.magic.every((byte, index) => bytes[index] === byte)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Valida una imagen subida, sin escribirla en disco.
 *
 * Tres comprobaciones en este orden:
 *  1. El `content-type` declarado esta en la lista blanca. Lo elige quien sube,
 *     asi que por si solo no prueba nada.
 *  2. Los primeros bytes coinciden con ese tipo. Esta es la que manda: un
 *     `.jpg` que en realidad es un HTML con scripts queda descartado aqui.
 *  3. El tamano no supera el maximo, para no agotar el disco ni la memoria.
 *
 * @param file - Archivo tal cual llega en el `FormData`.
 * @returns Los bytes y la extension si la imagen es valida; el motivo del
 *   rechazo en caso contrario.
 */
export async function validateImage(file: File): Promise<ValidatedImage> {
  const declared = ALLOWED_TYPES.find((t) => t.mime === file.type);
  if (declared === undefined) {
    return {
      ok: false,
      reason: `Tipo no permitido: ${file.type}. Se aceptan JPEG, PNG y WebP.`,
    };
  }

  if (file.size === 0) {
    return { ok: false, reason: "El archivo esta vacio." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      reason: `La imagen supera el limite de ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)} MB.`,
    };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const byMagic = matchMagic(bytes);
  if (byMagic === null) {
    return {
      ok: false,
      reason:
        "El contenido del archivo no coincide con una imagen valida. El tipo declarado no es de fiar.",
    };
  }
  if (byMagic.mime !== declared.mime) {
    return {
      ok: false,
      reason: `El archivo declara ${declared.mime} pero su contenido es ${byMagic.mime}.`,
    };
  }
  return { ok: true, bytes, ext: byMagic.ext, mime: byMagic.mime };
}