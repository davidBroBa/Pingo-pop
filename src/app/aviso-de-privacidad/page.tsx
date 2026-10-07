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
 * ## Lo que este documento NO dice (V14)
 *
 * **No dice que el sitio cumpla ninguna ley en particular.** No se ha hecho una
 * auditoria externa, asi que afirmar cumplimiento seria mentira. El texto describe
 * **lo que el negocio hace**: que datos recopila, para que, cuanto los guarda,
 * como ejercer los derechos ARCO, y que no hay proveedor de correo, analitica ni
 * pasarela de pago.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aviso de privacidad | Pingo POP",
  description:
    "Que datos personales recopila Pingo POP, para que se usan, cuanto se conservan, como ejercer los derechos ARCO y que no se comparten con terceros.",
};

export default function PrivacidadPage() {
  return <LegalPage slug="aviso-de-privacidad" />;
}