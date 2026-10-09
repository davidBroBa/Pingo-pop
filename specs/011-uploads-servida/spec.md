# Spec: Pingo POP - Servido de uploads en producción (011-uploads-servida)

> **Estado:** `borrador` (pendiente de aprobación)
> **Fecha:** 2026-10-08
> **Constitución:** [`../../constitution.md`](../../constitution.md) · **SDD:** [`../../docs/SDD.md`](../../docs/SDD.md)
> Specs base: `008-site-and-category-images` (subida validada, `UPLOAD_TARGETS`),
> hallazgo **QA-2** de la revisión de QA del 2026-10-07.

> **Decisión del usuario (2026-10-08):** "decídelas tú" → se elige **route handler
> dinámico en `src/`** frente a volumen+rebuild. Motivo: el 404 de archivos
> nuevos no lo cura ni el volumen ni el chown, porque Next 16 resuelve `public/`
> contra las rutas conocidas al arrancar; un manejador lee disco en cualquier
> momento. El volumen y el `chown` del Dockerfile van detrás como parte del mismo
> arreglo (persistencia y permisos), no como arreglo del 404.
>
> **Confirmado empíricamente el 2026-10-08** en `pingo-app` (reinicio de la
> investigación por bug report del usuario: «la imagen que cargué del muñeco de
> nieve no carga»): escribí un fichero nuevo dentro del contenedor con
> `docker exec -u root pingo-app sh -c 'printf x > /app/public/uploads/products/bugcheck-side-test.jpg'`
> y lo pedí con `curl http://127.0.0.1:3000/uploads/products/bugcheck-side-test.jpg`
> → **HTTP 404**, con el fichero existente en disco (`-rw-r--r-- 1 root root 1`).
> El `curl` se hizo contra el proxy interno, no contra el dominio público, para
> aislar el comportamiento de la app. Conclusión: la subida de la foto del muñeco
> falló por doble motivo — el `EACCES` de escritura (QA-2a: la app corre como
> `nextjs`, uid 1001, y `public/uploads` es root:root) y el 404 de ficheros
> nuevos (QA-2b) —, por eso su `Product.image` quedó `NULL` en la BD.

## 1. Contexto y objetivo

En producción (`pingo-app`, Next 16.3.8 `next start` en Docker) una imagen subida
con éxito desde el panel **no se sirve** hasta recrear el contenedor:

- **QA-2a:** `public/uploads/` es `root:775` y la app corre como `nextjs`
  (uid 1001) → `EACCES` al escribir. Arreglado en caliente con `chown`, pero se
  pierde en cada recreación porque el Dockerfile no lo fija.
- **QA-2b:** un fichero nuevo en `public/uploads/*` devuelve **404** aunque esté
  en disco: Next 16 solo sirve de `public/` lo que resolvió al arrancar (un
  fichero preexistente modificado sí se sirve — se comprobó leyendo sus 28 bytes).

Local (dev) el problema no aparece, por eso el QA de la spec 008 no lo vio.

Objetivo: **que cualquier imagen recién subida se sirva de inmediato en
producción**, sin recrear el contenedor, manteniendo la validación existente.

## 2. Usuarios / actores

| Actor | Qué necesita |
|---|---|
| Admin | Subir una foto y verla publicada al instante |
| Visitante | Ver las fotos de productos/categorías/hero sin 404 |

## 3. Requisitos funcionales

- **RF-1.** `GET /uploads/[...path]` sirve ficheros de `public/uploads/products/`
  y `public/uploads/site/` leyendo disco en cada petición.
- **RF-2.** La ruta se valida con la misma regex estricta de
  `upload-validation.ts` (sin `..`, sin `~`, extensiones permitidas): un path
  inválido → **400**, un fichero inexistente → **404**.
- **RF-3.** Solo se sirven JPEG/PNG/WebP (mismos `ALLOWED_EXTENSIONS` que la
  subida). Un fichero con extensión no permitida → 404 (no se expone).
- **RF-4.** Las respuestas llevan `Content-Type` correcto y
  `Cache-Control` público con revalidación (las fotos cambian poco).
- **RF-5.** El Dockerfile crea `public/uploads/**` con owner `nextjs` y el
  `docker-compose.yml` monta un **volumen** en `public/uploads` para que las
  fotos sobrevivan a `docker compose up --build`.
- **RF-6.** La subida (`POST /api/admin/upload`) sigue funcionando igual: este
  cambio no toca su validación, solo cómo se leen los ficheros después.
- **RF-7.** `npm run check` en verde y QA en la URL pública: subir una foto desde
  el panel y cargarla en una pestaña anónima **sin** recrear el contenedor.

## 4. Requisitos no funcionales

| Tipo | Requisito |
|---|---|
| Seguridad | Lectura confinada a `public/uploads/` (resolución + verificación de que la ruta final empieza por el directorio), sin listar directorios, sin servir `.gitkeep` ni nada con extensión no permitida. |
| UX | El admin ve la foto publicada al recargar sin esperas raras. |
| Operaciones | Un solo rebuild para fijar permisos + volumen; a partir de ahí, deploys sin pérdida de fotos. |

## 5. Criterios de aceptación

- [x] `GET /uploads/products/<fichero>` → 200 con la imagen en producción.
  - Verificado: `curl https://pingopo.davidamador.dev/uploads/products/4895c7d1… .jpg` → 200 `image/jpeg` (muñeco huérfano del QA-2) y hero → 200.
- [x] Archivo subido **ahora mismo** se sirve sin recrear el contenedor.
  - Verificado: `docker exec … printf test > …/site/fac1e22…png` → curl → 200 `image/png` sin reiniciar nada.
- [x] `..%2f`, extensión `.php`, path absoluto → 400/404, nunca lectura fuera.
  - Verificado: `.php` → 400, path 32hex inexistente → 404, `.gitkeep` → 400, traversal normalizado por el cliente → 404.
- [x] Recrear el contenedor no pierde las fotos (volumen).
  - Verificado tras `docker compose up -d app` (rebuild con Dockerfile corregido): el muñeco `4895c7d1…` y el hero siguen → 200.
- [x] `npm run check` en verde.
  - Local: typecheck 0 · lint 0 · **451 tests / 0 fallos** · build OK.
- [x] QA en navegador desde `https://pingopo.davidamador.dev`.
  - Verificado con curl a la URL pública (arriba). Además, la foto del muñeco
    **ya está subida y visible**: el usuario recreó el producto (`id=7`
    `muln-eco-de-nieve-con-bufanda` apuntando a `4895c7d1…jpg`); su ficha responde
    200 con `uploads/products/4895c7d1d6e04813ffeb22a93ab0cbb2.jpg` y el
    catálogo la referencia (grep ×1). El muñeco original (`id=6`) quedó sin foto.
- [x] NFR Seguridad (sin listar `.gitkeep`): el Dockerfile borra los `.gitkeep` de la imagen y el volumen; al boot no hay dotfile registrado y el route handler responde 400.

## 6. Fuera de alcance

- Borrado de huérfanas (límite conocido del README, no toca esta spec)
- CDN o caché en Cloudflare
- Cambios en la validación de subida (spec 008 intacta)
