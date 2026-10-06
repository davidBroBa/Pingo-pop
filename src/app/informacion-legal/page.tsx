import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Información legal.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 *
 * Es la pagina que mas marcadores tiene **sin** tokens: casi todo su texto son
 * bloques de `{{...}}` seguidos, porque su contenido es, literalmente, la ficha
 * del negocio.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Información legal | Pingo POP",
  description:
    "Datos del negocio: nombre comercial, razón social, RFC, domicilio fiscal y medio de contacto, además de la procedencia de las imágenes y las tipografías del sitio.",
};

export default function InformacionLegalPage() {
  return <LegalPage slug="informacion-legal" />;
}
