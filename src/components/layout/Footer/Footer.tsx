import Link from "next/link";

import { Container } from "../Container";
import { Logo } from "@/components/shared";

import { NAVIGATION } from "@/constants/navigation";
import { LEGAL_LINKS } from "@/lib/legal-links";

import type { FooterProps } from "./Footer.types";

/**
 * Pie de pagina con la navegacion y **los enlaces legales**.
 *
 * Los documentos se listan desde `LEGAL_LINKS`, no desde una lista escrita a
 * mano: si el conjunto crece, el pie lo muestra sin que nadie se acuerde. Y con
 * una lista manual el primer documento nuevo quedaria publicado pero
 * inalcanzable, que es el fallo que ya se cometio con `/admin/categorias`.
 *
 * Importa `legal-links.ts` y **no** `legal-versions.ts` a proposito: el segundo
 * usa `node:crypto` para la huella, y `/cotizacion` es una pagina de cliente, de
 * modo que importarlo arrastraba `crypto-browserify` al navegador (800 KB medidos)
 * por un simple enlace del pie.
 *
 * Van en una fila aparte, no mezclados con la navegacion principal: son siete
 * enlaces y metidos entre "Productos" y "Novedades" dejarian de leerse las dos
 * cosas. Aun asi son **enlaces de texto de cuerpo normal, no un texto gris
 * pequeno**: si un documento legal tiene que esconderse para que se vea el
 * catalogo, el documento legal no esta publicado.
 */
export function Footer({ className, ...props }: FooterProps) {
  return (
    <footer
      className={`border-t-2 border-primary bg-cartoon-cream py-12 ${
        className ?? ""
      }`}
      {...props}
    >
      <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div className="space-y-4">
          <Logo width={140} height={48} />

          <p className="max-w-xs text-sm text-foreground-muted">
            Pines de catálogo, réplicas 3D, acrílicos y fotobotones.
          </p>
        </div>

        <nav aria-label="Navegación principal" className="flex flex-wrap gap-6">
          {NAVIGATION.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="cartoon-focus rounded-[8px] text-sm font-medium text-primary transition-colors hover:text-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Container>

      <Container className="mt-10 border-t-2 border-primary/20 pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">
          Información legal
        </h2>

        {/*
          El enlace a "Preferencias de cookies" se anade en F6, cuando exista el
          panel que abre. Anadirlo antes seria un enlace que no hace nada, que es
          peor que no tenerlo.
        */}
        {/*
          La etiqueta es "Enlaces legales del pie" y **no** "Documentos legales"
          a proposito: cada pagina legal lleva su propia navegacion con
          `aria-label="Documentos legales"` (lo pide RF-5), y si las dos se
          llamaran igual habria **dos landmarks con la misma etiqueta** en la misma
          pantalla. Navegar por landmarks es como se mueve un lector de pantalla, y
          dos entradas con el mismo nombre solo hacen que una parezca duplicada.
        */}
        <nav
          aria-label="Enlaces legales del pie"
          className="mt-4 flex flex-wrap gap-x-6 gap-y-2"
        >
          {LEGAL_LINKS.map((documento) => (
            <Link
              key={documento.slug}
              href={`/${documento.slug}`}
              className="cartoon-focus rounded-[8px] text-sm text-foreground-muted underline underline-offset-4 transition-colors hover:text-primary"
            >
              {documento.titulo}
            </Link>
          ))}
        </nav>
      </Container>
    </footer>
  );
}