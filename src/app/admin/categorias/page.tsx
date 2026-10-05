import { redirect } from "next/navigation";

import AdminCategoriesForm from "@/app/admin/categorias/AdminCategoriesForm";
import { getSession } from "@/lib/auth/session";

/**
 * Panel de alta de categorias.
 *
 * Server Component que comprueba la sesion antes de renderizar. La comprobacion
 * se repite aqui aunque el middleware ya proteja `/admin/*` por dos razones:
 *
 *  1. El middleware es una capa conveniente, no la unica barrera.
 *  2. Al leer cookies, esta pagina se renderiza en cada peticion. Si fuera
 *     estatica, una cache delante del servidor podria servir el HTML sin pasar
 *     por el middleware y la redireccion no se cumpliria nunca.
 */
export default async function AdminCategoriesPage() {
  const session = await getSession();
  if (session === null || session.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-cartoon-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Administración
          </p>

          <h1 className="font-heading text-4xl font-bold text-primary">
            Agregar categoría
          </h1>

          <p className="mt-3 text-foreground-muted">
            Crea categorías para organizar los productos de Pingo.
          </p>
        </div>

        <AdminCategoriesForm />
      </div>
    </main>
  );
}
