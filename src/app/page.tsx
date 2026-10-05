import { MainLayout } from "@/components/layout";
import {
  CTA,
  Categories,
  FeaturedProducts,
  Hero,
  HowItWorks,
} from "@/components/sections";

/**
 * La portada muestra productos destacados, asi que se renderiza en cada
 * peticion.
 *
 * La configuracion va aqui y no dentro de `FeaturedProducts`: Next solo lee
 * `dynamic`, `revalidate` y compañía desde el `page.tsx` o el `layout.tsx` del
 * segmento. Ponerlo en un componente anidado no tiene efecto y el build sigue
 * intentando prerenderizar la portada.
 */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <MainLayout>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <HowItWorks />
      <CTA />
    </MainLayout>
  );
}
