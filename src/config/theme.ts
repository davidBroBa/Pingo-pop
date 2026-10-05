/**
 * Tokens de marca en un solo objeto, para consumo desde JavaScript.
 *
 * Los estilos usan las variables CSS de `src/app/globals.css`; este objeto solo
 * sirve a quien necesite el valor en JS. Los hex son los del núcleo documentado
 * en `docs/DESIGN.md` — la extension cartoon vive en `globals.css`.
 *
 * Nota: ningun modulo lo importa hoy. Se conserva como referencia de tokens, no
 * como fuente de verdad (esa es `docs/DESIGN.md`).
 */
export const themeConfig = {
  colors: {
    primary: "#2A2227", // Tinta: texto y contornos
    secondary: "#F7B92C", // Ambar: color heroe de la marca
    accent: "#F7B92C",
    background: "#FAFAFA",
    foreground: "#2A2227",
    muted: "#707070",
    border: "#ECECEC",
  },

  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
  },
} as const;