# Spec: Pingo POP — Persistencia del carrito de cotización (003-quote-cart-persistence)

> Estado: **APROBADA por el usuario (5 oct 2026).** Implementada con T1–T8
> cerradas y verificadas.
> Fecha: 2026-10-05. Specs base: `001-pingo-rework` y `002-cartoon-visual`
> (ambas cerradas). Ver `plan.md` (estrategia) y `tasks.md` (estado real).

## 1. Problema

El carrito de cotización **no sobrevive a una recarga**. No es un detalle
esthetics: el usuario arma su pedido, baja al formulario, escribe sus datos y al
recargar —o al cerrar la pestaña y volver más tarde— encuentra el carrito vacío y
tiene que volver a elegir producto por producto.

Al revisar el código hay **tres defectos**, no uno. El primero es el que se ve; los
otros dos solo se despiertan cuando se arregla el primero, y por eso esta spec los
cubre en el mismo sitio.

### 1.1 El carrito se lee pero nunca se escribe

`src/context/QuoteCartContext.tsx`:

| Línea | Qué hace |
|---|---|
| 36–53 | El inicializador de `useState` **lee** `localStorage["pingo-quote-cart"]` |
| 55–74 | `addItem` → solo `setItems` |
| 76–78 | `removeItem` → solo `setItems` |
| 80–88 | `updateQuantity` → solo `setItems` |
| 90–92 | `clearCart` → solo `setItems` |

**Ningún camino de código escribe la clave.** La lectura es código muerto: siempre
encuentra `null` y devuelve `[]`. El carrito vive solo en memoria del documento, y
cualquier recarga lo destruye.

### 1.2 La lectura no valida nada (latente, se activa al arreglar 1.1)

Línea 48:

```ts
return JSON.parse(storedCart) as QuoteCartItem[];
```

Es una conversión forzada a ciegas, sin esquema. Hoy es inofensiva **porque nada
escribe**. En cuanto el carrito se persista, `localStorage` pasa a ser **entrada
externa no confiable**: el usuario lo edita desde DevTools, otro script del mismo
origen puede escribirlo, y puede quedar de una versión anterior del código. Lo que
pasa entonces:

| Contenido manipulado | Consecuencia |
|---|---|
| `{"a":1}` en vez de un array | `items.map` → **TypeError**, `/cotizacion` peta |
| `"texto"` o `42` |ídem: `.reduce`/`.map` sobre algo que no es array |
| `price: "abc"` | `Number("abc")` → `NaN` → se muestra **"NaN MXN"** |
| `quantity: 999999` | La interfaz muestra una cifra absurda; el servidor la rechaza con 400 |
| `name` ausente | Renderiza una tarjeta vacía sin nombre |

La regla del proyecto (`AGENTS.md`) es que **toda entrada externa se valida en el
borde con un esquema**, y aquí la entrada externa es precisamente el navegador del
usuario.

### 1.3 La persistencia crearía un riesgo nuevo: cotizaciones duplicadas

`src/app/cotizacion/page.tsx:226` pasa `onSuccess={() => setSubmitted(true)}` a
`QuoteCartForm`. Al enviar bien, la pantalla muestra el"Thank you"… pero **el carrito
no se vacía**: sigue lleno en memoria.

Hoy eso no importa porque un F5 lo borra. **Con persistencia, no**: tras enviar la
solicitud, el usuario recarga, ve su carrito intacto y puede volver a enviarlo. Cada
reenvío crea filas nuevas en `QuoteRequest` que el administrador tiene que
descartar a mano. Arreglar la persistencia sin tocar esto **crea** el bug.

## 2. Objetivo

Que el carrito sobreviva a una recarga y a un cierre del navegador, y que su
contenido se trate como entrada no confiable validada con esquema. Sin regresiones
en la cotización ya implementada y sin dependencias nuevas.

## 3. Decisiones bloqueadas (con su porqué)

- **D1 — `localStorage`, misma clave `pingo-quote-cart`.** No cookies ni sesión de
  servidor. Lo que se guarda son productos del catálogo público: no hay datos
  personales ni nada que un atacante quiera stealing de ahí. *Alternativa
  descartada:* persistir el carrito en la base de datos ligado a la sesión. Obliga a
  esquema nuevo, endpoint, migraciones, caducidad de carritos y limpieza: desproporcionado
  para un carrito de cotización.
