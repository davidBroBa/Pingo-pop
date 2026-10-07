"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

/**
 * Contexto del consentimiento.
 *
 * Solo existe para que el panel sepa si esta abierto, y la app sepa si hay
 * que pedir consentimiento. No guarda la decision: la decision vive en
 * `localStorage` y se lee con `leerRegistro`.
 */
type ConsentContextValue = {
  /** Si el panel esta abierto. */
  abierto: boolean;
  /** Abre el panel. */
  abrir: () => void;
  /** Cierra el panel. */
  cerrar: () => void;
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

/**
 * Provider del consentimiento.
 *
 * Se monta en el `Footer` (no en `MainLayout`) porque el panel vive en el pie
 * y no debe estar en el arbol de todas las paginas. No decide nada por su
 * cuenta: solo escucha el evento `abrir-consentimiento` que emite el enlace
 * del pie. Abrir el panel no escribe nada en `localStorage`; guardar una
 * decision es responsabilidad del panel, y solo cuando el usuario elige
 * (RF-18). No hay banner automatico: nadie abre esto sin que el usuario lo
 * pida (D14, RF-15).
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  /* El elemento que abrio el panel, para devolverle el foco al cerrar
     (patron de dialogo modal: el foco no puede quedarse en un nodo que ya
     no existe). Es DOM, no estado React: no hay que repintar por esto. */
  const abridorRef = useRef<HTMLElement | null>(null);

  const abrir = useCallback(() => {
    abridorRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAbierto(true);
  }, []);

  const cerrar = useCallback(() => {
    setAbierto(false);
    abridorRef.current?.focus();
  }, []);

  useEffect(() => {
    /* Se escucha SIEMPRE, tambien con `TECNOLOGIAS_NO_ESENCIALES` vacia: es
       el on-demand del enlace del pie, no una peticion automatica. */
    window.addEventListener("abrir-consentimiento", abrir);
    return () => window.removeEventListener("abrir-consentimiento", abrir);
  }, [abrir]);

  return (
    <ConsentContext.Provider
      value={{
        abierto,
        abrir,
        cerrar,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

/**
 * Hook para usar el contexto del consentimiento.
 *
 * Lanza si se usa fuera del provider, que es lo correcto: un componente que
 * necesita consentimiento no debe renderizarse sin provider.
 */
export function useConsent(): ConsentContextValue {
  const contexto = useContext(ConsentContext);
  if (contexto === null) {
    throw new Error("useConsent debe usarse dentro de un ConsentProvider");
  }
  return contexto;
}