"use client";

import { useState } from "react";

import {
  archivoDe,
  readApiError,
  type ImagePickerProps,
} from "./ImagePicker.types";
import { inputClasses, previewClasses, quitarClasses } from "./ImagePicker.styles";

/** Campo de la subida, como lo espera el endpoint. */
const UPLOAD_FIELD = "file";

/**
 * Selector de imagen con subida inmediata al elegir el fichero.
 *
 * Es una copia del bloque que tiene `AdminProductsView` para los productos, y
 * **a proposito no lo sustituye**: ese fichero tiene un arreglo sin commitear y
 * meterle este componente dentro haria el diff irrevisible. Queda como deuda
 * anotada, no como olvido.
 *
 * El cliente comprueba el tamano antes de subir para no gastar el ancho de
 * banda, pero **eso no es seguridad**: el limite que manda es el del servidor,
 * en `validateImage`, que ademas mira los magic bytes y no el `Content-Type`.
 */
export function ImagePicker({
  value,
  onChange,
  target,
  label,
  previewAlt,
  id,
  maxBytes,
  disabled = false,
}: ImagePickerProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function subir(file: File | undefined): Promise<void> {
    if (file === undefined) return;
    if (file.size > maxBytes) {
      setError(`La imagen supera el limite de ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append(UPLOAD_FIELD, file);
      body.append("target", target);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const data = (await response.json()) as { url?: unknown; error?: unknown };
      if (!response.ok) {
        throw new Error(readApiError(data, "No se pudo subir la imagen."));
      }
      onChange(typeof data.url === "string" ? data.url : "");
    } catch (subirError) {
      setError(
        subirError instanceof Error
          ? subirError.message
          : "No se pudo subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  }

  function quitar(): void {
    onChange("");
    setError("");
  }

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-primary">
        {label}
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <input
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading || disabled}
          onChange={(event) => {
            void subir(archivoDe(event));
          }}
          className={inputClasses}
        />

        {value !== "" && (
          <div className="flex items-center gap-3">
            {/*
              La ruta la genera el servidor con nombre aleatorio y extension de
              lista blanca, y el esquema restringe el campo a
              `/uploads/<carpeta>/<32 hex>.<ext>`, asi que aqui no puede llegar
              un valor arbitrario.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element -- vive en disco local y no pasa por el optimizador de Next */}
            <img
              src={value}
              alt={previewAlt}
              width={72}
              height={72}
              className={previewClasses}
            />
            <button
              type="button"
              onClick={quitar}
              disabled={uploading}
              className={quitarClasses}
            >
              Quitar
            </button>
          </div>
        )}
      </div>

      {uploading && <p className="mt-3 text-sm text-foreground-muted">Subiendo imagen...</p>}
      {error !== "" && (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}