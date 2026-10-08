# Spec: Pingo POP - Favicon de marca, 404 propia y registro cartoon (012-favicon-404-registro)

> **Estado:** `implementada` (2026-10-08, QA en producción verde)
> **Fecha:** 2026-10-08
> **Constitución:** [`../../constitution.md`](../../constitution.md) · **SDD:** [`../../docs/SDD.md`](../../docs/SDD.md)
> Specs base: `002-cartoon-visual` (lenguaje visual), `010-registro-publico` (registro y login), `009-legal-compliance-privacy` (accesibilidad)

## 1. Contexto y objetivo

Tres frentes de pulido de la cara pública de la tienda:

1. **Favicon.** El navegador muestra el favicon por defecto de `create-next-app` (el de Vercel): en las pestañas no se ve la marca. Existe el logo de la empresa en `public/images/logo/logo.png` (PNG cuadrado 1254×1254) que ya usa el `Logo` del header, pero nunca se registró como icono del sitio.
2. **Página 404.** No existe `src/app/not-found.tsx`: ante una ruta inexistente Next muestra su página genérica, ajena al lenguaje cartoon de la marca y sin camino de retorno claro.
3. **Registro.** La pantalla `/registro` quedó con un estilo genérico (inputs `rounded-md`, tarjetas `rounded-lg`) distinto del login y del resto del sitio, que ya usan el lenguaje cartoon (`cartoon-border`, `cartoon-shadow`, `rounded-2xl`, `rounded-3xl`, `bg-cartoon-cream`). Además el microcopy es funcional pero frío.

Objetivo: **favicon con el logo de la empresa**, **404 propia a medida** y **registro más amigable con el mismo estilo que toda la web**, sin tocar la lógica de negocio ni los endpoints.

## 2. Usuarios / actores

| Actor | Qué necesita |
|---|---|
| Visitante | Reconocer la marca en la pestaña del navegador; una 404 clara y amable con vía de retorno; un registro que se sienta parte del sitio |
| Administrador | Que el cambio sea solo visual: ni la API de registro ni las reglas de seguridad cambian |

## 3. Requisitos funcionales

- **RF-1.** El icono del navegador (pestañas y marcadores) pasa a ser el **logo de la empresa** en lugar del favicon por defecto de Vercel. Se sirve además el icono de Apple Touch (iOS, 180×180).
- **RF-2.** `src/app/favicon.ico` (heredado de `create-next-app`) se reemplaza por un `.ico` con el logo, y se añade `src/app/icon.png` (vector/escalado del logo). Ambos se generan desde `public/images/logo/logo.png`.
- **RF-3.** Existe `src/app/not-found.tsx` con el lenguaje cartoon (`bg-cartoon-cream`, tarjetas `cartoon-border cartoon-shadow`, badge rotado), mensaje amable de "no encontrada", y mínimo un enlace claro de retorno a la tienda.
- **RF-4.** La 404 no revela información interna (sin rutas, sin stack, sin datos de sesión): es una página estática con contenido de marca.
- **RF-5.** `/registro` usa el mismo marco visual que `/login` (`min-h-screen bg-cartoon-cream`, badge "Pingo" rotado, tarjeta `cartoon-border cartoon-shadow rounded-3xl bg-card`, enlace "Volver a la tienda").
- **RF-6.** Campos del formulario de registro con los mismos estilos que el login: inputs `rounded-2xl bg-white` con `cartoon-border cartoon-focus`, labels semánticos, errores con `role="alert"` sobre `bg-cartoon-coral`, botón primario `cartoon-border cartoon-shadow cartoon-hover cartoon-focus rounded-2xl bg-accent`.
- **RF-7.** Microcopy más amigable: texto de apoyo junto a los campos (p. ej. "Mínimo 8 caracteres"), subtítulos cálidos, y se mantiene la política BUYER de contraseña (mínimo 8, sin complejidad obligatoria).
- **RF-8.** Comportamiento **idéntico** de la lógica: mismas peticiones POST a `/api/auth/register` con el mismo payload, mismos códigos 201/400/409/503, mismo manejo de errores por campo, misma redirección a `/perfil` tras el alta.
- **RF-9.** Accesibilidad no regresa: labels asociados (`for`/`id`), `aria-invalid` y `aria-describedby` en errores, foco visible `cartoon-focus`, contraste sin cambios (paleta de `docs/DESIGN.md`, sin hex nuevos).

## 4. Requisitos no funcionales

| Tipo | Requisito |
|---|---|
| Seguridad | Sin cambios en endpoints ni en validación; la 404 es contenido estático |
| Compatibilidad | Favicon en formato `.ico` (todos los navegadores) + `icon.png`/`apple-icon.png` (modernos/iOS). Iconos pequeños y sin dependencias nuevas |
| Mantenibilidad | Los iconos se regeneran desde el logo con un script versionado (`iconos.mjs` en la carpeta de la spec); el logo sigue siendo la única fuente |
| UX/Accesibilidad | Mismo lenguaje cartoon de la spec 002; contraste y foco preservados (especificación 009) |

## 5. Criterios de aceptación

- [x] En la URL desplegada, la pestaña del navegador muestra el logo (no el icono de Vercel). → Verificado: `/favicon.ico`, `/icon.png` y `/apple-icon.png` 200 en producción; el HTML del sitio enlaza los tres (`rel="icon"` + `apple-touch-icon`).
- [x] `GET /favicon.ico` responde 200 y sirve el logo; `link[rel="icon"]` apunta al logo. → QA producción 200 / 200 / 200; revisión visual final a cargo del usuario.
- [x] Una ruta inexistente (p. ej. `/esto-no-existe`) responde 404 con la página propia y un enlace a `/`. → Verificado: 404 + HTML con "Se fue de paseo"/"Volver a la tienda"/`noindex`.
- [x] `/registro` visualmente coherente con `/login` (mismo marco y tokens cartoon). → Verificado en HTML servido (clases cartoon, badge, hint).
- [x] El registro sigue funcionando end-to-end: 201 + `Set-Cookie`, duplicado 409, validación 400. → Sin cambios de lógica (RF-8); spec 010 ya verificada; smoke `/registro` 200 en producción.
- [x] `npm run check` en verde (typecheck, lint, test, build). → typecheck 0 · lint 0 · 431 tests / 0 fail · build OK.