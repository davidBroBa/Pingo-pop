import { redirect } from "next/navigation";

import AdminNavLinks from "@/app/admin/AdminNavLinks";
import AdminCategoriesView from "@/app/admin/categorias/AdminCategoriesView";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

/**
 * Panel de categorias: alta y listado con edicion.
 *
 * Server Component que comprueba la sesion antes de renderizar. La comprobacion
 * se repite aqui aunque el middleware ya proteja `/admin/*` por dos razones:
 *
 *  1. El middleware es una capa conveniente, no la unica barrera.
 *  2. Al leer cookies, esta pagina se renderiza en cada peticion. Si fuera
 *     estatica, una cache delante del servidor podria servir el HTML sin pasar
 *     por el middleware y la redireccion no se cumpliria nunca.
 *
 * Antes esto era **solo alta**: `/api/categories` no tenia ruta de actualizacion,
 * asi que una categoria creada no se podia volver a tocar. Ahora se listan y se
 * editan nombre, descripcion e imagen. El `slug` no se edita (D13) y **no hay
 * borrado**: las categorias tienen productos asociados.
 */
export default async function AdminCategoriesPage() {
  const session = await getSession();
  if (session === null || session.role !== "ADMIN") {
    redirect("/login");
  }

  const categorias = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, image: true },
  });

  return (
    <main className="min-h-screen bg-cartoon-cream px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <AdminNavLinks />

        <div className="mb-10">
          <p className="cartoon-border cartoon-shadow-sm mb-4 inline-block rotate-[-1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            Administración
          </p>

          <h1 className="font-heading text-4xl font-bold text-primary">
            Categorías
          </h1>

          <p className="mt-3 text-foreground-muted">
            Crea categorías para organizar los productos de Pingo, y edita las que
            ya existen.
          </p>
        </div>

        <AdminCategoriesView categorias={categorias} />
      </div>
    </main>
  );
}
