"use client";

/**
 * Enlace "Preferencias de cookies" del pie.
 *
 * Es un Client Component **solo** porque el `Footer` es un componente de
 * servidor (lo renderiza `MainLayout` para paginas estaticas) y pasarle un
 * `onClick` a un `Link` desde el servidor es un error de Next.js. Lo unico que
 * hace es emitir el evento `abrir-consentimiento`, que `ConsentProvider`
 * escucha. No lee `localStorage`, no escribe nada: la decision se guarda en el
 * panel, y solo si el usuario elige (RF-18).
 */
export function ConsentLink() {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent("abrir-consentimiento"))
      }
      className="cartoon-focus rounded-[8px] text-sm text-foreground-muted underline underline-offset-4 transition-colors hover:text-primary"
    >
      Preferencias de cookies
    </button>
  );
}