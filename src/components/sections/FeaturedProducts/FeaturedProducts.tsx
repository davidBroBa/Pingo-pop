import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Card, Typography } from "@/components/ui";
import { prisma } from "@/lib/prisma";

/**
 * Productos destacados, leidos de la base de datos.
 *
 * Esta seccion no exporta configuracion de segmento a proposito: Next solo lee
 * `dynamic` y `revalidate` desde el `page.tsx` o el `layout.tsx` del segmento.
 * Quien la usa (`src/app/page.tsx`) es el que declara `force-dynamic`.
 */
export async function FeaturedProducts() {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      featured: true,
    },
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 3,
  });

  return (
    <section className="bg-[#FCFCFC] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-14 px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-4">
            <span className="cartoon-border cartoon-shadow-sm inline-block rotate-[1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Catálogo
            </span>

            <Typography variant="h2" className="font-heading text-primary">
              Productos destacados
            </Typography>

            <Typography variant="body-lg" className="max-w-xl text-foreground-muted">
              Pines, llaveros y réplicas 3D de catálogo, con precio por volumen
              para pedidos al mayoreo.
            </Typography>
          </div>

          <Link
            href="/products"
            className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus inline-flex h-12 items-center justify-center gap-2 self-start rounded-[16px] bg-white px-6 font-medium text-foreground md:self-auto"
          >
            Ver todos
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group overflow-hidden p-0 transition-transform duration-200 hover:rotate-1"
            >
              <div className="flex h-72 items-center justify-center border-b-2 border-primary bg-cartoon-cream">
                <span className="font-heading text-4xl font-bold text-primary/20 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3">
                  Pingo
                </span>
              </div>

              <div className="space-y-4 p-6">
                <div className="space-y-1">
                  <span className="text-sm text-foreground-muted">
                    {product.category.name}
                  </span>

                  <Typography variant="h3" className="font-heading text-primary">
                    {product.name}
                  </Typography>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-primary">
                    Desde ${product.price.toString()} MXN
                  </span>

                  <Link
                    href={`/products/${product.slug}`}
                    className="cartoon-border cartoon-shadow-sm cartoon-focus flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary transition-transform duration-200 hover:-rotate-45"
                    aria-label={`Ver ${product.name}`}
                  >
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