- **D2 — Se guarda el array tal cual, sin envoltorio de versión.** El carrito es
  **desechable**: en el peor caso el usuario vuelve a añadir cuatro productos. No
  hay datos que migrar ni dinero de por medio. *Alternativa descartada:*
  `{ v: 1, items: [...] }` con ruta de migración. Añade código para un escenario que
  no cuesta nada. **Consecuencia aceptada y documentada:** si algún día
  `QuoteCartItem` gana un campo obligatorio, los carritos ya guardados fallarán la
  validación y empezarán vacíos. Es la degradación pretendida, y es inocua.
- **D3 — Toda la lógica de leer, validar y serializar vive en un módulo puro
  `src/lib/quote-cart-storage.ts`, sin DOM.** Motivo: el runner es
  `node --import tsx --test`, **sin jsdom** y sin React Testing Library. Una lógica
  que solo vive dentro de un `useEffect` es imposible de testear ahí. Con el módulo
  puro, la parte interesante se testea; en el contexto queda un efecto de tres
  líneas.
- **D4 — Validación estricta con Zod, con los mismos límites que el servidor.**
  `src/lib/quote-schema.ts` ya acepta cantidad entera `1..10000` y máximo `50`
  productos. El cliente valida igual, para no poder construir un carrito que la API
  vaya a rechazar. Se añade un tope de **64 KiB** antes de `JSON.parse` para no
  analizar entradas patológicas.
- **D5 — La escritura ocurre en un `useEffect` sobre `[items]` con una sola regla:**
  si está vacío → `removeItem`; si no → `setItem`. Es idempotente y **se
  auto-repara**: una entrada corrupta se sobrescribe con el estado válido vacío. Así
  no hace falta un flag "saltar el primer render". Todo dentro de `try/catch`: en
  modo privado de Safari o con la cuota llena, `setItem` **lanza**, y eso no puede
  romper la página.
- **D6 — Vaciar el carrito tras enviar la solicitud con éxito.** Sin esto, la
  persistencia convierte un F5 en una solicitud duplicada (§1.3). Se hace en la
  página, junto a `setSubmitted(true)`, y **no** dentro del formulario: el formulario
  no debe conocer el carrito para poder reutilizarse.
- **D7 — Sin sincronización entre pestañas ni caducidad del carrito guardado.** El
  evento `storage` es una funcionalidad nueva, no un arreglo de este bug. Queda
  anotado como mejora posterior.

## 4. Diseño

### 4.1 Qué se persiste

El array `QuoteCartItem[]` tal como ya está definido: `id`, `name`, `slug`,
`price`, `image`, `quantity`. **No se cambia el tipo** (eso sería un rewrite). El
campo `image` se guarda aunque hoy la tarjeta del carrito no lo pinte: es una ruta
pública bajo `public/uploads/products/`, no información sensible, y descartarlo sería
perder información que ya existe.

### 4.2 Lectura: entrada no confiable

```
localStorage["pingo-quote-cart"]
   ↓  null / vacío           → []
   ↓  > 64 KiB               → []   (sin analizar)
   ↓  JSON inválido          → []
   ↓  no es un array         → []
   ↓  Zod: ¿cumple?          → [] si falla cualquier elemento
   └                        → array validado
```

Cualquier fallo **vacía el carrito y borra la clave**. Es la decisión clave: un
carrito corrupto no puede impedir que el usuario use la web.

### 4.3 Escritura

```
items cambia
   ↓  ¿items.length === 0?  → removeItem(STORAGE_KEY)
   └  no                     → setItem(STORAGE_KEY, serializeCart(items))
   ↓  ambos dentro de try/catch → si lanza (cuota, modo privado), la app sigue en memoria
```

### 4.4 Tras enviar

`handleSubmit` → respuesta 201 → `onSuccess()` → la página hace `setSubmitted(true)`
**y `clearCart()`**. El efecto de §4.3 ve el carrito vacío y borra la clave sola.

### 4.5 Qué cambia y dónde

| Fichero | Cambio |
|---|---|
| `src/lib/quote-cart-storage.ts` | **Nuevo.** Esquema Zod, `parseStoredCart`, `serializeCart`, `STORAGE_KEY` |
| `src/context/QuoteCartContext.tsx` | Importa el módulo; el inicializador usa `parseStoredCart`; añade el `useEffect` de §4.3 |
| `src/app/cotizacion/page.tsx` | `clearCart()` junto a `setSubmitted(true)` |
| `tests/quote-cart-storage.test.ts` | **Nuevo.** Tests del módulo puro |
| `docs/THREATS.md` | Una fila: almacenamiento del cliente = entrada no confiable |
| `README.md`, `MEMORY.md`, `CHANGELOG.md` | Estado real (el límite conocido desaparece) |

