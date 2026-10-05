# Modelo de Amenazas - Pingo POP

> STRIDE + amenazas IA/LLM. Proyecto: Next.js 16.3.8 + TypeScript + Prisma 7 + MariaDB/MySQL.
> Fecha: 2026-10-03. Estado: tras el rework de roles, autenticacion y subida de imagenes.

## 1. Alcance

- Sistema: tienda Pingo POP, catalogo publico, cotizaciones y panel de administracion.
- Dentro: aplicacion, endpoints, autenticacion, autorizacion, subida de imagenes, cabeceras.
- Fuera: la configuracion del servidor MySQL, el hosting y la red. Se documentan como
  recomendaciones, no como controles verificados.

## 2. Activos

| # | Activo | Tipo | Criticidad | Donde vive |
|---|---|---|---|---|
| A1 | Usuarios y roles (email, hash, rol) | Identidad | Critica | `User` en MariaDB |
| A2 | Productos y categorias | Datos | Alta | `Product`, `Category` |
| A3 | Cotizaciones (nombre, email, telefono) | Datos/PII | Alta | `QuoteRequest` |
| A4 | Imagenes subidas | Archivos | Media | `public/uploads/products/` |
| A5 | Sesiones | Credencial | Critica | Cookie `pp_session`, firmada con HMAC |
| A6 | Secretos (`SESSION_SECRET`, `DATABASE_URL`) | Credencial | Critica | `.env`, fuera del repositorio |

## 3. Puntos de entrada

| # | Punto | Quien | Autenticado | Comprobado en |
|---|---|---|---|---|
| E1 | `GET /api/products` | Publico | No | Lectura de catalogo |
| E2 | `POST\|PUT\|DELETE /api/products` | Admin | Si, rol ADMIN | `requireAdmin()` |
| E3 | `GET /api/categories` | Publico | No | Filtros del catalogo |
| E4 | `POST /api/categories` | Admin | Si, rol ADMIN | `requireAdmin()` |
| E5 | `POST /api/quotes` | Publico | No | Rate limit + Zod |
| E6 | `POST /api/admin/upload` | Admin | Si, rol ADMIN | `requireAdmin()` |
| E7 | `POST /api/auth/login` | Publico | No | Rate limit + argon2 |
| E8 | `/admin/*` | Admin | Si, rol ADMIN | Middleware + comprobacion en pagina |

## 4. Amenazas STRIDE por activo

### A1 Usuarios, roles y sesiones

| STRIDE | Amenaza | Impacto | Prob | Control | Riesgo residual |
|---|---|---|---|---|---|
| S | Suplantar a un admin con una cookie falsificada | Critica | Alta | Cookie firmada con HMAC-SHA256 y `exp` | Bajo |
| T | Cambiar el rol o la contrasena desde la API | Critica | Alta | Escrituras exige `requireAdmin()` | Bajo |
| R | Acciones sin trazabilidad | Alta | Alta | Sin registro de auditoria | **Alto** |
| I | Enumerar cuentas por mensaje o por tiempo | Critica | Media | Mismo 401 siempre; hash ficticio si el email no existe | Bajo |
| I | Filtrar el hash en una respuesta de error | Critica | Baja | `select` acotado; `console.error` sin objetos de usuario | Bajo |
| D | Forzar bruta contra el login | Alta | Alta | Rate limit por IP (10 / 15 min) | Medio (en memoria) |
| E | Escalar de comprador a administrador | Critica | Alta | Rol dentro del token firmado; el cliente no lo elige | Bajo |

**Nota sobre el limitador.** Vive en un `Map` del proceso. Con una sola instancia es
correcto; con varias, cada una lleva su cuenta y el tope se multiplica. Migrarlo a
Redis o a la base de datos es trabajo pendiente, no un detalle menor.

### A2 Productos y categorias

| STRIDE | Amenaza | Impacto | Prob | Control | Riesgo residual |
|---|---|---|---|---|---|
| S/T/E | CRUD anonimo | Critica | Alta | `requireAdmin()` en POST/PUT/DELETE | Bajo |
| T | Inyeccion SQL | Critica | Alta | Prisma parametrizado; el admin no concatena SQL | Bajo |
| T | `slug` con path traversal o HTML | Alta | Media | Regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Bajo |
| I | Inyectar contenido en un campo de texto | Media | Media | Se rechazan caracteres de control | Bajo |
| D | Llenar la tabla con peticiones | Alta | Media | Rate limit (5 / 15 min) en cotizaciones | Bajo |

### A4 Imagenes subidas

