import type { Metadata } from "next";

import Link from "next/link";

import { MainLayout } from "@/components/layout";
import { leerLegal, MARCADOR_PENDIENTE, type LegalLeido } from "@/lib/legal-data";
import { LEGAL_LINKS } from "@/lib/legal-links";
import { readLegalData } from "@/lib/legal-settings";

/**
 * Contacto.
 *
 * ## Qué cambió y por qué (RF-13, V13)
 *
 * Antes esta página era una invitación a "escríbenos" **sin decir a dónde**. Eso
 * es un callejón sin salida: quien quiere contactar no tiene medio, y el aviso de
 * privacidad tampoco puede dar uno porque la página no lo tenía.
 *
 * Ahora enseña el correo y el teléfono **reales si están rellenados**, y el
 * marcador si no. No hay un tercer camino: si el dato falta, sale el marcador de
 * `MARCADOR_PENDIENTE`, que es lo mismo que se vera en los documentos legales.
 * Inventar un correo de ejemplo seria peor que no tener ninguno, porque alguien lo
 * escribiría y no llegaría a ninguna parte.
 *
 * ## Por qué pasa a ser dinámica
 *
 * Lee `LegalData`. Con `force-dynamic` en el `page.tsx` y no en un componente, y
 * **no** lleva `"use client"`: es un Server Component que lee en el servidor y
 * pinta el resultado, así que ni la página ni los datos van en el JS del
 * navegador.
 *
 * `/novedades` sigue siendo estática (`○`) y eso es lo que demuestra que
 * `MainLayout` no se ha tocado: es la página hermana que no lee la base de datos.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contacto | Pingo POP",
  description:
    "Datos de contacto de Pingo POP: correo y teléfono para responder una cotización o resolver una duda sobre un pedido.",
};

export default async function ContactoPage() {
  const datos: LegalLeido = leerLegal(await readLegalData());

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

            {/*
              Los datos de contacto, con el marcador si faltan. `leerLegal()` ya
              devuelve siempre un texto, asi que aqui no hay ningun caso en el que
              se pinte "undefined" ni una cadena vacia.
            */}
            <div className="cartoon-border cartoon-shadow rounded-3xl bg-cartoon-sky p-8">
              <h2 className="text-2xl font-bold text-primary">
                Escríbenos directamente
              </h2>

              <dl className="mt-4 space-y-3 leading-7">
                <div>
                  <dt className="text-sm font-semibold text-primary">Correo</dt>
                  <dd className="text-foreground-muted">
                    {datos.correoContacto}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-semibold text-primary">
                    Teléfono
                  </dt>
                  <dd className="text-foreground-muted">{datos.telefono}</dd>
                </div>
              </dl>

              <p className="mt-4 text-sm leading-6 text-foreground-muted">
                Si algún dato aparece como{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                  {MARCADOR_PENDIENTE}
                </code>{" "}
                es que todavía no está cargado. Se rellena desde el panel de
                administración.
              </p>
            </div>
          </div>

          {/* Los enlaces a las políticas, que es lo que pedía RF-13: quien llega
              aquí a corregir un dato encuentra de paso dónde se explica qué se
              hace con él. Salen de `LEGAL_LINKS`, no de una lista escrita a mano. */}
          <nav
            aria-label="Documentos legales de contacto"
            className="mt-16 border-t-2 border-primary/20 pt-8"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">
              Políticas y datos legales
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {LEGAL_LINKS.map((documento) => (
                <li key={documento.slug}>
                  <Link
                    href={`/${documento.slug}`}
                    className="cartoon-focus rounded-[8px] text-sm text-foreground-muted underline underline-offset-4 transition-colors hover:text-primary"
                  >
                    {documento.titulo}
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
