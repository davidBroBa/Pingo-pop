import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MainLayout } from "@/components/layout";

/**
 * El catalogo se lee de la base de datos en cada peticion, no al compilar.
 *
 * Sin esto Next intenta prerenderizar la pagina durante `next build` y el
 * build falla si la base de datos no esta disponible. El contenido depende de
 * ella en tiempo real, asi que prerenderizarlo no solo es imposible: seria
 * además servir datos caducados desde el HTML estatico.
 */
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await prisma.product.findMany({
    where: {
      active: true,
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
            Crea algo que sea tuyo
          </h1>

          <p className="mt-4 text-lg text-foreground-muted">
            Catálogo de pines metálicos, réplicas en impresión 3D, acrílicos y otros productos. Los fotobotones son los únicos personalizables.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus group overflow-hidden rounded-[24px] bg-white"
            >
              <div className="flex h-64 items-center justify-center border-b-2 border-primary bg-cartoon-cream">
                <span className="font-heading text-4xl font-bold text-primary/20 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-110">
                  Pingo
                </span>
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
