import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteForm } from "@/components/sections/QuoteForm";
import { prisma } from "@/lib/prisma";

import { MainLayout } from "@/components/layout";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

/**
 * La ficha se lee de la base de datos en cada peticion, no al compilar.
 *
 * El precio y la disponibilidad cambian sin aviso, asi que prerenderizar la
 * pagina serviria informacion obsoleta. Ademas, sin esto `next build` necesita
 * una base de datos viva para generar el HTML estatico.
 */
export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: {
      slug,
    },
    include: {
      category: true,
    },
  });

  if (product === null || !product.active) {
    notFound();
  }

  const price = product.price.toString();

  return (
    <MainLayout>
    <main className="min-h-screen bg-cartoon-cream px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/products"
          className="cartoon-focus mb-10 inline-flex items-center rounded-[8px] text-sm font-medium text-foreground-muted transition-colors hover:text-primary"
        >
          ← Volver a productos
        </Link>

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="cartoon-border-thick cartoon-shadow-lg flex min-h-[500px] rotate-1 items-center justify-center rounded-3xl bg-white">
            <span className="font-heading text-6xl font-bold text-primary/15">
              Pingo
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <span className="cartoon-border cartoon-shadow-sm mb-4 inline-block w-fit -rotate-[-1deg] rounded-full bg-cartoon-sky px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              {product.category.name}
            </span>

            <h1 className="text-5xl font-bold text-primary">{product.name}</h1>

            <p className="mt-6 text-lg leading-8 text-foreground-muted">
              {product.description}
            </p>

            <p className="cartoon-border cartoon-shadow-sm mt-8 w-fit rounded-2xl bg-accent px-4 py-2 text-3xl font-bold text-primary">
              Desde ${price} MXN
            </p>

            <QuoteForm
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
              productPrice={price}
              productImage={product.image}
            />
          </div>
        </div>
      </div>
    </main>
    </MainLayout>
  );
}