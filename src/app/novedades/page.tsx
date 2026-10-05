import Link from "next/link";
import { MainLayout } from "@/components/layout";

export default function NovedadesPage() {
  return (
    <MainLayout>
    <main className="min-h-screen bg-cartoon-cream px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="cartoon-focus mb-10 inline-flex rounded-[8px] text-sm font-medium text-foreground-muted transition-colors hover:text-primary"
        >
          ← Volver al inicio
        </Link>

        <div className="max-w-2xl">
          <span className="cartoon-border cartoon-shadow-sm inline-block rotate-[1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Novedades
          </span>

          <h1 className="mt-4 text-5xl font-bold text-primary">
            Nuevas ideas están por llegar
          </h1>

          <p className="mt-6 text-lg leading-8 text-foreground-muted">
            Estamos preparando nuevos productos, diseños y formas de
            personalizar tus ideas.
          </p>
        </div>

        <div className="cartoon-border-thick cartoon-shadow-lg mt-12 rotate-1 rounded-3xl bg-white p-8 sm:p-10">
          <span className="cartoon-border cartoon-shadow-sm inline-flex -rotate-2 rounded-full bg-cartoon-lavender px-4 py-2 text-sm font-semibold text-primary">
            Próximamente
          </span>

          <h2 className="mt-6 text-3xl font-bold text-primary">
            Estamos creando algo especial
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-foreground-muted">
            Mientras llegan nuestras novedades, puedes conocer los productos
            disponibles y comenzar tu próximo proyecto personalizado.
          </p>

          <Link
            href="/products"
            className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-primary"
          >
            Ver productos
          </Link>
        </div>
      </div>
    </main>
    </MainLayout>
  );
}
