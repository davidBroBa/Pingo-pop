"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  featured: boolean;
  active: boolean;
  category: Category;
};

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  categoryId: "",
  featured: false,
  active: true,
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      if (!productsResponse.ok || !categoriesResponse.ok) {
        throw new Error("No se pudieron cargar los datos.");
      }

      const productsData = await productsResponse.json();
      const categoriesData = await categoriesResponse.json();

      setProducts(productsData);
      setCategories(categoriesData);
    } catch {
      setError("No se pudieron cargar los productos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: editingId ? current.slug : generateSlug(value),
    }));
  }

  function editProduct(product: Product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      price: product.price.toString(),
      categoryId: product.category.id.toString(),
      featured: product.featured,
      active: product.active,
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId,
          ...form,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo guardar el producto.");
      }

      setMessage(
        editingId
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );

      setEditingId(null);
      setForm(emptyForm);

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el producto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: number) {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este producto?",
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar el producto.");
      }

      setMessage("Producto eliminado correctamente.");

      if (editingId === id) {
        cancelEdit();
      }

      await loadData();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el producto.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-white px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
            Administración
          </p>

          <h1 className="font-heading text-4xl font-bold text-[#2A2227]">
            {editingId ? "Editar producto" : "Productos"}
          </h1>

          <p className="mt-3 text-[#707070]">
            Administra los productos del catálogo de Pingo.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mb-12 space-y-6 rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-6 sm:p-8"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2A2227]">
              Nombre
            </label>

            <input
              required
              value={form.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Ej. Pin personalizado"
              className="w-full rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none focus:border-[#F7B92C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2A2227]">
              Slug
            </label>

            <input
              required
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  slug: event.target.value,
                }))
              }
              placeholder="pin-personalizado"
              className="w-full rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none focus:border-[#F7B92C]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2A2227]">
              Descripción
            </label>

            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Describe el producto..."
              className="w-full resize-none rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none focus:border-[#F7B92C]"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#2A2227]">
                Precio
              </label>

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="35"
                className="w-full rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none focus:border-[#F7B92C]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#2A2227]">
                Categoría
              </label>

              <select
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#ECECEC] bg-white px-4 py-3 outline-none focus:border-[#F7B92C]"
              >
                <option value="">Selecciona una categoría</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    featured: event.target.checked,
                  }))
                }
                className="h-4 w-4"
              />

              <span className="text-sm font-medium text-[#2A2227]">
                Producto destacado
              </span>
            </label>

            {editingId && (
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />

                <span className="text-sm font-medium text-[#2A2227]">
                  Producto activo
                </span>
              </label>
            )}
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="h-12 flex-1 rounded-2xl bg-[#F7B92C] px-6 font-semibold text-[#2A2227] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Guardando..."
                : editingId
                  ? "Guardar cambios"
                  : "Agregar producto"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="h-12 rounded-2xl border border-[#ECECEC] bg-white px-6 font-semibold text-[#2A2227]"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-[#2A2227]">
              Catálogo
            </h2>

            <span className="text-sm text-[#707070]">
              {products.length} productos
            </span>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-8 text-center text-[#707070]">
              Cargando productos...
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-8 text-center text-[#707070]">
              No hay productos.
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col gap-5 rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-xl font-bold text-[#2A2227]">
                        {product.name}
                      </h3>

                      {product.featured && (
                        <span className="rounded-full bg-[#F7B92C] px-3 py-1 text-xs font-semibold text-[#2A2227]">
                          Destacado
                        </span>
                      )}

                      {!product.active && (
                        <span className="rounded-full bg-[#ECECEC] px-3 py-1 text-xs font-semibold text-[#707070]">
                          Inactivo
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-[#707070]">
                      {product.category.name}
                    </p>

                    <p className="mt-1 font-semibold text-[#2A2227]">
                      ${product.price.toString()} MXN
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => editProduct(product)}
                      className="h-10 rounded-xl border border-[#ECECEC] bg-white px-5 text-sm font-semibold text-[#2A2227] transition hover:bg-[#FAFAFA]"
                    >
                      Editar
                    </button>

                    {product.active && (
                      <button
                        type="button"
                        onClick={() => deleteProduct(product.id)}
                        className="h-10 rounded-xl border border-red-100 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
