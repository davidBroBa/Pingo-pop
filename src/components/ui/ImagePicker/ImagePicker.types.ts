import type { ChangeEvent } from "react";

/** Destinos que acepta el endpoint de subida. */
export type ImageTarget = "products" | "site";

export interface ImagePickerProps {
  /** Valor actual: la ruta guardada, o `""` si no hay ninguna. */
  value: string;
  /** Se llama con la ruta nueva, o con `""` cuando se quita la foto. */
  onChange: (value: string) => void;
  /** Carpeta de destino en el endpoint de subida. */
  target: ImageTarget;
  /** Texto visible de la etiqueta. */
  label: string;
  /** Texto alternativo de la vista previa. */
  previewAlt: string;
  /** `id` del input, necesario para que la etiqueta lo enganche. */
  id: string;
  /** Tope que se comprueba en el cliente antes de subir. */
  maxBytes: number;
  disabled?: boolean;
}

/**
 * Extrae un mensaje de error de la respuesta de la API.
 *
 * Se exporta porque el panel de apariencia lo reutiliza al guardar: los dos
 * endpoints (`/api/admin/upload` y `PATCH /api/admin/site`) devuelven la misma
 * forma de error.
 */
export function readApiError(
  payload: unknown,
  fallback: string,
): string {
  if (typeof payload !== "object" || payload === null) return fallback;
  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

/** Forma de la respuesta del endpoint de subida. */
export interface UploadResponse {
  url?: unknown;
  error?: unknown;
  fields?: Record<string, string>;
}

/** Normaliza el valor del input de ficheros a `File | undefined`. */
export function archivoDe(
  event: ChangeEvent<HTMLInputElement>,
): File | undefined {
  return event.target.files?.[0];
}