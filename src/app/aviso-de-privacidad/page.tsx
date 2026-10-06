import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Aviso de privacidad.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 *
 * Es el documento con más marcadores: casi todos los `{{...}}` apuntan aquí.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Pingo POP",
  description:
    "Qué datos personales recoge Pingo POP al pedir una cotización, para qué se usan, cuánto tiempo se conservan y cómo se ejercen los derechos de acceso, rectificación y supresión.",
};

export default function AvisoPrivacidadPage() {
  return <LegalPage slug="aviso-de-privacidad" />;
}