| STRIDE | Amenaza | Impacto | Prob | Control | Riesgo residual |
|---|---|---|---|---|---|
| T | Subir un script y que se sirva como documento | Critica | Alta | Lista blanca JPEG/PNG/WebP; SVG y HTML excluidos | Bajo |
| T | Content-Type fraudulento (HTML como `.jpg`) | Critica | Alta | Se comparan los magic bytes con el tipo declarado | Bajo |
| T | Path traversal en el nombre | Critica | Alta | El nombre original se descarta; se genera con `randomBytes(16)` | Bajo |
| T | Sobrescribir un archivo existente | Media | Baja | `writeFile` con `flag: "wx"` | Bajo |
| I | Servir un archivo fuera de la carpeta | Critica | Baja | Nombre generado, sin separadores; esquema restringe a `/uploads/products/<32 hex>.<ext>` | Bajo |
| D | Subir un archivo enorme | Alta | Media | Limite de 5 MB antes de leer en memoria | Bajo |
| E | Colocar codigo ejecutable en el dominio | Critica | Baja | Sin SVG ni HTML: no hay documento activo | Bajo |

**Nota sobre `randomBytes`.** Un nombre de 16 bytes aleatorios no es un control de
acceso: quien conozca la URL puede leer el fichero. Es una medida de *no adivinar* y de
*no colisionar*. Si el catalogo dejara de ser publico habria que mover las imagenes
fuera de `public/` y servirlas con comprobacion de permiso.

### A3 Cotizaciones

| STRIDE | Amenaza | Impacto | Prob | Control | Riesgo residual |
|---|---|---|---|---|---|
| T | Forzar un `productId` inexistente | Baja | Media | Clave foranea; error 500 controlado | Bajo |
| D | Inundar el endpoint publico | Alta | Media | Rate limit por IP | Bajo |
| I | Exponer datos de contacto | Alta | Baja | El endpoint solo devuelve lo que el remitente acaba de enviar | Bajo |

### A5 Carrito guardado en el navegador (spec 003)

El carrito vive en `localStorage`, asi que **el cliente controla su contenido**: se
puede editar con las herramientas de desarrollo, dejar una entrada de una version
anterior o simplesmente quedar corrupta. Antes de la spec 003 esto no existia (el
carrito vivia solo en memoria y se perdia al recargar); ahora es una frontera de
confianza real.

| STRIDE | Amenaza | Impacto | Prob | Control | Riesgo residual |
|---|---|---|---|---|---|
| T | Alterar precios o nombres del carrito | **Nulo** | Alta | `POST /api/quotes` solo acepta `productId` y `quantity`, los revalida con `CreateQuoteSchema` y el precio lo lee del catalogo | Nulo |
| T | Romper la pagina con contenido invalido | Media | Media | `parseStoredCart` valida con Zod y ante cualquier fallo devuelve un carrito vacio, en vez de propagar el error | Bajo |
| D | Guardar una entrada enorme para ralentizar | Baja | Media | Tope de 64 KiB **antes** de `JSON.parse` | Bajo |
| T | Colocar una ruta de imagen ajena en el carrito | Media | Baja | Se reutiliza `imagePath` de `validation.ts`: solo `/uploads/products/<32 hex>.<ext>` | Bajo |
| E | Convertir el carrito en codigo ejecutable | **Nulo** | Baja | Los textos se pintan por interpolacion de JSX, que escapa; no hay `dangerouslySetInnerHTML` | Nulo |

**Lo que este control NO cubre, y hay que decir.** El limite de cantidad y de numero
de productos se respeta al **leer** el carrito, no al construirlo: se puede anadir un
producto 51 en caliente y el servidor lo rechaza con 400. Es un limite preexistente,
no de la spec 003.

**Nota sobre el vaciado.** El carrito se borra cuando la solicitud se envia con
exito. Sin eso, la persistencia permitiria reenviar la misma cotizacion cuantas veces
se recargue la pagina, y el administrador recibiria solicitudes duplicadas que
nadie puede distinguir de verdad.

## 5. Estado de las mitigaciones priorizadas

| # | Mitigacion | Estado | Donde |
|---|---|---|---|
| 1 | Auth + RBAC en servidor | Hecho | `requireAdmin()` en cada escritura; el middleware no es la unica barrera |
| 2 | Hash argon2id y cookie firmada | Hecho | `password.ts`, `session-token.ts` |
| 3 | Autorizacion por recurso | Hecho | Sin recurso por propietario: todo el CRUD admin es global |
| 4 | Validacion en el borde con Zod | Hecho | `validation.ts`, `quote-schema.ts` |
| 5 | Rate limiting | Hecho, limitado | `rate-limit.ts`, en memoria por proceso |
| 6 | Subida segura de imagenes | Hecho | `upload-validation.ts`, `upload.ts`, `POST /api/admin/upload` |
| 7 | Cabeceras de seguridad | Hecho | `next.config.ts`, 9 cabeceras |
| 8 | Sin enumeracion de cuentas | Hecho | Mismo 401 y hash ficticio cuando el email no existe |
| 9 | Sin secretos en el codigo | Hecho | `env.ts` parsea `DATABASE_URL`; no hay `root` ni contrasenas en el fuente |
| 10 | Registro de auditoria | **Pendiente** | No hay log de accesos ni de cambios administrativos |

