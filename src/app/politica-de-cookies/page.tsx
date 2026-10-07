import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/LegalPage";

/**
 * Politica de cookies.
 *
 * `force-dynamic` va **aqui**, en el `page.tsx`, y no en un componente: la pagina
 * lee `LegalData` para poder rellenar los datos del negocio, y una pagina
 * prerenderizada publicaria los marcadores de "falta este dato" congelados en el
 * momento del build.
 *
 * ## Lo que este documento coincide campo por campo (V3)
 *
 * El texto **coincide exactamente** con `src/lib/auth/session-token.ts` (cookie
 * `pp_session`: necesaria, 8 h, `HttpOnly`, `SameSite=Lax`, `Secure` en produccion)
 * y `src/lib/quote-cart-storage.ts` (clave `pingo-quote-cart` en `localStorage`,
 * funcional). No se menciona ninguna otra tecnologia.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de cookies | Pingo POP",
  description:
    "Que cookies usa este sitio, para que sirven, cuanto duran y como gestionarlas. Solo la cookie de sesion y el carrito guardado en localStorage.",
};

export default function CookiesPage() {
  return <LegalPage slug="politica-de-cookies" />;
}