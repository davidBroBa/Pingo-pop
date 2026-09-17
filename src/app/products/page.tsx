import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MainLayout } from "@/components/layout";

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
    <main className="min-h-screen bg-white px-6 py-20">
      <Link
        href="/"
        className="mb-8 inline-flex text-sm font-medium text-[#707070] transition-colors hover:text-[#2A2227]"
      >
        ← Volver al inicio
      </Link>
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
            Productos
          </p>

          <h1 className="font-heading text-5xl font-bold text-[#2A2227]">
            Crea algo que sea tuyo
          </h1>

          <p className="mt-4 text-lg text-[#707070]">
            Productos personalizados creados especialmente para ti.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group overflow-hidden rounded-[24px] border border-[#ECECEC] bg-[#FAFAFA] transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex h-64 items-center justify-center bg-white">
                <span className="font-heading text-4xl font-bold text-[#2A2227]/15">
                  Pingo
                </span>
              </div>

              <div className="space-y-3 p-6">
                <p className="text-sm text-[#707070]">
                  {product.category.name}
                </p>

                <h2 className="font-heading text-2xl font-bold text-[#2A2227]">
                  {product.name}
                </h2>

                <p className="text-sm leading-6 text-[#707070]">
                  {product.description}
                </p>

                <div className="pt-2">
                  <span className="font-semibold text-[#2A2227]">
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
