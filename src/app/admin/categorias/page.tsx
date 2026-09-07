"use client";

import { FormEvent, useState } from "react";

export default function AdminCategoriesPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleNameChange(value: string) {
    setName(value);
    setSlug(generateSlug(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          slug,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear la categoría.");
      }

      setMessage("Categoría creada correctamente.");
      setName("");
      setSlug("");
      setDescription("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo crear la categoría.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
            Administración
          </p>

          <h1 className="font-heading text-4xl font-bold text-[#2A2227]">
            Agregar categoría
          </h1>

          <p className="mt-3 text-[#707070]">
            Crea categorías para organizar los productos de Pingo.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-6 sm:p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2A2227]">
              Nombre
            </label>

            <input
              required
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Ej. Pines metálicos"
              className="w-full rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none focus:border-[#F7B92C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2A2227]">
              Slug
            </label>

            <input
              required
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="pines-metalicos"
              className="w-full rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none focus:border-[#F7B92C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2A2227]">
              Descripción
            </label>

            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descripción de la categoría..."
              className="w-full resize-none rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none focus:border-[#F7B92C]"
            />
          </div>

          {message && (
            <p className="rounded-2xl bg-green-50 p-4 text-sm font-medium text-green-700">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-2xl bg-[#F7B92C] px-6 font-semibold text-[#2A2227] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Agregar categoría"}
          </button>
        </form>
      </div>
    </main>
  );
}
