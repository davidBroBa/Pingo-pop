import Link from "next/link";

import { Logo } from "@/components/shared";

/**
 * Pagina 404 de la tienda.
 *
 * Se renderiza dentro del layout raiz para cualquier ruta no existe. Es una
 * pagina estatica de marca: no lee sesion, no consulta la BD y no revela
 * rutas internas. Mantiene el lenguaje cartoon del resto del sitio.
 */
export const metadata = {
  title: "Página no encontrada | Pingo POP",
};

export default function NotFound(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cartoon-cream px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo width={180} height={62} />
        </div>

        <span className="cartoon-border cartoon-shadow-sm inline-block -rotate-2 rounded-full bg-accent px-4 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
          404 · Se fue de paseo
        </span>

        <h1 className="mt-6 text-5xl font-bold text-primary">¡Ups!</h1>
        <p className="mt-4 text-lg text-foreground-muted">
          La página que buscas no está aquí. Puede haberse movido o nunca haber
          existido — los pines escapan a veces.
        </p>

        <div className="mt-10">
          <Link
            href="/"
            className="cartoon-border cartoon-shadow cartoon-hover cartoon-focus inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-8 font-semibold text-primary"
          >
            Volver a la tienda
          </Link>
        </div>
      </div>
    </main>
  );
}