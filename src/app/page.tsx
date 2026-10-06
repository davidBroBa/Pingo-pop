import { MainLayout } from "@/components/layout";
import {
  CTA,
  Categories,
  FeaturedProducts,
  Hero,
  HowItWorks,
} from "@/components/sections";
import { prisma } from "@/lib/prisma";
import { readHeroImage } from "@/lib/site-settings";

/**
 * La portada muestra productos destacados y los ajustes del sitio, asi que se
 * renderiza en cada peticion.
 *
 * La configuracion va aqui y no dentro de `FeaturedProducts`: Next solo lee
 * `dynamic`, `revalidate` y compania desde el `page.tsx` o el `layout.tsx` del
 * segmento. Ponerlo en un componente anidado no tiene efecto y el build sigue
 * intentando prerenderizar la portada.
 */
export const dynamic = "force-dynamic";

/**
 * Las categorias que salen en la portada.
 *
 * Se leen aqui y no dentro del componente porque `MainLayout` no puede ser
 * `async` con `cookies()` (eso romperia el prerenderizado de `/contacto` y
 * `/novedades`), asi que el dato tiene que llegar por props. El recorte a 4 y
 * la derivacion del numero y del color los hace el componente, con
 * `construirTarjetas()`.
 */
async function leerCategorias() {
  try {
    return await prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true, image: true },
    });
  } catch {
    // Mismo criterio que el hero: la portada no se cae por un problema de datos.
    // Con la lista vacia, `Categories` cae a su red de seguridad.
    return [];
  }
}

export default async function Home() {
  const [heroImage, categorias] = await Promise.all([
    readHeroImage(),
    leerCategorias(),
  ]);

  return (
    <MainLayout>
      <Hero image={heroImage} />
      <Categories categorias={categorias} />
      <FeaturedProducts />
      <HowItWorks />
      <CTA />
    </MainLayout>
  );
}