## 5. Alcance

**Dentro:** persistencia del carrito en cliente, validación de lo persistido,
vaciado tras envío successful, tests del módulo puro, documentación.

**Fuera, y por qué:**

| Fuera | Motivo |
|---|---|
| Sincronización entre pestañas (evento `storage`) | Función nueva, no es este bug (D7) |
| Extraer `addItem`/`removeItem`/etc. a funciones puras testeables | Sería lo ideal para testear, pero es refactor de código que **no cambia**; esta spec no reescribe |
| Impedir añadir el producto n.º 51 o la cantidad 10001 en caliente | El cliente lo permite hoy y el servidor lo rechaza con 400. Es un límite preexistente y separate |
| Cambios en el envío, la API, la base de datos o la autenticación | La cotización ya funciona; no se toca |
| Dependencias nuevas | `zod` ya está instalada. **Cero dependencias** |
| Cambios visuales | El carrito ya tiene el lenguaje cartoon de la spec 002 |

## 6. Requisitos (EARS)

- **RF-1** (Ubicuo): Cada cambio del carrito —alta, cantidad, borrado o vaciado—
  se escribirá en `localStorage` bajo la clave `pingo-quote-cart`.
- **RF-2** (Evento): WHEN el usuario recargue la página, o cierre y vuelva a abrir
  el navegador, THEN el carrito se mostrará con los mismos productos y cantidades.
- **RF-3** (Ubicuo): El contenido leído de `localStorage` se validará con un esquema
  Zod antes de entrar en el estado de React. Nunca habrá una conversión forzada a
  ciegas.
- **RF-4** (No deseado): IF el contenido almacenado no cumple el esquema —no es un
  array, falta un campo, `quantity` es 0, negativa, decimal o mayor de 10000, hay más
  de 50 productos, o el JSON está corrupto— THEN el carrito se mostrará vacío y la
  entrada se borrará de `localStorage`, sin error visible para el usuario.
- **RF-5** (No deseado): IF la cadena almacenada supera 64 KiB, THEN se descartará
  sin intentar analizarla.
- **RF-6** (No deseado): IF el almacenamiento no está disponible o lanza al
  escribir —modo privado, cuota excedida, `localStorage` deshabilitado— THEN la
  aplicación seguirá funcionando solo en memoria, sin error visible.
- **RF-7** (Evento): WHEN el carrito queda vacío, THEN la clave se eliminará de
  `localStorage` en vez de guardar un array vacío.
- **RF-8** (Evento): WHEN una solicitud de cotización se envíe con éxito, THEN el
  carrito se vaciará y su entrada persistida se eliminará.
- **RF-9** (No deseado): IF alguien manipula `localStorage`, THEN no podrá alterar
  lo que se guarda en la base de datos: `POST /api/quotes` solo acepta `productId` y
  `quantity`, los revalida con `CreateQuoteSchema` y los precios los lee del catálogo.
  Como mucho puede alterarse el **total estimado que ve el propio usuario**.
- **RF-10** (Ubicuo): Los límites de la validación del cliente coincidirán con los
  del servidor: cantidad entera entre 1 y 10000, máximo 50 productos.
- **RF-11** (Ubicuo): La lógica de lectura, validación y serialización vivirá en
  `src/lib/quote-cart-storage.ts`, sin acceso al DOM, y estará cubierta por tests en
  `tests/`.
- **RF-12** (Ubicuo): No se añadirá ninguna dependencia. Se reutilizará `zod`.
- **RF-13** (Ubicuo): Ningún cambio afecta la lógica de envío, la API, el esquema de
  base de datos, la autenticación ni el diseño visual.

## 7. Amenazas (la frontera nueva es el navegador del usuario)

Con la persistencia, `localStorage` pasa a ser el límite de confianza que hasta
ahora no existía. Solo hay un activo en juego y no es dinero:

