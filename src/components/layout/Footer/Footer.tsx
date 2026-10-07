import Link from "next/link";

import { Container } from "../Container";
import { Logo } from "@/components/shared";

import { NAVIGATION } from "@/constants/navigation";
import { LEGAL_LINKS } from "@/lib/legal-links";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { ConsentPanel } from "@/components/consent/ConsentPanel";
import { ConsentLink } from "@/components/consent/ConsentLink";

import type { FooterProps } from "./Footer.types";

/**
 * Pie de pagina con la navegacion y **los enlaces legales**.
 *
 * Los documentos se listan desde LEGAL_LINKS, no desde una lista escrita a
 * mano: si el conjunto crece, el pie lo muestra sin que nadie se acuerde. Y con
 * una lista manual el primer documento nuevo quedaria publicado pero
 * inalcanzable, que es el fallo que ya se cometio con /admin/categorias.
 *
 * Importa legal-links.ts y **no** legal-versions.ts a proposito: el segundo
 * usa 
ode:crypto para la huella, y /cotizacion es una pagina de cliente, de
 * modo que importarlo arrastraba crypto-browserify al navegador (800 KB medidos)
 * por un simple enlace del pie.
 */
export function Footer({ className, ...props }: FooterProps) {
  const footerClass = "border-t-2 border-primary bg-cartoon-cream py-12 " + (className ?? "");

  return (
    <ConsentProvider>
      <footer className={footerClass} {...props}>
        <Container className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <Logo width={140} height={48} />

            <p className="max-w-xs text-sm text-foreground-muted">
              Pines de catalogo, replicas 3D, acrilicos y fotobotones.
            </p>
          </div>

          <nav aria-label="Navegacion principal" className="flex flex-wrap gap-6">
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
            Informacion legal
          </h2>

          <nav
            aria-label="Enlaces legales del pie"
            className="mt-4 flex flex-wrap gap-x-6 gap-y-2"
          >
            <ConsentLink />

            <span aria-hidden="true" className="text-primary/30">
              ·
            </span>

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

        <ConsentPanel />
      </footer>
    </ConsentProvider>
  );
}
