import { redirect } from "next/navigation";

import AdminProductsView from "@/app/admin/productos/AdminProductsView";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

/**
 * Carga inicial del panel de administracion.
 *
 * El middleware ya bloquea `/admin/*` para quien no sea ADMIN, pero esta
 * comprobacion se repite aqui a proposito: el middleware es una capa
 * conveniente, no la unica barrera, y la ruta no debe depender de que siga
 * configurado.
 *
 * Los datos se leen en el servidor y se pasan al Client Component, que no tiene
 * por que hacer un `fetch` de carga inicial.
 */
export default async function AdminProductsPage() {
  const session = await getSession();
  if (session === null || session.role !== "ADMIN") {
    redirect("/login");
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminProductsView
      initialProducts={products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price.toString(),
        image: product.image,
        featured: product.featured,
        active: product.active,
        category: product.category,
      }))}
      initialCategories={categories}
    />
  );
}