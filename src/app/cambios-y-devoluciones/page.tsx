import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Cambios, cancelaciones y devoluciones.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 *
 * ## Lo que este documento NO dice (RF-11)
 *
 * **No promete un plazo de respuesta.** No hay un SLA legal; el texto dice que se
 * responde por escrito en un plazo maximo de 20 dias habiles, pero no se compromete
 * a un SLA juridicamente exigible.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cambios, cancelaciones y devoluciones | Pingo POP",
  description:
    "Proceso para solicitar cambios o cancelaciones, plazos de respuesta y condiciones. No es un compromiso de SLA juridico.",
};

export default function CambiosPage() {
  return <LegalPage slug="cambios-y-devoluciones" />;
}