"use client";

import { useEffect, useState } from "react";

import { X } from "lucide-react";

import { leerRegistro, pideConfirmacion, botonClases, CATEGORIAS_CONSENTIMIENTO, CLAVE_CONSENTIMIENTO, DECISIONES, Decision } from "@/lib/consent";

import { useConsent } from "./ConsentProvider";

/**
 * Panel de preferencias de cookies (RF-16, RF-17, RF-18).
 *
 * Se monta en el `Footer` y se abre desde el enlace "Preferencias de cookies".
 * **No hay banner automatico**: el panel solo se abre por accion explicita del
 * usuario (D14, RF-15). Abrirlo no escribe nada en `localStorage`: las tres
 * vias solo guardan si el usuario elige (RF-18), y con `TECNOLOGIAS_NO_ESENCIALES`
 * vacia la primera apertura no pide confirmacion de nada.
 *
 * ## Lo que este panel NO hace, y por que importa
 *
 * **No usa `dangerouslySetInnerHTML`**. El contenido son textos planos y
 * componentes React, que escapan por defecto.
 *
 * **No guarda nada en `localStorage` hasta que el usuario elige**. La primera
 * vez no pide confirmacion; si ya habia decision y se cambia, pide
 * confirmacion (`RF-18`). Si el usuario cancela, no se escribe nada.
 *
 * **Las cuatro categorias se muestran aunque hoy no haya nada que decidir**.
 * Estan ahi para que anadir una tecnologia no obligue a rediseniar el panel.
 *
 * **Los botones "Aceptar" y "Rechazar" tienen exactamente el mismo numero de
 * clases** (`RF-17`). Se comprueba con `contarClases()` y no a ojo: un test de
 * Node no ve pantallas, pero si puede contar clases.
 */
