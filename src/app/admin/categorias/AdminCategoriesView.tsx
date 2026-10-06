"use client";

import { useState } from "react";

import { ImagePicker } from "@/components/ui";

/** Lo minimo que la vista necesita de cada categoria. */
type Categoria = {
  id: number;
  name: string;
  description: string | null;
  image: string | null;
};

/** Limite publicado por el endpoint de subida. */
const MAX_BYTES = 5 * 1024 * 1024;

interface ApiResponse {
  error?: unknown;
  fields?: Record<string, string>;
}

/** Estado de edicion de una fila. `null` significa "no se esta editando". */
type Borrador = { nombre: string; descripcion: string; imagen: string } | null;

export default function AdminCategoriesView({
  categorias,
}: {
  categorias: Categoria[];
}) {
  const [lista, setLista] = useState<Categoria[]>(categorias);
  const [editando, setEditando] = useState<number | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(null);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  // Alta
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [descripcionNueva, setDescripcionNueva] = useState("");
  const [imagenNueva, setImagenNueva] = useState("");

  function abrir(categoria: Categoria): void {
    setEditando(categoria.id);
    setBorrador({
      nombre: categoria.name,
      descripcion: categoria.description ?? "",
      imagen: categoria.image ?? "",
    });
    setMensaje("");
    setError("");
  }

  function cerrar(): void {
    setEditando(null);
    setBorrador(null);
  }

  async function pedir(url: string, metodo: string, cuerpo: unknown) {
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const response = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) {
        const detalle =
          typeof data.error === "string" ? data.error : "No se pudo guardar.";
        throw new Error(detalle);
      }
      return data;
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar.");
      return null;
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion(id: number): Promise<void> {
    if (borrador === null) return;
    const resultado = await pedir(`/api/categories/${id}`, "PATCH", {
      name: borrador.nombre,
      description: borrador.descripcion,
      image: borrador.imagen,
    });
    if (resultado === null) return;
    setLista((actual) =>
      actual.map((categoria) =>
        categoria.id === id
          ? {
              ...categoria,
              name: borrador.nombre,
              description: borrador.descripcion === "" ? null : borrador.descripcion,
              image: borrador.imagen === "" ? null : borrador.imagen,
            }
          : categoria,
      ),
    );
    setMensaje("Categoría actualizada.");
    cerrar();
  }

  async function crear(): Promise<void> {
    const resultado = await pedir("/api/categories", "POST", {
      name: nombreNuevo,
      description: descripcionNueva,
      image: imagenNueva,
    });
    if (resultado === null) return;
    const creada = resultado as unknown as Categoria;
    setLista((actual) => [...actual, creada]);
    setNombreNuevo("");
    setDescripcionNueva("");
    setImagenNueva("");
    setMensaje("Categoría creada.");
  }

  return (
    <div className="space-y-10">
      {/*
        Listado. Con cero categorias se dice explicitamente, en vez de dejar un
        hueco en blanco sin explicacion (RF-23).
      */}
      <section className="cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="font-heading text-2xl font-bold text-primary">
          Categorías existentes
        </h2>

        {lista.length === 0 ? (
          <p className="mt-4 text-foreground-muted">
            Todavía no hay ninguna categoría. Crea la primera con el formulario de
            abajo y aparecerá aquí.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {lista.map((categoria) => (
              <li
                key={categoria.id}
                className="cartoon-border cartoon-shadow-sm rounded-2xl bg-white p-4"
              >
                {editando === categoria.id && borrador !== null ? (
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-primary">
                      Nombre
                      <input
                        value={borrador.nombre}
                        onChange={(e) =>
                          setBorrador({ ...borrador, nombre: e.target.value })
                        }
                        className="cartoon-border cartoon-focus mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-primary">
                      Descripción
                      <textarea
                        value={borrador.descripcion}
                        onChange={(e) =>
                          setBorrador({ ...borrador, descripcion: e.target.value })
                        }
                        className="cartoon-border cartoon-focus mt-2 w-full resize-none rounded-2xl bg-white px-4 py-3 outline-none"
                        rows={3}
                      />
                    </label>

                    <ImagePicker
                      id={`category-image-${categoria.id}`}
                      value={borrador.imagen}
                      onChange={(valor) =>
                        setBorrador({ ...borrador, imagen: valor })
                      }
                      target="products"
                      label="Imagen"
                      previewAlt={`Vista previa de ${categoria.name}`}
                      maxBytes={MAX_BYTES}
                      disabled={guardando}
                    />

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => void guardarEdicion(categoria.id)}
                        disabled={guardando}
                        className="cartoon-border cartoon-shadow cartoon-focus rounded-2xl bg-accent px-5 py-2.5 font-semibold disabled:opacity-60"
                      >
                        {guardando ? "Guardando..." : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={cerrar}
                        disabled={guardando}
                        className="cartoon-focus rounded-2xl px-5 py-2.5 font-semibold underline"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {categoria.image !== null && categoria.image !== "" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- subida ya validada con magic bytes y ruta servida por la propia app
                      <img
                        src={categoria.image}
                        alt={categoria.name}
                        width={56}
                        height={56}
                        className="cartoon-border cartoon-shadow-sm h-14 w-14 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="cartoon-border flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-dashed bg-cartoon-cream font-heading text-lg font-bold text-primary/20"
                      >
                        Pingo
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-primary">
                        {categoria.name}
                      </p>
                      {categoria.description !== null && (
                        <p className="truncate text-sm text-foreground-muted">
                          {categoria.description}
                        </p>
                      )}
                    </div>

                    {/*
                      Solo editar. No hay boton de borrar y no lo hay a proposito
                      (RF-24): las categorias tienen productos asociados.
                    */}
                    <button
                      type="button"
                      onClick={() => abrir(categoria)}
                      className="cartoon-focus rounded-[8px] text-sm font-semibold underline"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="cartoon-border cartoon-shadow rounded-3xl bg-card p-6 sm:p-8">
        <h2 className="font-heading text-2xl font-bold text-primary">
          Nueva categoría
        </h2>

        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void crear();
          }}
        >
          <label className="block text-sm font-semibold text-primary">
            Nombre
            <input
              value={nombreNuevo}
              onChange={(e) => setNombreNuevo(e.target.value)}
              className="cartoon-border cartoon-focus mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-primary">
            Descripción
            <textarea
              value={descripcionNueva}
              onChange={(e) => setDescripcionNueva(e.target.value)}
              className="cartoon-border cartoon-focus mt-2 w-full resize-none rounded-2xl bg-white px-4 py-3 outline-none"
              rows={3}
            />
          </label>

          <ImagePicker
            id="new-category-image"
            value={imagenNueva}
            onChange={setImagenNueva}
            target="products"
            label="Imagen"
            previewAlt="Vista previa de la nueva categoría"
            maxBytes={MAX_BYTES}
            disabled={guardando}
          />

          <button
            type="submit"
            disabled={guardando || nombreNuevo.trim() === ""}
            className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus h-12 w-full rounded-2xl bg-accent px-6 font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {guardando ? "Guardando..." : "Crear categoría"}
          </button>
        </form>
      </section>

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
    </div>
  );
}