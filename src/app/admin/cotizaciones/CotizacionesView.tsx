"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ETIQUETA_ESTADO,
  antiguedadLegible,
  filtrarSoloVencidas,
  idVencida,
  indiceVencidas,
  resumenAceptaciones,
  textoAvisoBorrado,
  textoAvisoVencida,
  type MarcadaParaRevision,
} from "@/lib/cotizaciones-panel";

/**
 * Panel de cotizaciones (T12).
 *
 * ## Por que este componente carga los datos y `AdminProductsView` no
 *
 * Los otros paneles reciben los datos ya resueltos desde su pagina. Aqui no, y
 * la razon es de seguridad: la pagina **no** puede consultar Prisma directamente,
 * porque lo unico que comprueba la revocacion de una sesion es `requireAdmin()`
 * (que usa `getSessionUser()`, que consulta la base de datos). Si la pagina
 * leyera las solicitudes por su cuenta, bastaria con una cookie firmada de una
 * sesion que el administrador ya habia invalidado cambiando su contrasena para
 * verlas. El middleware no lo evita: corre en Edge y no tiene Prisma.
 *
 * Asi que la lectura pasa por `GET /api/admin/quotes`, que ya esta verificada con
 * sus 401 y 403. Ademas el panel **repinta** tras cada cambio de estado o cada
 * borrado, y con los datos en props habia que mantener dos copias de la lista en
 * el servidor y en el cliente.
 */

/** Una fila del listado, tal y como la devuelve `GET /api/admin/quotes`. */
type Solicitud = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  details: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count: { items: number; legalAcceptances: number };
  legalAcceptances: Array<{ tipo: string; version: string; aceptadoAt: string }>;
};

/** Cabecera del listado, tal y como la devuelve `GET /api/admin/quotes`. */
type Listado = {
  hoy: string;
  mesesRetencion: number;
  vencidas: number;
  /** Las vencidas en detalle, no solo el numero (RF-22). */
  paraRevisar: MarcadaParaRevision[];
  solicitudes: Solicitud[];
};

/** Una partida del detalle. El producto viene anidado porque lo pide la ruta. */
type Detalle = {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  details: string;
  status: string;
  createdAt: string;
  items: Array<{
    id: number;
    quantity: number;
    product: { name: string; slug: string };
  }>;
  legalAcceptances: Array<{ tipo: string; version: string; aceptadoAt: string }>;
};

const ESTADOS = Object.keys(ETIQUETA_ESTADO);

/**
 * Texto de error de la API, o el que toque si la respuesta no lo trae.
 *
 * Copiada de `AdminProductsView` y de `AdminCategoriesForm`, que tienen la suya.
 * Las tres son distintas: unificar un helper de tres usages es mas CHANGE que
 * copiar cuatro lineas, asi que sigue asi a proposito.
 */
