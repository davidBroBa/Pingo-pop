import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteForm } from "@/components/sections/QuoteForm";
import { prisma } from "@/lib/prisma";

import { MainLayout } from "@/components/layout";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

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
    <main className="min-h-screen bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/products"
          className="mb-10 inline-flex items-center text-sm font-medium text-[#707070] transition-colors hover:text-[#2A2227]"
        >
          ← Volver a productos
        </Link>

        <div className="grid gap-12 lg:grid-cols-2">
          <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-[#ECECEC] bg-[#FAFAFA]">
            <span className="font-heading text-6xl font-bold text-[#2A2227]/15">
              Pingo
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
              {product.category.name}
            </p>

            <h1 className="font-heading text-5xl font-bold text-[#2A2227]">
              {product.name}
            </h1>

            <p className="mt-6 text-lg leading-8 text-[#707070]">
              {product.description}
            </p>

            <p className="mt-8 text-3xl font-bold text-[#2A2227]">
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