import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Politica de envios.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 *
 * ## Lo que este documento dice (RF-37)
 *
 * **El envio es solo en Mexico.** No hay envio internacional. Los plazos son
 * referencias de mensajeria, no promesas, y el precio final se acuerda por escrito
 * antes de cobrar nada.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de envíos | Pingo POP",
  description:
    "Cobertura de envio (solo Mexico), plazos referenciales, costos y proceso de entrega. No hay envio internacional.",
};

export default function EnviosPage() {
  return <LegalPage slug="politica-de-envios" />;
}