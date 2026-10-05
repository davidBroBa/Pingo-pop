import Link from "next/link";

import { MainLayout } from "@/components/layout";

export default function ContactoPage() {
  return (
     <MainLayout>
    <main className="min-h-screen bg-cartoon-cream px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="cartoon-focus mb-10 inline-flex rounded-[8px] text-sm font-medium text-foreground-muted transition-colors hover:text-primary"
        >
          ← Volver al inicio
        </Link>

        <div className="max-w-2xl">
          <span className="cartoon-border cartoon-shadow-sm inline-block -rotate-[1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Contacto
          </span>

          <h1 className="mt-4 text-5xl font-bold text-primary">
            Hablemos de tu idea
          </h1>

          <p className="mt-6 text-lg leading-8 text-foreground-muted">
            ¿Tienes un proyecto en mente? Cuéntanos qué quieres crear y
            encontraremos la mejor forma de hacerlo realidad.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="cartoon-border cartoon-shadow rounded-3xl bg-card p-8">
            <h2 className="text-2xl font-bold text-primary">
              Solicita una cotización
            </h2>

            <p className="mt-3 leading-7 text-foreground-muted">
              Elige un producto y envíanos los detalles de tu proyecto.
            </p>

            <Link
              href="/products"
              className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-accent px-6 font-semibold text-primary"
            >
              Ver productos
            </Link>
          </div>

          <div className="cartoon-border cartoon-shadow rounded-3xl bg-cartoon-sky p-8">
            <h2 className="text-2xl font-bold text-primary">
              Estamos para ayudarte
            </h2>

            <p className="mt-3 leading-7 text-primary">
              Si tienes una pregunta sobre materiales, cantidades o
              personalización, escríbenos y te orientaremos.
            </p>
          </div>
        </div>
      </div>
    </main>
    </MainLayout>
  );
}
