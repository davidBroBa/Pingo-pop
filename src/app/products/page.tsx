import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MainLayout } from "@/components/layout";
import { tipoFiltroCategoria } from "@/lib/catalog-filter";

/**
 * El catalogo se lee de la base de datos en cada peticion, no al compilar.
 *
 * Sin esto Next intenta prerenderizar la pagina durante `next build` y el
 * build falla si la base de datos no esta disponible. El contenido depende de
 * ella en tiempo real, asi que prerenderizarlo no solo es imposible: seria
 * además servir datos caducados desde el HTML estatico.
 */
export const dynamic = "force-dynamic";

/**
 * El catalogo, opcionalmente filtrado por categoria.
 *
 * El parametro `categoria` (slug) llega desde las tarjetas de la portada
 * (`/products?categoria=<slug>`) y desde aqui mismo. La interpretacion del
 * valor crudo la hace un modulo puro y testeable (`tipoFiltroCategoria`); un
 * slug de formato invalido o inexistente responde 404, como hace el detalle de
 * producto con su slug.
 *
 * @param props - `searchParams` es un `Promise` en Next 16, se lee con `await`.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const filtro = tipoFiltroCategoria((await searchParams).categoria);
  if (filtro.tipo === "invalido") {
    notFound();
  }

  const categoria =
    filtro.tipo === "slug"
      ? await prisma.category.findUnique({
          where: { slug: filtro.slug },
          select: { id: true, name: true },
        })
      : null;
  if (filtro.tipo === "slug" && categoria === null) {
    notFound();
  }

  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(categoria !== null ? { categoryId: categoria.id } : {}),
    },
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <MainLayout>
    <main className="min-h-screen bg-cartoon-cream px-6 py-20">
      <Link
        href="/"
        className="cartoon-focus mb-8 inline-flex rounded-[8px] text-sm font-medium text-foreground-muted transition-colors hover:text-primary"
      >
        ← Volver al inicio
      </Link>
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Catálogo
          </p>

          <h1 className="text-5xl font-bold text-primary">
            {categoria !== null ? categoria.name : "Catálogo"}
          </h1>

          <p className="mt-4 text-lg text-foreground-muted">
            {categoria !== null ? (
              <>
                Productos de{" "}
                <span className="font-semibold text-primary">{categoria.name}</span>
                .{" "}
                <Link
                  href="/products"
                  className="cartoon-focus text-primary underline-offset-4 transition-colors hover:underline"
                >
                  Ver todo el catálogo
                </Link>
              </>
            ) : (
              <>
                Pines metálicos, llaveros, réplicas en impresión 3D, acrílicos y
                fotobotones. Pedidos al mayoreo para negocios.
              </>
            )}
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus group overflow-hidden rounded-[24px] bg-white"
            >
              <div className="relative flex h-64 items-center justify-center overflow-hidden border-b-2 border-primary bg-cartoon-cream">
                {product.image !== null && product.image !== "" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- subida ya validada con magic bytes y ruta servida por la propia app
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <span className="font-heading text-4xl font-bold text-primary/20 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-110">
                    Pingo
                  </span>
                )}
              </div>

              <div className="space-y-3 p-6">
                <p className="text-sm text-foreground-muted">
                  {product.category.name}
                </p>

                <h2 className="text-2xl font-bold text-primary">
                  {product.name}
                </h2>

                <p className="text-sm leading-6 text-foreground-muted">
                  {product.description}
                </p>

                <div className="pt-2">
                  <span className="font-semibold text-primary">
                    ${product.price.toString()} MXN
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
    </MainLayout>
  );
}