function leerError(payload: unknown, porDefecto: string): string {
  if (typeof payload === "object" && payload !== null && "error" in payload) {
    const value = (payload as { error: unknown }).error;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return porDefecto;
}

export function CotizacionesView({ hoy }: { hoy: string }) {
  const [listado, setListado] = useState<Listado | null>(null);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  /**
   * Filtro de "solo las que necesitan revisión" (RF-22).
   *
   * Vive en el cliente y no se manda a la API a propósito: el listado entero se
   * carga igual, porque la cabecera necesita el total y el filtro solo cambia lo
   * que se pinta debajo. Pedir al servidor una lista filtrada sería un segundo
   * viaje para algo que ya está en memoria.
   */
  const [soloVencidas, setSoloVencidas] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const response = await fetch("/api/admin/quotes");
      const data = (await response.json()) as Listado & { error?: string };
      if (!response.ok) {
        throw new Error(leerError(data, "No se pudieron cargar las solicitudes."));
      }
      setListado(data);
    } catch (cargaError) {
      setError(
        cargaError instanceof Error
          ? cargaError.message
          : "No se pudieron cargar las solicitudes.",
      );
    } finally {
      setCargando(false);
    }
  }, []);

  // La carga va en un efecto de montaje, nunca en el inicializador de
  // `useState`: leer ahi haria que el servidor y el cliente pintaran ramas
  // distintas y React tirara la hidratacion (el mismo motivo por el que el
  // carrito carga asi, spec 003, T9).
  //
  /* eslint-disable react-hooks/set-state-in-effect -- esta regla busca estado
     DERIVADO de props u otro estado, que se resuelve en el render. Aqui el estado
     viene de una peticion HTTP cuya respuesta depende de una comprobacion de
     revocacion de sesion que solo se puede hacer en el servidor **con base de
     datos** (`requireAdmin()` -> `getSessionUser()`). No hay forma de derivarlo
     durante el render. Y la alternativa "que la pagina lo pase por props", que es
     lo que hace `AdminProductsView`, es justo lo que aqui no se puede: una pagina
     que consulta Prisma por su cuenta serviria el HTML a una sesion que el
     administrador ya habia invalidado cambiando su contrasena, porque el
     middleware corre en Edge y no puede revocar. El discharge de esta regla es el
     mismo del carrito, por el mismo motivo de fondo. */
  useEffect(() => {
    void cargar();
  }, [cargar]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function cambiarEstado(id: number, status: string): Promise<void> {
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      const response = await fetch("/api/admin/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(leerError(data, "No se pudo cambiar el estado."));
      }
      setAviso(`Solicitud ${id}: estado ahora "${ETIQUETA_ESTADO[status] ?? status}".`);
      // Se recarga la lista entera y no solo la fila: el estado decide si una
      // solicitud cuenta como vencida (`contarAntiguas` solo mira estados
      // terminales), asi que cambiarlo puede mover el contador.
      await cargar();
      setDetalle((actual) =>
        actual !== null && actual.id === id ? { ...actual, status } : actual,
      );
    } catch (estadoError) {
      setError(
        estadoError instanceof Error
          ? estadoError.message
          : "No se pudo cambiar el estado.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function abrirDetalle(id: number): Promise<void> {
    setOcupado(true);
    setError("");
    setAviso("");
    try {
      const response = await fetch(`/api/quotes/${id}`);
      const data = (await response.json()) as Detalle & { error?: string };
      if (!response.ok) {
        throw new Error(leerError(data, "No se pudo abrir la solicitud."));
      }
      setDetalle(data);
    } catch (detalleError) {
      setError(
        detalleError instanceof Error
          ? detalleError.message
          : "No se pudo abrir la solicitud.",
      );
    } finally {
      setOcupado(false);
    }
  }

  async function borrar(id: number): Promise<void> {
    // El aviso dice lo que va a pasar de verdad: el `DELETE` quita tambien el
    // registro de aceptacion (RF-24). Sin esta advertencia, "borrar" en un panel
    // de cotizaciones suena a borrar un formulario de contacto.
    if (!window.confirm(textoAvisoBorrado(id))) return;

    setOcupado(true);
    setError("");
    setAviso("");
    try {
      const response = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(leerError(data, "No se pudo borrar la solicitud."));
      }
      setDetalle((actual) => (actual !== null && actual.id === id ? null : actual));
      setAviso(`Solicitud ${id} borrada, con sus partidas y su aceptación.`);
      await cargar();
    } catch (borrarError) {
      setError(
        borrarError instanceof Error
          ? borrarError.message
          : "No se pudo borrar la solicitud.",
      );
    } finally {
      setOcupado(false);
    }
  }

  // El indice y la lista a pintar se derivan del listado con funciones puras, aqui
  // en cada render. Son cheap (un `Map` de como maximo 300 entradas) y asi no hay
  // ningun estado mas que se pueda quedar desincronizado con los datos.
  const indice = indiceVencidas(listado?.paraRevisar ?? []);
  const filasVisibles = listado === null ? [] : filtrarSoloVencidas(listado.solicitudes, indice, soloVencidas);

  if (cargando && listado === null) {
    return (
      <p className="cartoon-border cartoon-shadow-sm rounded-3xl bg-card p-6 text-foreground-muted">
        Cargando solicitudes…
      </p>
    );
  }

  if (listado === null) {
    return (
      <div className="cartoon-border cartoon-shadow-sm rounded-3xl bg-cartoon-coral p-6">
        <p className="font-semibold text-primary">{error}</p>
        <button
          type="button"
          onClick={() => void cargar()}
          className="cartoon-focus mt-4 rounded-full bg-white px-4 py-2 font-semibold text-primary"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contador de vencidas. El numero lo pone la API con `contarAntiguas()`,
          no un filtro escrito aqui: la regla de "12 meses y solo en estado
          terminal" esta en `retention.ts` con sus tests, y duplicarla aqui la
          haria divergir sin que nadie se entere. */}
      <div className="cartoon-border cartoon-shadow-sm flex flex-wrap items-center gap-x-8 gap-y-3 rounded-3xl bg-card px-6 py-5">
        <p className="text-sm text-foreground-muted">
          <strong className="block font-heading text-3xl text-primary">
            {listado.solicitudes.length}
          </strong>
          solicitudes
        </p>
        <p className="text-sm text-foreground-muted">
          <strong className="block font-heading text-3xl text-primary">
            {listado.vencidas}
          </strong>
          para revisar (más de {listado.mesesRetencion} meses)
        </p>

        {/* El botón solo aparece si hay algo que revisar: un filtro que no
            filtra nada es ruido en la cabecera. */}
        {listado.vencidas > 0 && (
          <button
            type="button"
            onClick={() => setSoloVencidas((antes) => !antes)}
            aria-pressed={soloVencidas}
            className="cartoon-focus rounded-full bg-cartoon-coral px-4 py-2 text-sm font-semibold text-primary"
          >
            {soloVencidas
              ? "Ver todas las solicitudes"
              : `Ver solo las ${listado.vencidas} para revisar`}
          </button>
        )}
      </div>

      {error !== "" && (
        <p className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-coral px-5 py-4 text-primary">
          {error}
        </p>
      )}
      {aviso !== "" && (
        <p className="cartoon-border cartoon-shadow-sm rounded-2xl bg-cartoon-mint px-5 py-4 text-primary">
          {aviso}
        </p>
      )}

      {filasVisibles.length === 0 ? (
        <p className="cartoon-border cartoon-shadow-sm rounded-3xl bg-card p-6 text-foreground-muted">
          {soloVencidas
            ? "Ninguna solicitud ha superado los 12 meses."
            : "Todavía no ha llegado ninguna solicitud de cotización."}
        </p>
      ) : (
        <ul className="space-y-4">
          {filasVisibles.map((solicitud) => {
            const vencida = idVencida(indice, solicitud.id);
            return (
            <li
              key={solicitud.id}
              className={`cartoon-border cartoon-shadow-sm rounded-3xl p-6 ${
                vencida !== undefined ? "bg-cartoon-coral" : "bg-card"
              }`}
            >
              {vencida !== undefined && (
                <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-sm font-semibold text-primary">
                  {textoAvisoVencida(vencida.meses)}
                </p>
              )}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-primary">
                    #{solicitud.id} · {solicitud.name}
                  </h2>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {solicitud.phone}
                    {solicitud.email !== null && solicitud.email !== "" && (
                      <> · {solicitud.email}</>
                    )}
                    {" · "}
                    {antiguedadLegible(solicitud.createdAt, hoy)}
                  </p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {solicitud._count.items} partida
                    {solicitud._count.items === 1 ? "" : "s"} · Aceptó:{" "}
                    {resumenAceptaciones(
                      solicitud.legalAcceptances.map((aceptacion) => ({
                        tipo: aceptacion.tipo as never,
                        version: aceptacion.version,
                      })),
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`estado-${solicitud.id}`}>
                    Estado de la solicitud {solicitud.id}
                  </label>
                  <select
                    id={`estado-${solicitud.id}`}
                    value={solicitud.status}
                    disabled={ocupado}
                    onChange={(evento) =>
                      void cambiarEstado(solicitud.id, evento.target.value)
                    }
                    className="cartoon-border cartoon-focus rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary"
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado} value={estado}>
                        {ETIQUETA_ESTADO[estado]}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void abrirDetalle(solicitud.id)}
                    className="cartoon-focus rounded-full bg-cartoon-lavender px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
                  >
                    Ver detalle
                  </button>

                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void borrar(solicitud.id)}
                    className="cartoon-focus rounded-full bg-cartoon-coral px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
                  >
                    Borrar
                  </button>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm text-foreground-muted">
                {solicitud.details}
              </p>
            </li>
            );
          })}
        </ul>
      )}

      {detalle !== null && (
        <section
          aria-label={`Detalle de la solicitud ${detalle.id}`}
          className="cartoon-border cartoon-shadow-sm rounded-3xl bg-cartoon-sky p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-heading text-2xl font-bold text-primary">
              Detalle de la solicitud #{detalle.id}
            </h2>
            <button
              type="button"
              onClick={() => setDetalle(null)}
              className="cartoon-focus rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary"
            >
              Cerrar
            </button>
          </div>

          <h3 className="mt-6 font-semibold text-primary">Partidas</h3>
          {detalle.items.length === 0 ? (
            <p className="text-sm text-foreground-muted">Sin partidas.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {detalle.items.map((item) => (
                <li key={item.id} className="text-sm text-foreground-muted">
                  {item.quantity} × {item.product.name}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-6 font-semibold text-primary">
            Documentos que aceptó
          </h3>
          <ul className="mt-2 space-y-1">
            {detalle.legalAcceptances.map((aceptacion) => (
              <li
                key={`${aceptacion.tipo}-${aceptacion.aceptadoAt}`}
                className="text-sm text-foreground-muted"
              >
                {resumenAceptaciones([
                  {
                    tipo: aceptacion.tipo as never,
                    version: aceptacion.version,
                  },
                ])}{" "}
                — {antiguedadLegible(aceptacion.aceptadoAt, hoy)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
