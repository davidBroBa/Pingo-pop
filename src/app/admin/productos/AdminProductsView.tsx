"use client";

import { FormEvent, useCallback, useState } from "react";
import { useRouter } from "next/navigation";

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
  image: string | null;
  featured: boolean;
  active: boolean;
  category: Category;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  price: string;
  categoryId: string;
  image: string;
  featured: boolean;
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  slug: "",
  description: "",
  price: "",
  categoryId: "",
  image: "",
  featured: false,
  active: true,
};

/** Campo del `FormData` que espera el endpoint de subida. */
const UPLOAD_FIELD = "file";

/**
 * Extrae un mensaje de error de la respuesta de la API.
 *
 * Los endpoints devuelven `{ error }` con un texto apto para mostrar. Si la
 * respuesta no tiene ese campo se cae al texto por defecto que recibe la
 * funcion, para no dejar al usuario sin explicacion.
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

/**
 * Panel de administracion del catalogo.
 *
 * Es un Client Component puro: no carga datos, los recibe ya resueltos desde el
 * Server Component padre. Solo gestiona la interaccion del formulario.
 *
 * Toda escritura pasa por las rutas de API, que vuelven a comprobar el rol ADMIN
 * en el servidor: este componente no decide nada sobre permisos.
 */
export default function AdminProductsView({
  initialProducts,
  initialCategories,
}: {
  initialProducts: Product[];
  initialCategories: Category[];
}) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories] = useState<Category[]>(initialCategories);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /** Refresca el catalogo tras una escritura. */
  const refresh = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        throw new Error("No se pudieron cargar los productos.");
      }
      setProducts((await response.json()) as Product[]);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "No se pudieron cargar los productos.",
      );
    }
  }, []);

  /** Deriva un slug legible a partir del nombre. */
  function generateSlug(value: string): string {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/\u0300-\u036f/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function handleNameChange(value: string): void {
    setForm((current) => ({
      ...current,
      name: value,
      // Al editar no se pisa el slug que el usuario haya retocado a mano.
      slug: editingId !== null ? current.slug : generateSlug(value),
    }));
  }

  function editProduct(product: Product): void {
    setEditingId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      price: product.price.toString(),
      categoryId: product.category.id.toString(),
      image: product.image ?? "",
      featured: product.featured,
      active: product.active,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit(): void {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  /**
   * Sube la imagen seleccionada y guarda en el formulario la ruta devuelta.
   *
   * La validacion real (tipo declarado, magic bytes y tamano) ocurre en el
   * servidor; aqui solo se avisa pronto del tamano para no gastar ancho de
   * banda con una subida que va a fallar.
   */
  async function handleImageChange(file: File | undefined): Promise<void> {
    if (file === undefined) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen supera el limite de 5 MB.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append(UPLOAD_FIELD, file);
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body,
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readApiError(data, "No se pudo subir la imagen."),
        );
      }
      const url =
        typeof data === "object" && data !== null && "url" in data
          ? String((data as { url: unknown }).url)
          : "";
      setForm((current) => ({ ...current, image: url }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la imagen.",
      );
    } finally {
      setUploading(false);
    }
  }

  function clearImage(): void {
    setForm((current) => ({ ...current, image: "" }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/products", {
        method: editingId !== null ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          // `undefined` deja al servidor aplicar su valor por defecto en el
          // alta; en la edicion el id es obligatorio.
          id: editingId ?? undefined,
        }),
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        throw new Error(
          readApiError(data, "No se pudo guardar el producto."),
        );
      }

      setMessage(
        editingId !== null
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );
      setEditingId(null);
      setForm(emptyForm);
      await refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el producto.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: number): Promise<void> {
    const confirmed = window.confirm(
      "¿Seguro que quieres eliminar este producto?",
    );
    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readApiError(data, "No se pudo eliminar el producto."),
        );
      }
      setMessage("Producto eliminado correctamente.");
      if (editingId === id) {
        cancelEdit();
      }
      await refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No se pudo eliminar el producto.",
      );
    }
  }

  /** Cierra la sesion y vuelve al inicio. */
  async function handleLogout(): Promise<void> {
    await fetch("/api/auth/logout", { method: "POST" });
    // `replace` para no dejar el panel en el historial: el boton "atras"
    // intentaria volver a una pagina para la que ya no hay sesion.
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-cartoon-cream px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-start justify-between gap-6">
          <div>
            <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Administración
            </p>
            <h1 className="font-heading text-4xl font-bold text-primary">
              {editingId !== null ? "Editar producto" : "Productos"}
            </h1>
            <p className="mt-3 text-foreground-muted">
              Administra los productos del catálogo de Pingo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            className="cartoon-border cartoon-shadow-sm cartoon-hover cartoon-focus h-10 shrink-0 rounded-xl bg-white px-5 text-sm font-semibold"
          >
            Cerrar sesión
          </button>
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
          className="cartoon-border cartoon-shadow mb-12 space-y-6 rounded-3xl bg-card p-6 sm:p-8"
        >
          <div>
            <label
              htmlFor="product-name"
              className="mb-2 block text-sm font-semibold text-primary"
            >
              Nombre
            </label>
            <input
              id="product-name"
              required
              value={form.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Ej. Pin personalizado"
              className="cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="product-slug"
              className="mb-2 block text-sm font-semibold text-primary"
            >
              Slug
            </label>
            <input
              id="product-slug"
              required
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  slug: event.target.value,
                }))
              }
              placeholder="pin-personalizado"
              className="cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="product-image"
              className="mb-2 block text-sm font-semibold text-primary"
            >
              Imagen
            </label>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <input
                id="product-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={(event) => {
                  void handleImageChange(event.target.files?.[0]);
                }}
                className="text-sm text-foreground-muted file:mr-4 file:rounded-xl file:border-2 file:border-primary file:bg-accent file:px-5 file:py-2.5 file:text-sm file:font-semibold disabled:opacity-60"
              />

              {form.image !== "" && (
                <div className="flex items-center gap-3">
                  {/*
                    La ruta la genera el servidor con nombre aleatorio y
                    extension de lista blanca, y la validacion del esquema
                    restringe el campo a `/uploads/products/<32 hex>.<ext>`,
                    asi que aqui no puede llegar un valor arbitrario.
                  */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- vive en
                      disco local y no pasa por el optimizador de Next */}
                  <img
                    src={form.image}
                    alt="Vista previa del producto"
                    width={72}
                    height={72}
                    className="cartoon-border cartoon-shadow-sm h-[72px] w-[72px] rounded-2xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="cartoon-focus rounded-[8px] text-sm font-semibold underline"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-foreground-muted">
              JPEG, PNG o WebP de hasta 5 MB. El archivo se renombra de forma
              aleatoria y solo se admiten esos tres formatos.
            </p>

            {uploading && (
              <p className="mt-2 text-sm text-foreground-muted">Subiendo imagen...</p>
            )}
          </div>

          <div>
            <label
              htmlFor="product-description"
              className="mb-2 block text-sm font-semibold text-primary"
            >
              Descripción
            </label>
            <textarea
              id="product-description"
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
              className="cartoon-border cartoon-focus w-full resize-none rounded-2xl bg-white px-4 py-3 outline-none"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="product-price"
                className="mb-2 block text-sm font-semibold text-primary"
              >
                Precio
              </label>
              <input
                id="product-price"
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
                className="cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="product-category"
                className="mb-2 block text-sm font-semibold text-primary"
              >
                Categoría
              </label>
              <select
                id="product-category"
                required
                value={form.categoryId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    categoryId: event.target.value,
                  }))
                }
                className="cartoon-border cartoon-focus w-full rounded-2xl bg-white px-4 py-3 outline-none"
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
              <span className="text-sm font-medium text-primary">
                Producto destacado
              </span>
            </label>

            {editingId !== null && (
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
                <span className="text-sm font-medium text-primary">
                  Producto activo
                </span>
              </label>
            )}
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

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving || uploading}
              className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus h-12 flex-1 rounded-2xl bg-accent px-6 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Guardando..."
                : editingId !== null
                  ? "Guardar cambios"
                  : "Agregar producto"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEdit}
                className="cartoon-border cartoon-shadow-sm cartoon-hover cartoon-focus h-12 rounded-2xl bg-white px-6 font-semibold"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-heading text-2xl font-bold text-primary">
              Catálogo
            </h2>
            <span className="text-sm text-foreground-muted">
              {products.length} productos
            </span>
          </div>

          {products.length === 0 ? (
            <div className="cartoon-border cartoon-shadow rounded-3xl bg-card p-8 text-center text-foreground-muted">
              No hay productos.
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="cartoon-border cartoon-shadow flex flex-col gap-5 rounded-3xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div className="flex items-center gap-4">
                    {product.image !== null && product.image !== "" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- rutas servidas por la propia app
                      <img
                        src={product.image}
                        alt={product.name}
                        width={64}
                        height={64}
                        className="cartoon-border cartoon-shadow-sm h-16 w-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="h-16 w-16 shrink-0 rounded-2xl border-2 border-dashed border-primary bg-white"
                      />
                    )}

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-xl font-bold text-primary">
                          {product.name}
                        </h3>
                        {product.featured && (
                          <span className="cartoon-border cartoon-shadow-sm rounded-full bg-accent px-3 py-1 text-xs font-semibold">
                            Destacado
                          </span>
                        )}
                        {!product.active && (
                          <span className="cartoon-border cartoon-shadow-sm rounded-full bg-cartoon-lavender px-3 py-1 text-xs font-semibold">
                            Inactivo
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-foreground-muted">
                        {product.category.name}
                      </p>
                      <p className="mt-1 font-semibold text-primary">
                        ${product.price.toString()} MXN
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => editProduct(product)}
                      className="cartoon-border cartoon-shadow-sm cartoon-hover cartoon-focus h-10 rounded-xl bg-white px-5 text-sm font-semibold"
                    >
                      Editar
                    </button>

                    {product.active && (
                      <button
                        type="button"
                        onClick={() => {
                          void deleteProduct(product.id);
                        }}
                        className="cartoon-border cartoon-shadow-sm cartoon-hover h-10 rounded-xl bg-white px-5 text-sm font-semibold text-foreground-muted hover:bg-cartoon-coral hover:text-primary"
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