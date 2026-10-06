import Link from "next/link";
import { notFound } from "next/navigation";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { LegalVersion } from "@/components/legal/LegalVersion";
import { MainLayout } from "@/components/layout";
import { leerLegal } from "@/lib/legal-data";
import { LEGAL_LINKS } from "@/lib/legal-links";
import { readLegalData } from "@/lib/legal-settings";
import { documentoDe } from "@/lib/legal-versions";

/**
 * La pagina legal, entera, para los siete documentos.
 *
 * ## Por que las siete `page.tsx` son de cinco lineas y esto es el cuerpo
 *
 * Las siete son **el mismo documento con otro `slug`**: mismo título, misma
 * version, misma navegacion entre documentos, mismo "volver". Escribir siete
 * copias de eso es como se cuelan las diferencias: una dice "Aviso de privacidad"
 * y las otras seis "Términos", o una se queda sin la linea de version. La
 * diferencia real entre las siete cabe en el `slug`, y lo demas se escribe una vez.
 *
 * Las `page.tsx` siguen siendo **siete ficheros**, no una ruta dinamica `[slug]`:
 * una `[slug]` en la raiz se tragaria cualquier ruta inventada y responderia 200
 * con un documento legal en vez de un 404. Y cada una declara su `metadata`, que es
 * lo que lee el buscador.
 *
 * ## De donde sale el texto
 *
 * De `readLegalData()`, que es **tolerante a fallos**: si la base de datos esta
 * caida devuelve `{}`, `leerLegal()` pone el marcador en los seis campos, y la
 * pagina sale con los documentos y las marcas de "falta este dato". No con un 500.
 * Un documento legal a medio publicar es un problema; que el sitio entero caiga
 * porque un ajuste no se pudo leer, tambien, y este camino no es el segundo.
 */
export async function LegalPage({ slug }: { slug: string }) {
  const documento = documentoDe(slug);

  // Un slug que no existe es un 404 de verdad, no una pagina vacia. Esto no deberia
  // ocurrir nunca porque las siete rutas son fijas, pero si alguien escribe un
  // enlace mal, que salga un 404 y no un 200 con el marco del sitio y sin nada.
  // Devolver `null` aqui seria un 200 con la pagina en blanco: es peor que el 404,
  // porque el buscador lo indexa.
  if (documento === null) {
    notFound();
  }

  const datos = leerLegal(await readLegalData());
  const otros = LEGAL_LINKS.filter((otro) => otro.slug !== slug);

  return (
    <MainLayout>
      <main className="min-h-screen bg-cartoon-cream px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="cartoon-focus mb-10 inline-flex rounded-[8px] text-sm font-medium text-foreground-muted transition-colors hover:text-primary"
          >
            ← Volver al inicio
          </Link>

          <header>
            <span className="cartoon-border cartoon-shadow-sm inline-block -rotate-[1deg] rounded-full bg-white px-3 py-1 text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Legal
            </span>

            {/* Un solo h1 por pagina: el titulo del documento. Los h2 de cada
                seccion los pone `LegalDocument`, y asi el orden de encabezados
                no se rompe. */}
            <h1 className="mt-4 font-heading text-4xl font-bold text-primary">
              {documento.titulo}
            </h1>

            <div className="mt-4">
              <LegalVersion documento={documento} />
            </div>
          </header>

          <div className="mt-12">
            <LegalDocument documento={documento} datos={datos} />
          </div>

          {/* Los otros seis. Vienen de `LEGAL_LINKS` y no de una lista escrita
              aqui, asi que un documento nuevo se enlaza solo. */}
          <nav
            aria-label="Documentos legales"
            className="mt-16 border-t-2 border-primary/20 pt-8"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Otros documentos legales
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {otros.map((otro) => (
                <li key={otro.slug}>
                  <Link
                    href={`/${otro.slug}`}
                    className="cartoon-focus rounded-[8px] text-sm text-foreground-muted underline underline-offset-4 transition-colors hover:text-primary"
                  >
                    {otro.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </main>
    </MainLayout>
  );
}
