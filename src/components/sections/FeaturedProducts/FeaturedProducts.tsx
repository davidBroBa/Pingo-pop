import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Card, Typography } from "@/components/ui";
import { prisma } from "@/lib/prisma";

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
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-14 px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl space-y-4">
            <span className="text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
              Productos
            </span>

            <Typography variant="h2" className="text-[#2A2227]">
              Lo que podemos crear para ti
            </Typography>

            <Typography variant="body-lg" className="text-[#707070]">
              Descubre algunos de nuestros productos y personalízalos con tu
              propia idea.
            </Typography>
          </div>

          <Link
            href="/products"
            className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-[16px] border border-border bg-white px-6 font-medium text-foreground transition-all duration-200 hover:bg-card md:self-auto"
          >
            Ver todos
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group overflow-hidden p-0 transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex h-72 items-center justify-center bg-[#FAFAFA]">
                <span className="font-heading text-4xl font-bold text-[#2A2227]/20 transition-transform duration-200 group-hover:scale-105">
                  Pingo
                </span>
              </div>

              <div className="space-y-4 p-6">
                <div className="space-y-1">
                  <span className="text-sm text-[#707070]">
                    {product.category.name}
                  </span>

                  <Typography variant="h3" className="text-[#2A2227]">
                    {product.name}
                  </Typography>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#2A2227]">
                    Desde ${product.price.toString()} MXN
                  </span>

                  <Link
                    href={`/products/${product.slug}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F7B92C] text-[#2A2227] transition-transform duration-200 hover:scale-105"
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
