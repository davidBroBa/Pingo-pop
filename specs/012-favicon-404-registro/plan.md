# Plan: 012-favicon-404-registro

## Enfoque

Tres cambios **solo de presentación**, cero lógica de negocio:

1. **Favicon** — generar `src/app/favicon.ico`, `src/app/icon.png` y `src/app/apple-icon.png` desde `public/images/logo/logo.png` con un script Node + `sharp` (ya instalado). Next App Router publica `app/favicon.ico` y `app/icon.png` automáticamente como `<link rel="icon">`; `apple-icon.png` cubre iOS. Los ficheros de `public/` (next.svg, vercel.svg, etc.) se quedan como están (no se usan).
2. **404** — `src/app/not-found.tsx` con el lenguaje cartoon (`bg-cartoon-cream`, badge rotado, tarjeta `cartoon-border cartoon-shadow`, enlace "Volver a la tienda"). Next renderiza `not-found.tsx` dentro del layout raíz, así que hereda fuentes y variables.
3. **Registro** — alinear `src/app/registro/page.tsx` y `RegisterForm.tsx` al marco visual y tokens de `/login`: fondo `cartoon-cream`, tarjeta `cartoon-border cartoon-shadow rounded-3xl`, inputs `rounded-2xl bg-white cartoon-border cartoon-focus`, labels semánticos, errores `bg-cartoon-coral` con `role="alert"`, botón `bg-accent cartoon-*`, y enlace "Volver a la tienda". Microcopy amable sin tocar el payload del POST ni los estados.

## Orden

1. Script `specs/012-favicon-404-registro/iconos.mjs` + `favicon.ico`/`icon.png`/`apple-icon.png` generados en `src/app/`.
2. `not-found.tsx`.
3. `page.tsx` + `RegisterForm.tsx` del registro.
4. Gates locales (`npm run typecheck && lint && test && build`).
5. Sync al servidor + build Docker + deploy, QA de favicon/404/registro, docs (MEMORY, tasks).

## Riesgos

- **sharp sin salida ICO**: sharp 0.35 emite PNG/JPEG/WebP pero no `.ico`. Alternativa: generar PNG 32×32 y empaquetarlo en ICO es engorroso a mano. Decisión: usar `app/icon.png` como único icono (Next lo publica como `rel="icon"` en HTML; los navegadores modernos lo respetan) y colocar la ICO solo si hace falta compatibilidad legacy. Verificar en QA que la pestaña muestra el logo.
- **No puedo inspeccionar visualmente el logo** (modelo sin entrada de imagen): validaré por dimensiones (cuadrado 1254×1254), presencia de canal alfa y el resultado al servirse; el QA visual final lo confirma el usuario.

## FUERA DE ALCANCE

- Spec 011 (uploads servida): sigue dormida por orden del usuario.
- Cambios de API, BD, seguridad: ninguno.