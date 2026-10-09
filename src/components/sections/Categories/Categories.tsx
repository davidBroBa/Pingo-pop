import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Card, Typography } from "@/components/ui";
import {
  construirTarjetas,
  hrefCategoria,
  type CategoriaMinima,
} from "@/lib/category-card-props";

/**
 * Red de seguridad de la seccion (RF-29).
 *
 * Si la base de datos no devuelve **ninguna** categoria, la portada muestra esto
 * en vez de quedar vacia. Vive aqui, y no en la pagina, porque es contenido de
 * presentacion: quien la pinta es quien decide como se ve.
 *
 * Cuando haya categorias de verdad, esta lista no se usa.
 */
export const CATEGORIAS_RESERVA: readonly CategoriaMinima[] = [
  {
    id: -1,
    name: "Pines catálogo VIP",
    description: "Pines metálicos de catálogo, con acabados profesionales.",
    image: null,
    slug: null,
  },
  {
    id: -2,
    name: "Botones fotográficos",
    description: "Se hacen con tu foto.",
    image: null,
    slug: null,
  },
  {
    id: -3,
    name: "Impresión 3D",
    description:
      "Réplicas ya hechas, y también figuras creadas desde tu archivo.",
    image: null,
    slug: null,
  },
  {
    id: -4,
    name: "Llaveros",
    description:
      "Productos de catálogo para regalos, negocios y proyectos especiales.",
    image: null,
    slug: null,
  },
];

export interface CategoriesProps {
  /** Las categorias que devuelve la base de datos, ya ordenadas. */
  categorias?: readonly CategoriaMinima[];
}

/**
 * Seccion de categorias de la portada.
 *
 * Es **data-driven**: los nombres y las fotos vienen de la base de datos. El
 * recorte a 4 y la derivacion del numero y del color los delega en
 * `construirTarjetas()`, que es un modulo puro y por tanto comprobable con
 * tests sin DOM.
 */
export function Categories({ categorias = [] }: CategoriesProps) {
  const tarjetas = construirTarjetas(categorias, CATEGORIAS_RESERVA);

  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-14 px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-4">
            <span className="cartoon-border cartoon-shadow-sm inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Catálogo
            </span>

            <Typography variant="h2" className="font-heading text-primary">
              Pines, réplicas 3D, acrílicos y más
            </Typography>

            <Typography variant="body-lg" className="max-w-xl text-foreground-muted">
              Productos de catálogo: pines metálicos, réplicas en impresión 3D, acrílicos y otros productos.
            </Typography>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {tarjetas.map((tarjeta) => (
            <Link
              key={tarjeta.id}
              href={hrefCategoria(tarjeta)}
              aria-label={`Ver productos de ${tarjeta.nombre}`}
              className="cartoon-focus block h-full rounded-[24px]"
            >
              <Card className="group relative flex min-h-[280px] h-full flex-col overflow-hidden">
              {/*
                Banda de foto arriba (D12). Cuando no hay foto entra el `Pingo`
                de reserva **en la misma caja**, para que ninguna tarjeta se vea
                descuadrada por tener menos cosas que las demas.
              */}
              <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden bg-cartoon-cream">
                {tarjeta.imagen !== null ? (
                  // eslint-disable-next-line @next/next/no-img-element -- subida ya validada con magic bytes y ruta servida por la propia app
                  <img
                    src={tarjeta.imagen}
                    alt={tarjeta.nombre}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <span className="font-heading text-3xl font-bold text-primary/20">
                    Pingo
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-between gap-6 p-5">
                <div className="flex items-start justify-between">
                  {/*
                    La insignia con el numero se conserva (D12): la banda de
                    foto va por encima, no en su lugar.
                  */}
                  <span
                    className={`cartoon-border cartoon-shadow-sm flex h-9 w-9 rotate-[-3deg] items-center justify-center rounded-full text-sm font-bold text-primary ${tarjeta.acento}`}
                  >
                    {tarjeta.numero}
                  </span>

                  <div className="cartoon-border flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary transition-transform duration-200 group-hover:rotate-45">
                    <ArrowUpRight size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Typography variant="h3" className="font-heading text-primary">
                    {tarjeta.nombre}
                  </Typography>

                  {tarjeta.descripcion !== "" && (
                    <Typography variant="body" className="text-foreground-muted">
                      {tarjeta.descripcion}
                    </Typography>
                  )}
                </div>
              </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}