| # | Amenaza | Impacto | Mitigación |
|---|---|---|---|
| 1 | **Manipulación**: editar `localStorage` con DevTools | El usuario falsea su propia cotización | **RF-9**: el servidor ignora `price`/`name` del cliente. **RF-4**: contenido imposible de renderizar |
| 2 | **Robo de cita ajena**: modificar el carrito de otro usuario | Sin efecto | El carrito es local. No se cruza con ninguna cuenta |
| 3 | **Denegación local**: guardar 5 MB o un JSON anidado profundo | Ralentiza la página al leer | **RF-5**: tope de 64 KiB antes de `JSON.parse` |
| 4 | **Robo de datos desde el navegador**: otro script del mismo origen lee la clave | Expone productos del catálogo público | El contenido no es sensible (D1). Mitigación real: CSP y SameSite, ya cubiertos por el resto del modelo |
| 5 | **Manipulación que rompa la página**: `{"a":1}` en la clave | TypeError en `/cotizacion` | **RF-3/RF-4**: se valida y se descarta |
| 6 | **Inyección de HTML** vía `item.name` | XSS | Ninguna: JSX escapa el texto por interpolación y no se usa `dangerouslySetInnerHTML`. **No se cambia** |

Lo que **no** se agrava: cotizaciones duplicadas por persistencia (→ RF-8), fuga de
secretos (el carrito no contiene ninguno), escalada de privilegios (no toca auth).

## 8. Testing (test-first, antes de implementar)

Regla del proyecto: **el test se escribe antes que el código y se ve fallar.** El
runner es `node --import tsx --test`, sin DOM, así que todo lo comprobable tiene que
estar en el módulo puro.

`tests/quote-cart-storage.test.ts`:

| Caso | Entrada | Esperado |
|---|---|---|
| Array válido | 1 y 3 items correctos | se devuelve tal cual |
| Sin datos | `null` | `[]` |
| JSON corrupto | `{{{` | `[]` |
| No es un array | `{"a":1}`, `"texto"`, `42` | `[]` |
| Campo ausente | item sin `name` | `[]` |
| Cantidad 0 / negativa / decimal | `0`, `-3`, `1.5` | `[]` |
| Cantidad excesiva | `10001` | `[]` |
| Demasiados productos | 51 items | `[]` |
| `image` inválido | `image: 42` | `[]` |
| `image: null` | válido | se acepta |
| Entrada enorme | > 64 KiB | `[]` |
| Ida y vuelta | `parse(serialize(x))` | `x` |
| Serializar vacío | `serialize([])` | `"[]"` |

Lo que **no** cubre un test automático y hay que verificar a mano en el navegador:
el `useEffect` de escritura, la recarga con el carrito ya escrito, y el vaciado tras
enviar. Se documenta en `tasks.md` como pasos manuales con su resultado.

## 9. Criterios de aceptación

1. `npm run check` en verde: typecheck, lint, tests (82 actuales + los nuevos) y
   build.
2. El test nuevo **se ve fallar** antes de existir la implementación, y pasa después.
3. Manual: añadir productos → recargar → **siguen ahí** con sus cantidades.
4. Manual: enviar la solicitud → recargar → el carrito está **vacío** (RF-8).
5. Manual: con DevTools, poner `pingo-quote-cart` = `{"a":1}` → recargar → la página
   `/cotizacion` **funciona** y muestra el carrito vacío (RF-4).
6. Manual: con la clave puesta a 999999999 caracteres → la página carga igual (RF-5).
7. `git status --porcelain -uall` no muestra nada nuevo inesperado antes del commit.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Romper el carrito que ya funciona | El cambio es 1 efecto + 1 import; los 82 tests actuales deben seguir verdes sin tocarlos |
| Validación demasiado estricta y carritos legítimos rechazados | Los límites son los del servidor; un carrito válido nunca se rechaza |
| `localStorage` lleno en el dispositivo del usuario | Se guarda un array pequeño; RF-6 evita que eso rompa la página |
| Que la escritura pise el carrito recién leído | La escritura va en un efecto y serializa el mismo estado que leyó: idempotente |
| Que el `useEffect` escriba durante el render de servidor | Los efectos no corren en servidor; la lectura ya está tras `typeof window` |
| Empeorar el código con una dependencia, un ORM o una librería de estado | RF-12 lo prohíbe; `zod` ya está instalada |

## 11. Documentación a actualizar en la misma entrega

| Fichero | Cambio |
|---|---|
| `docs/THREATS.md` | Fila nueva en el punto de entrada no confiable: almacenamiento del cliente validado con Zod |
| `README.md` | Desaparece el límite conocido del carrito; se menciona la persistencia |
| `MEMORY.md` | Estado: spec 003 cerrada; quitar el bug de "límites conocidos" |
| `CHANGELOG.md` | Entrada en `[Sin publicar]` |
| `docs/SDD.md` | §5 (arquitectura) y §9 (testing) mencionan el módulo puro nuevo |