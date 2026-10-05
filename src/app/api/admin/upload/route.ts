import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { MAX_IMAGE_BYTES, storeImage, validateImage } from "@/lib/upload";

/** La subida no debe quedar cacheada ni interpretar el archivo de otra forma. */
export const runtime = "nodejs";

/**
 * Recibe una imagen de producto, la valida y la guarda.
 *
 * Solo accesible para administradores: comprueba el rol en el servidor antes de
 * tocar el sistema de archivos. La validacion del contenido (magic bytes) ocurre
 * en `@/lib/upload`; aqui solo se orquesta.
 *
 * @param request - Peticion `multipart/form-data` con el campo `file`.
 * @returns La ruta publica de la imagen guardada, o el motivo del rechazo.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const { denial } = await requireAdmin();
  if (denial !== null) {
    return denial;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Peticion invalida" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo en el campo 'file'." },
      { status: 400 },
    );
  }

  const validated = await validateImage(file);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.reason }, { status: 415 });
  }

  const url = await storeImage(validated.bytes, validated.ext);

  return NextResponse.json(
    { url, mime: validated.mime, bytes: validated.bytes.byteLength },
    { status: 201 },
  );
}

/** Limite publicado, para que el cliente ajustarse antes de enviar. */
export const MAX_UPLOAD_BYTES = MAX_IMAGE_BYTES;