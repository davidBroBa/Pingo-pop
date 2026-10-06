"use client";

import { useState } from "react";

import { readApiError } from "@/components/ui";
import {
  CAMPOS_LEGALES,
  type CampoLegal,
  type EntradaLegal,
} from "@/lib/legal-data";
import {
  AYUDA_POR_CAMPO,
  ETIQUETA_POR_CAMPO,
  resumenFaltantes,
  textoAvisoFaltantes,
} from "@/lib/legal-panel";

/**
 * Formulario de los seis datos legales (`/admin/legal`).
 *
 * ## Por qué los datos llegan por props y por qué aquí no hay carga inicial
 *
 * A diferencia del panel de cotizaciones, aquí los datos llegan ya resueltos desde
 * la página del servidor. El motivo es que **no son datos personales de terceros**
 * (son los del propio negocio, y van a estar publicados), y porque no hay lista
 * que haya que repintar tras cada cambio: el guardado es de un solo envío.
 *
 * Eso tiene una ventaja concreta: si la base de datos está caída, `readLegalData()`
 * devuelve `{}` y el panel **se abre vacío** en vez de dar un 500. Se puede ver
 * qué hay que rellenar y, si la base de datos no está, al menos se ve el aviso.
 */

/**
 * Lo que devuelve `PATCH /api/admin/legal`.
 *
 * Ojo al envoltorio: la respuesta correcta es **`{ legal: {...} }`**, no los campos
 * en la raiz. Leer `data[campo]` daria `undefined` para los seis, el aviso
 * recalculado diria "faltan 6" justo despues de haberlos rellenado todos, y el
 * panel se pondria rojo en el momento de hacer lo correcto.
 */
type Respuesta = {
  legal?: Partial<Record<CampoLegal, string | null>>;
  error?: string;
};

export function LegalView({
  datos,
  faltantes,
}: {
  datos: EntradaLegal;
  faltantes: CampoLegal[];
}) {
  // El `useState` se inicializa con lo que vino resuelto: el texto legal sustituye
  // el marcador por el dato real o lo deja vacío, y aquí se ve el dato real o nada.
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const campo of CAMPOS_LEGALES) {
      const valor = datos[campo];
      inicial[campo] = typeof valor === "string" ? valor : "";
    }
    return inicial;
  });

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  // El aviso de RF-3 se recalcula al guardar: si el dueño rellena los seis, el
  // aviso tiene que desaparecer en el mismo momento, no en la siguiente recarga.
  const [pendientes, setPendientes] = useState<CampoLegal[]>(faltantes);

  async function guardar(evento: React.FormEvent<HTMLFormElement>): Promise<void> {
    evento.preventDefault();
    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      const response = await fetch("/api/admin/legal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // Se mandan los seis. Un campo vacío llega como `""` y el `preprocess` de
        // `LegalDataSchema` lo convierte en ausencia, que es lo que significa.
        body: JSON.stringify(valores),
      });

      const data = (await response.json()) as Respuesta;

      if (!response.ok) {
        throw new Error(readApiError(data, "No se pudieron guardar los datos."));
      }

      // Lo que dice el servidor es lo que hay: el contador no se calcula en el
      // cliente a ojo, se recalcula con los mismos campos que devolvio la API, leidos
      // de `data.legal`. Si `legal` no viniera (por ejemplo en un error que llego con
      // 2xx, que no deberia pasar), se deja el aviso como estaba en vez de marcarlo
      // entero como pendiente: es peor avisar de mas que de menos.
      const guardados = data.legal;
      if (guardados === undefined) {
        setMensaje("Guardado, pero no se pudo leer la respuesta para actualizar el aviso.");
        return;
      }

      const nuevos = CAMPOS_LEGALES.filter((campo) => {
        const valor = guardados[campo];
        return typeof valor !== "string" || valor.trim() === "";
      });

      setPendientes(nuevos);
      setMensaje(
        nuevos.length === 0
          ? "Guardado. Los seis datos están rellenados."
          : `Guardado. Quedan ${nuevos.length} sin rellenar: ${nuevos
              .map((campo) => ETIQUETA_POR_CAMPO[campo])
              .join(", ")}.`,
      );
    } catch (guardarError) {
      setError(
        guardarError instanceof Error
          ? guardarError.message
          : "No se pudieron guardar los datos.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Aviso de RF-3. El texto lo produce `textoAvisoFaltantes()` a partir de
          `camposFaltantes()`: enumerar los que faltan a mano aquí sería mentir en
          cuanto la tabla ganara un campo. */}
      <section
        aria-live="polite"
        className={`cartoon-border cartoon-shadow-sm rounded-3xl px-6 py-5 ${
          pendientes.length === 0 ? "bg-cartoon-mint" : "bg-cartoon-coral"
        }`}
      >
        <p className="font-semibold text-primary">
          {resumenFaltantes(pendientes)} datos legales rellenados
        </p>
        <p className="mt-2 text-sm text-foreground-muted">
          {textoAvisoFaltantes(pendientes)}
        </p>
      </section>

      {error !== "" && (
        <p className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-coral px-5 py-4 text-primary">
          {error}
        </p>
      )}
      {mensaje !== "" && (
        <p className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-mint px-5 py-4 text-primary">
          {mensaje}
        </p>
      )}

      <form
        onSubmit={(evento) => void guardar(evento)}
        className="cartoon-border cartoon-shadow space-y-8 rounded-3xl bg-card p-6 sm:p-8"
      >
        {CAMPOS_LEGALES.map((campo) => {
          const falta = pendientes.includes(campo);
          return (
            <div key={campo}>
              <label
                htmlFor={`legal-${campo}`}
                className="block font-semibold text-primary"
              >
                {ETIQUETA_POR_CAMPO[campo]}
                {falta && (
                  <span className="ml-2 rounded-full bg-cartoon-coral px-2 py-0.5 text-xs font-semibold text-primary">
                    sin rellenar
                  </span>
                )}
              </label>

              <input
                id={`legal-${campo}`}
                name={campo}
                type={campo === "correoContacto" ? "email" : "text"}
                value={valores[campo] ?? ""}
                onChange={(evento) =>
                  setValores((anterior) => ({
                    ...anterior,
                    [campo]: evento.target.value,
                  }))
                }
                aria-describedby={`ayuda-${campo}`}
                className="cartoon-border cartoon-focus mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none"
              />

              <p id={`ayuda-${campo}`} className="mt-2 text-sm text-foreground-muted">
                {AYUDA_POR_CAMPO[campo]}
              </p>
            </div>
          );
        })}

        <button
          type="submit"
          disabled={guardando}
          className="cartoon-focus rounded-full bg-accent px-6 py-3 font-semibold text-primary disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar datos legales"}
        </button>
      </form>
    </div>
  );
}