export function ConsentPanel() {
  const { abierto, cerrar } = useConsent();

  // === TODOS LOS HOOKS PRIMERO ===
  const [decision, setDecision] = useState<Decision | null>(null);
  const [previa, setPrevia] = useState<Decision | null>(null);
  const [pidiendoConfirmacion, setPidiendoConfirmacion] = useState(false);
  const [tipo, setTipo] = useState<"TERMINOS" | "PRIVACIDAD" | "COOKIES">("TERMINOS");

  // Efecto de foco: cuando se abre, enfoca el boton de cerrar para navegacion
  // por teclado. Se limpia al cerrar.
  useEffect(() => {
    if (!abierto) return;
    const btnCerrar = document.getElementById("consent-close");
    btnCerrar?.focus();
  }, [abierto]);

  // Escape cierra el dialogo (patron de dialogo modal, ARIA APG).
  // `cerrar()` devuelve el foco al elemento que lo abrio (ConsentProvider).
  useEffect(() => {
    if (!abierto) return;
    const alTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        cerrar();
      }
    };
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [abierto, cerrar]);

  /* eslint-disable react-hooks/set-state-in-effect -- esta regla busca estado
     DERIVADO de props u otro estado, que se resuelve en el render. Aqui se lee un
     almacen externo mutable (localStorage) que solo existe en el navegador, y solo
     cuando el panel se abre: no hay forma de derivar la decision previa durante el
     render sin que el servidor y el cliente pinten ramas distintas. Mismo patron
     que la carga del carrito en QuoteCartContext. */
  useEffect(() => {
    if (!abierto) return;
    const guardado = leerRegistro(localStorage.getItem(CLAVE_CONSENTIMIENTO));
    if (guardado) {
      setPrevia(guardado.decision);
    }
  }, [abierto]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Cierra a demanda, y solo por accion explicita del usuario (el enlace del
  // pie). No hay banner automatico: `no se pinta nada` cuando la pagina carga
  // (D14, RF-15) porque el panel no se abre solo. Abrirlo no escribe nada en
  // `localStorage`: solo las tres vias, y solo si el usuario elige (RF-18).
  if (!abierto) {
    return null;
  }

  // === FUNCIONES AUXILIARES (tienen acceso a hooks/state) ===
  const manejarDecision = async (via: Decision) => {
    if (pidiendoConfirmacion) return;

    if (pideConfirmacion(previa, via)) {
      setPidiendoConfirmacion(true);
      setDecision(via);
      return;
    }

    await confirmarDecision(via);
  };

  const confirmarDecision = async (via: Decision) => {
    const ahora = new Date();
    const registro = {
      version: 1,
      tipo,
      decision: via,
      decidedAt: ahora.toISOString(),
    };
    localStorage.setItem(CLAVE_CONSENTIMIENTO, JSON.stringify(registro));
    setPrevia(via);
    cerrar();
  };

  const cancelarConfirmacion = () => {
    setPidiendoConfirmacion(false);
    setDecision(null);
  };

  // === JSX ===
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <div
        className="cartoon-border cartoon-shadow-lg w-full max-w-md rounded-3xl bg-white p-6 sm:p-8"
        role="document"
      >
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2
              id="consent-title"
              className="font-heading text-2xl font-bold text-primary"
            >
              Preferencias de cookies
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Elige como quieres que usemos las cookies y tecnologias similares.
            </p>
          </div>
          <button
            id="consent-close"
            onClick={cerrar}
            className="cartoon-border rounded-full p-2 text-foreground-muted hover:text-primary transition-colors flex-shrink-0"
            aria-label="Cerrar panel de preferencias"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        {/* Selector de documento: TERMINOS, PRIVACIDAD, COOKIES */}
        <div className="mb-6">
          <label
            htmlFor="consent-tipo"
            className="block text-sm font-semibold text-primary mb-2"
          >
            Documento al que se refiere la decision
          </label>
          <select
            id="consent-tipo"
            value={tipo}
            onChange={(e) =>
              setTipo(e.target.value as "TERMINOS" | "PRIVACIDAD" | "COOKIES")
            }
            className="cartoon-border w-full rounded-2xl bg-white px-4 py-2 text-sm"
          >
            <option value="TERMINOS">Terminos y condiciones</option>
            <option value="PRIVACIDAD">Aviso de privacidad</option>
            <option value="COOKIES">Politica de cookies</option>
          </select>
        </div>

        {/* Las cuatro categorias (RF-16) */}
        <fieldset className="mb-6">
          <legend className="text-sm font-semibold text-primary mb-3">
            Categorias de cookies
          </legend>
          <div className="space-y-3">
            {CATEGORIAS_CONSENTIMIENTO.map((categoria) => (
              <label
                key={categoria}
                className="cartoon-border rounded-2xl bg-white p-4 flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  disabled
                  checked={categoria === "necesarias"}
                  className="mt-1 w-4 h-4 text-accent"
                  aria-disabled="true"
                />
                <div>
                  <span className="font-semibold text-primary capitalize">
                    {categoria}
                  </span>
                  <p className="mt-1 text-xs text-foreground-muted">
                    {categoria === "necesarias"
                      ? "Imprescindibles para que el sitio funcione (sesion, carrito). No se pueden desactivar."
                      : categoria === "analiticas"
                        ? "Nos ayudan a entender como se usa el sitio. No hay analitica activa hoy."
                        : categoria === "marketing"
                          ? "Permiten mostrar anuncios relevantes. No hay publicidad activa hoy."
                          : "Recuerdan tus preferencias de idioma, region, etc."}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Las tres vias: aceptar, rechazar, configurar (RF-16, RF-17) */}
        <div className="flex flex-col gap-3">
          {DECISIONES.map((via) => (
            <button
              key={via}
              type="button"
              onClick={() => manejarDecision(via as Decision)}
              className={botonClases(via as Decision)}
            >
              {via === "aceptar" && "Aceptar todo"}
              {via === "rechazar" && "Rechazar todo"}
              {via === "configurar" && "Configurar"}
            </button>
          ))}

          {/* Confirmacion RF-18 */}
          {pidiendoConfirmacion && (
            <div
              className="cartoon-border rounded-2xl bg-cartoon-coral p-4"
              role="alert"
            >
              <p className="font-semibold text-primary">
                Vas a cambiar tu decision anterior ({previa}).
              </p>
              <p className="mt-2 text-sm text-foreground-muted">
                Estas seguro? Se sobrescribira la decision guardada.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={cancelarConfirmacion}
                  className="cartoon-border rounded-full bg-white px-4 py-2 text-sm font-semibold flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => confirmarDecision(decision as Decision)}
                  className="cartoon-border cartoon-shadow-sm rounded-full bg-primary px-4 py-2 text-sm font-bold text-white flex-1"
                >
                  Si, cambiar
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-foreground-muted text-center">
          Puedes cambiar tu decision en cualquier momento desde este enlace.
        </p>
      </div>
    </div>
  );
}
