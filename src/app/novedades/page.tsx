import Link from "next/link";
import { MainLayout } from "@/components/layout";

export default function NovedadesPage() {
  return (
    <MainLayout>
    <main className="min-h-screen bg-white px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-10 inline-flex text-sm font-medium text-[#707070] transition-colors hover:text-[#2A2227]"
        >
          ← Volver al inicio
        </Link>

        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#707070]">
            Novedades
          </p>

          <h1 className="font-heading text-5xl font-bold text-[#2A2227]">
            Nuevas ideas están por llegar
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#707070]">
            Estamos preparando nuevos productos, diseños y formas de
            personalizar tus ideas.
          </p>
        </div>

        <div className="mt-12 rounded-3xl border border-[#ECECEC] bg-[#FAFAFA] p-8 sm:p-10">
          <span className="inline-flex rounded-full bg-[#F7B92C] px-4 py-2 text-sm font-semibold text-[#2A2227]">
            Próximamente
          </span>

          <h2 className="mt-6 font-heading text-3xl font-bold text-[#2A2227]">
            Estamos creando algo especial
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-[#707070]">
            Mientras llegan nuestras novedades, puedes conocer los productos
            disponibles y comenzar tu próximo proyecto personalizado.
          </p>

          <Link
            href="/products"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-[#F7B92C] px-6 font-semibold text-[#2A2227] transition duration-200 hover:scale-[1.01]"
          >
            Ver productos
          </Link>
        </div>
      </div>
    </main>
    </MainLayout>
  );
}
