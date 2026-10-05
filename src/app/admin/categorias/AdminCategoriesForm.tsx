"use client";

import { FormEvent, useState } from "react";

/**
 * Formulario de alta de categorias.
 *
 * Solo manage la interaccion: el POST va a `/api/categories`, que comprueba el
 * rol ADMIN en el servidor. Ocultar el boton aqui no seria una medida de
 * seguridad, y por eso no se intenta.
 */

/**
 * Deriva un slug legible a partir del nombre.
 *
 * @param value - Nombre en claro.
 * @returns Slug en minusculas, sin acentos y separado por guiones.
 */
function generateSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Extrae el mensaje de error de la respuesta de la API.
 *
 * @param payload - Cuerpo ya parseado de la respuesta.
 * @param fallback - Texto a usar si la respuesta no trae `error`.
 * @returns El mensaje apto para mostrar.
 */
function readApiError(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as { error: unknown }).error;
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return fallback;
}

export default function AdminCategoriesForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleNameChange(value: string): void {
    setName(value);
    setSlug(generateSlug(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          readApiError(data, "No se pudo crear la categoría."),
        );
      }

      setMessage("Categoría creada correctamente.");
      setName("");
      setSlug("");
      setDescription("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear la categoría.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="cartoon-border cartoon-shadow space-y-6 rounded-3xl bg-card p-6 sm:p-8"
    >
      <div>
        <label
          htmlFor="category-name"
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Nombre
        </label>

        <input
          id="category-name"
          required
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          placeholder="Ej. Pines metálicos"
          className="cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="category-slug"
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Slug
        </label>

        <input
          id="category-slug"
          required
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="pines-metalicos"
          className="cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="category-description"
          className="mb-2 block text-sm font-semibold text-primary"
        >
          Descripción
        </label>

        <textarea
          id="category-description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Descripción de la categoría..."
          className="cartoon-border cartoon-focus w-full resize-none rounded-2xl bg-white px-4 py-3 outline-none"
        />
      </div>

      {message !== "" && (
        <p
          role="status"
          className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-mint p-4 text-sm font-medium"
        >
          {message}
        </p>
      )}

      {error !== "" && (
        <p
          role="alert"
          className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-coral p-4 text-sm font-medium"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus h-12 w-full rounded-2xl bg-accent px-6 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Agregar categoría"}
      </button>
    </form>
  );
}