## 6. Amenazas especificas de IA

El proyecto no usa un LLM en produccion. Se deja constancia de los riesgos que
aparecerian si se añadiera un asistente para redactar descripciones o atender
cotizaciones, porque es la extension natural del proyecto:

| # | Amenaza | Mitigacion prevista |
|---|---|---|
| A7 | Inyeccion indirecta: texto del catalogo manipula al modelo | Tratar el contenido de la BD como no confiable; delimitar y validar la salida |
| A8 | Fuga de datos por la ventana de contexto | Anonimizar PII antes de enviar; inventario de lo que sale del servidor |
| A9 | Alucinaciones en medidas, precios o plazos | Prohibir que el modelo invente datos comerciales; que solo reformule |
| A10 | Permisos heredados del sistema | La autorizacion la decide `requireAdmin()`, nunca el modelo |
| A11 | Coste y disponibilidad | Limite de peticiones por sesion y circuit breaker |

## 7. Verificacion

Cada fila dice como se comprobo y que se obtuvo. `npm run` se ejecuta en la raiz del
proyecto.

| Control | Como verificar | Resultado |
|---|---|---|
| Tipos | `npm run typecheck` | Sin errores |
| Lint | `npm run lint` | Sin errores ni avisos |
| Pruebas | `npm test` | 65 pruebas, 65 correctas |
| Compilacion | `npm run build` | Compila; 15 rutas |
| Firma de sesion | `tests/session-token.test.ts` | 13 pruebas, incluida la falsificacion de payload |
| Validacion de imagenes | `tests/upload-validation.test.ts` | 11 pruebas, incluido HTML disfrazado de JPEG |
| Esquemas de entrada | `tests/validation.test.ts` | 29 pruebas, incluido path traversal |
| Rate limit | `tests/rate-limit.test.ts` | 12 pruebas |
| Cookie falsificada en el navegador | Peticion a `/admin/productos` con cookie base64 crafted | 307 a `/login` |
| API sin sesion | POST a products, categories, upload | 401 en las tres |
| API con cookie falsificada | Igual, con cookie `role: ADMIN` sin firma | 401 en las tres |
| Rate limit en vivo | 12 POST seguidos al login | 429 a partir del intento 9 |
| Cabeceras | `Invoke-WebRequest http://localhost:3010/login` | Las 9 presentes |
| Base de datos caida | Login con la base de datos inalcanzable | 503 con `Retry-After`, no 500 |
| Secretos en el codigo | Busqueda de contrasenas y URLs de BD en `src/`, `prisma/`, `scripts/` | Ninguna, salvo datos de prueba en los tests |
| Dependencias | `npm audit --audit-level=high` | Ver seccion 8 |

## 8. Pendiente conocido

Nada de esto esta resuelto. Se deja escrito para que no se pierda.

1. **Registro de auditoria.** No se guarda quien creo, edito o elimino un producto, ni
   los intentos de login. Es el riesgo mas alto que queda abierto.
2. **Limitador en memoria.** Con mas de una instancia el tope se multiplica.
3. **`braces` sin parche.** `GHSA-vfj7-8cjw-p6xm` afecta a `<=3.0.3` y 3.0.3 es la ultima
   version publicada: no hay version corregida. Llega por `eslint-config-next` y solo
   afecta a `npm run lint`.
4. **`deepmerge-ts` sin parche utilizable.** `GHSA-ggr8-5vv4-36mx` se corrige en `8.0.0`,
   pero `@prisma/config` fija `7.1.5`. Forzar la 8 obliga a validar que
   `prisma migrate` siga funcionando. Afecta solo a la CLI.
5. **`mariadb` e `mysql2`.** Se fijaron por `overrides` a `3.4.7` y `3.24.5`, las
   ultimas corregidas. Sin esto habria 14 vulnerabilidades altas, incluida RCE sin
   autenticar en Next.js.
6. **CSP con `unsafe-inline`.** Next inyecta scripts en linea para hidratar. Se quita
   cuando exista una capa de nonces.
7. **Imagenes en `public/`.** Servidas sin control de acceso. Vale para un catalogo
   publico; no vale para material privado.
8. **Usuario de base de datos.** Se recomienda uno dedicado con permisos minimos en vez
   de `root`. Configuracion del servidor, fuera de este repositorio.
