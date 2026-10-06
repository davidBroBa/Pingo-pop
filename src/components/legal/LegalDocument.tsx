import { interpolar, type LegalLeido } from "@/lib/legal-data";
import { dividirEnEmpaques } from "@/lib/legal-texto";
import type { Documento } from "@/lib/legal-versions";

/**
 * Cuerpo de un documento legal, con `interpolar()` ya aplicado.
 *
 * ## Por que es un Server Component
 *
 * No lleva `"use client"` a proposito. Es texto legal, se lee, y no necesita
 * JavaScript en el navegador: mandarlo como React de servidor ademas evita que
 * el contenido se hydrate y se pueda desajustar.
 *
 * ## Los asteriscos
 *
 * Los textos traen marcado `**negrita**` en 93 de sus lineas. Se convierte con
 * {@link dividirEnEmpaques}, que parte la cadena, y **no** con
 * `dangerouslySetInnerHTML`: lo que no sea React nunca llega al DOM, y un
 * documento legal con `<script>` dentro se veria como texto, no se ejecutaria.
 *
 * ## Un `h2` por seccion, y solo uno
 *
 * El `h1` es el titulo del documento y lo pone la pagina. Aqui van los `h2` de
 * cada seccion, en el orden del registro, que es el orden en que se leen.
 *
 * @param documento - El documento completo, ya resuelto por `documentoDe(slug)`.
 * @param datos - Los seis campos leidos con `leerLegal()`, con el marcador donde
 *   falte. Es lo que hace que un token sin resolver salga como marca y nunca como
 *   `{{RFC}}` en pantalla.
 */
export function LegalDocument({
  documento,
  datos,
}: {
  documento: Documento;
  datos: LegalLeido;
}) {
  return (
    <div className="space-y-10">
      {documento.contenido.map((seccion) => (
        <section key={seccion.titulo}>
          <h2 className="font-heading text-2xl font-bold text-primary">
            {interpolar(seccion.titulo, datos)}
          </h2>

          <div className="mt-4 space-y-4">
            {seccion.cuerpo.map((parrafo, indice) => (
              <p
                key={`${seccion.titulo}-${indice}`}
                className="leading-8 text-foreground-muted"
              >
                {dividirEnEmpaques(interpolar(parrafo, datos)).map(
                  (trozo, posicion) =>
                    trozo.fuerte ? (
                      <strong key={`${indice}-${posicion}`} className="text-primary">
                        {trozo.texto}
                      </strong>
                    ) : (
                      <span key={`${indice}-${posicion}`}>{trozo.texto}</span>
                    ),
                )}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
