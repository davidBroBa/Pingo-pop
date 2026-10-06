"use client";

import { useState } from "react";

import { ImagePicker, readApiError } from "@/components/ui";

/** Limite publicado por el endpoint, para avisar antes de gastar el ancho de banda. */
const MAX_BYTES = 5 * 1024 * 1024;

/** Forma de la respuesta de `PATCH /api/admin/site`. */
interface SiteResponse {
  heroImage?: unknown;
  error?: unknown;
  fields?: Record<string, string>;
}

/**
 * Formulario de la foto del hero.
 *
 * La subida ocurre en el `ImagePicker`, contra `POST /api/admin/upload` con
 * `target: "site"`. Lo que hace este componente es **guardar** la ruta que ese
 * endpoint devuelve: son dos pasos porque el fichero se sube antes de decidir si
 * la categoria a la que pertenece el ajuste existe o no.
 */
export function AparienciaView({ heroImage }: { heroImage: string | null }) {
  const [imagen, setImagen] = useState(heroImage ?? "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function guardar(): Promise<void> {
    setGuardando(true);
    setMensaje("");
    setError("");
    try {
      const response = await fetch("/api/admin/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroImage: imagen }),
      });
      const data = (await response.json()) as SiteResponse;
      if (!response.ok) {
        throw new Error(readApiError(data, "No se pudo guardar el cambio."));
      }
      setMensaje("Cambios guardados.");
    } catch (guardarError) {
      setError(
        guardarError instanceof Error
          ? guardarError.message
          : "No se pudo guardar el cambio.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form
      className="cartoon-border cartoon-shadow space-y-6 rounded-3xl bg-card p-6 sm:p-8"
      onSubmit={(event) => {
        event.preventDefault();
        void guardar();
      }}
    >
      <ImagePicker
        id="hero-image"
        value={imagen}
        onChange={setImagen}
        target="site"
        label="Foto del hero"
        previewAlt="Vista previa de la foto del hero"
        maxBytes={MAX_BYTES}
        disabled={guardando}
      />

      <p className="text-sm text-foreground-muted">
        Esta imagen aparece en la parte alta de la portada. Si la quitas, se
        vuelve a ver el texto <strong>Pingo</strong> de reserva.
      </p>

      {mensaje !== "" && (
        <p className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-mint p-4 text-sm font-medium text-primary">
          {mensaje}
        </p>
      )}
      {error !== "" && (
        <p className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-coral p-4 text-sm font-medium text-primary" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus h-12 w-full rounded-2xl bg-accent px-6 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}