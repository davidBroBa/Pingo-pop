import { readFile } from "node:fs/promises";
import path from "node:path";

import { UPLOAD_TARGETS } from "@/lib/upload";
import { interpretaRutaUpload } from "@/lib/upload-servida";

/** Necesita leer el sistema de ficheros: no puede correr en Edge. */
export const runtime = "nodejs";

/**
 * Sirve uploads leyendo disco en cada peticion (spec 011, RF-1).
 *
 * Proposito: en produccion Next 16 solo sirve de `public/` lo que resolvio al
 * arrancar, por lo que un fichero recien subido daba 404 hasta recrear el
 * contenedor. Este manejador captura `/uploads/[...path]` y lee el fichero
 * en el momento de la peticion, de modo que una foto subida ahora se ve ya.
 *
 * Seguridad (RF-2 y RF-3): la interpretacion vive en el modulo puro
 * `@/lib/upload-servida`, con la misma lista blanca que la subida. Aqui se
 * anade un segundo cinturon — la ruta resuelta tiene que quedar dentro del
 * directorio del destino — para que ni un bug futuro en la resolucion permita
 * leer fuera de `public/uploads`.
 *
 * @param _request - La peticion; solo se usa la URL, que Next ya descompone.
 * @param context - `params.path`: los segmentos de `[...path]` ya decodificados.
 * @returns El fichero con su `Content-Type`, 400 si el path no es servible o
 *   se escapa del directorio, 404 si no existe.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path: segmentos } = await context.params;
  const ruta = interpretaRutaUpload(segmentos);
  if (ruta === null) {
    return new Response("Ruta de upload no valida", { status: 400 });
  }

  const destino = UPLOAD_TARGETS[ruta.carpeta];
  const raiz = path.resolve(destino.dir);
  const fichero = path.resolve(raiz, ruta.nombre);
  if (fichero !== raiz && !fichero.startsWith(raiz + path.sep)) {
    return new Response("Ruta fuera del directorio de uploads", { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(fichero);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return new Response("No encontrado", { status: 404 });
    }
    console.error("Error al leer upload:", error);
    return new Response("Error interno", { status: 500 });
  }

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": ruta.mime,
      // Las fotos cambian poco: cache publico corto con revalidacion
      // (spec 011, RF-4).
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}