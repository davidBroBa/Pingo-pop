# Tasks: Pingo POP — Persistencia del carrito de cotización (003-quote-cart-persistence)

> Spec **aprobada** por el usuario (5 oct 2026). Cada tarea indica los RF que
> cubre y el comando o la medida con la que se verificó. Los **82 tests
> originales no se tocaron**: siguen pasando.

- [x] **T1** — Spec aprobada y registrada. *(—)*
  Verificado: aprobación del usuario; `MEMORY.md` con la fase y el resumen.
- [x] **T2** — `tests/quote-cart-storage.test.ts` con los casos de la spec §8,
  **escritos y ejecutados antes que el módulo**. *(RF-3, RF-4, RF-5, RF-10)*
  Verificado: `npm run test` → `Error: Cannot find module
  '../src/lib/quote-cart-storage'`, **exit 1**, 82 pass / 1 fail. Rojo real antes
  de implementar.
- [x] **T3** — `src/lib/quote-cart-storage.ts`: esquema Zod con los límites del
  servidor, `parseStoredCart`, `serializeCart`, `STORAGE_KEY`, tipo inferido del
  esquema. *(RF-3, RF-4, RF-5, RF-10, RF-11)*
  Verificado: `npm run test` → **107/107**, 13 suites, exit 0.
  **Desviación de la spec, y por qué:** en vez de duplicar la expresión regular de
  la ruta de imagen, se **exportan** `shortText`, `slugText` e `imagePath` de
  `src/lib/validation.ts` (tres palabras, sin cambio de comportamiento) y el carrito
  los reutiliza. Así el formato de ruta no puede divergir del del admin.
- [x] **T4** — `QuoteCartContext.tsx`: el inicializador usa `parseStoredCart` en
  `try/catch` y se añade el `useEffect` de escritura. Los mutadores intactos.
  *(RF-1, RF-2, RF-6, RF-7)*
  Verificado: `npm run typecheck` y `npm run lint` exit 0. `git diff` del fichero:
  solo el import, el tipo, el inicializador y el efecto. Los cuatro mutadores no
  aparecen en el diff.
- [x] **T5** — `cotizacion/page.tsx`: `clearCart()` junto a `setSubmitted(true)`.
  El formulario no se toca. *(RF-8)*
  Verificado: `git diff src/app/cotizacion/page.tsx` → un solo `onSuccess`
  cambiado. `QuoteCartForm.tsx` sin cambios.
- [x] **T6** — Gates completos: `npm run check`. *(RF-1 a RF-13)*
  Verificado: **exit 0** — typecheck OK, lint OK, **107/107 tests en 13 suites**,
  build OK con las 15 rutas.
- [x] **T7** — Verificación manual en navegador. *(RF-1, RF-2, RF-4, RF-5, RF-7,
  RF-8)* — detalle abajo.
- [x] **T8** — Documentación: `docs/THREATS.md` (nueva sección A5), `docs/SDD.md`
  (§5 y §9), `README.md`, `MEMORY.md`, `CHANGELOG.md`. *(RF-13)*
  Verificado: `npm run check` en verde tras los cambios.
- [x] **T9** — **H2 cerrado**: el error de hidratación de `/cotizacion`. La carga
  del carrito pasa del inicializador de `useState` a un `useEffect`, así el
  servidor y la primera hidratación pintan ambos el carrito vacío. Detalle abajo.

## T7 en detalle (medido, no supuesto)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Agregar un producto y leer la clave | Escribe `[{"id":1,...,"price":"35","image":null,"quantity":1}]` |
| 2 | Ir a `/cotizacion` y recargar | El carrito **sigue ahí** con su cantidad (RF-2) |
| 3 | Pulsar "+" y recargar | La cantidad **conserva** el valor (RF-1) |
| 4 | "Vaciar cotización" | Carrito vacío y **clave eliminada**; tras recargar, sigue vacía (RF-7) |
| 5 | Enviar la solicitud | "¡Tu cotización fue enviada!" y **clave eliminada**; tras recargar, carrito vacío (RF-8) |
| 6 | Clave = `{"a":1}` | Página normal, carrito vacío, clave eliminada |
| 7 | Clave = `"hola"` / `42` / `{{{` | Página normal, carrito vacío, clave eliminada |
| 8 | Clave con `quantity: 999999` | Rechazado: carrito vacío, clave eliminada |
| 9 | Clave con `price: "abc"` | Rechazado. **Cero "NaN" en pantalla** |
| 10 | Clave con **51** productos | Rechazado: carrito vacío |
| 11 | Clave con `name` con carácter de control | Rechazado |
| 12 | Clave con `image` externa (`https://otro/x.jpg`) | Rechazado |
| 13 | Clave de **70 000 caracteres** (> 64 KiB) | Rechazada sin analizar; página normal |
| 14 | Consola del navegador | **Con carrito guardado: `Error: Hydration failed`** (ver H2, **arreglado en T9**). **Sin carrito guardado: sin errores**, solo el aviso preexistente del logo |

### Corrección de T7#14: mi primera medición fue falsa

La primera vez que leí la consola el `localStorage` ya estaba **vacío** (lo había limpiado
al terminar la prueba 4), así que di "sin errores". Con el carrito **guardado** sí hay un
error, y es systematico. Medido a conciencia:

| Escenario | Consola |
|---|---|
| `/cotizacion` con carrito en `localStorage` | **`Error: Hydration failed because the server rendered HTML didn't match the client`**, en `src/app/cotizacion/page.tsx:112` |
| `/cotizacion` sin carrito | Sin errores (solo el aviso del logo y el de React DevTools) |

React avisa de que **"this tree will be regenerated on the client"**: descarta el HTML del
servidor para ese subárbol y lo vuelve a pintar. La causa es la que el propio mensaje de
React enumera: *`if (typeof window !== 'undefined')`*. El servidor prerenderiza
`/cotizacion` con el carrito vacío; en cuanto el cliente hidrata con el carrito guardado,
las dos ramas no coinciden.

Esto **no lo introdujo el `clearCart()`** (T5): lo introduce la persistencia (T4). Y es
peor de lo que decía H2 antes de medirlo: no es un instante de carrito vacío, es una
excepción en la consola y un renderizado desperdiciado en cada visita de quien tenga
carrito. **Arreglado en T9**; el razonamiento del arreglo está en esa tarea.

**Aprendizaje sobre el método:** dos lecturasmida"la clave sigue ahí" y "el carrito
aparece vacío" eran **carreras de medición**, no fallos: `browser.navigate` devuelve
antes de que React hidrate, y el HTML del servidor siempre lleva el carrito vacío.
Repetido con espera dentro de la página (`requestAnimationFrame`), el borrado de la
clave corrupta ocurre a los **0 ms**. Queda registrado porque volverá a pasar.

## T9 en detalle — cerrar H2 sin convertirlo en un refactor

**El fallo:** T4 metió `parseStoredCart(localStorage.getItem(...))` en el
inicializador de `useState`. El inicializador corre en el servidor **y** en el
cliente, así que el HTML estático de `/cotizacion` se generaba con el carrito
vacío y la hidratación cliente llegaba con el carrito real. React no puede
arreglar eso: detecta la diferencia, avisa y **regenera el subárbol entero**,
tirando el trabajo de renderizado del servidor.

**El arreglo (dos estados, un guard):**

| | Antes (T4) | Ahora (T9) |
|---|---|---|
| Estado inicial | `useState(() => parseStoredCart(...))` | `useState([])` + `useState(false)` para `cargado` |
| Dónde se lee el almacenamiento | en el inicializador, o sea **antes** del primer render | en un `useEffect` de montaje, o sea **después** |
| Escritura | `useEffect` sobre `[items]` | igual, **pero solo si `cargado`** |
| Resultado en el servidor | lee `localStorage` inexistente | nunca lo toca |
| Resultado en la 1ª hidratación | carrito real, distinto del servidor | **carrito vacío = servidor** |

El `if (!cargado) return` en el efecto de escritura **no es opcional**: sin él, el
efecto vería el `items = []` del primer render y borraría la clave antes de que el
efecto de lectura la alcanzase. Es el detalle que convierte "arreglo el error de
hidratación" en "rompo la persistencia".

**Lo que este arreglo NO arregla, y hay que decirlo:** sigue haber un fotograma
con el mensaje de carrito vacío antes de que aparezca el real. Es
**intrínseco**: los datos viven en el navegador y el servidor no puede
conocerlos. `useSyncExternalStore` tampoco lo evitaría (su
`getServerSnapshot` devuelve `[]` durante la hidratación). Lo que sí se elimina
es la excepción y el repintado completo.

**Sin test automatizado, y por qué:** este cambio es de *planificación* de
efectos en un componente de React. El runner es `node:test` sin jsdom, así que
renderizar el provider no es posible; `quote-cart-storage.ts` no cambia, y sus 107
tests siguen cubriendo la lógica. La verificación es la que detectó el fallo:
medición en navegador.

**Deuda que se anota en vez de pagar:** ESLint bloquea `setState` síncrono dentro
de un efecto (`react-hooks/set-state-in-effect`). Se silenció **con el motivo
escrito en el propio sitio**: la regla busca estado *derivado* de props u otro
estado, que se resuelve en el render; aquí se lee un almacén externo mutable que
solo existe en el navegador. La alternativa correcta es `useSyncExternalStore`,
pero exige convertir el carrito en un store externo y reescribir los cuatro
mutadores para que notifiquen. Es un refactor de ~50 líneas en el fichero que
acabo de verificar a mano; no cabía en "terminar la spec" sin arriesgar una
regresión silenciosa. Queda anotado en `MEMORY.md` y conviene hacerlo cuando la
spec de H1 toque este mismo fichero.

### Verificación de T9 (navegador, desde el estado que un usuario real tendría)

| # | Prueba | Resultado |
|---|---|---|
| 1 | Cargar `/cotizacion` con carrito en `localStorage` | Carrito visible y **consola sin errores** |
| 2 | Recarga en frío | Sigue visible, **consola sin errores** |
| 3 | Clave corrupta `{"a":1}` | Página normal, carrito vacío, **clave eliminada**, sin errores |
| 4 | Agregar desde `/products/pin-personalizado` | Escribe `[{"id":1,...,"quantity":1}]` |
| 5 | `/cotizacion` → "Vaciar cotización" | Carrito vacío y **clave eliminada** |
| 6 | Recarga tras vaciar | Sigue vacío, **clave eliminada**, sin errores |

Gates: `npm run check` → **exit 0**, 107/107 tests, build con 15 rutas.

| RF | Cubierto por |
|---|---|
| RF-9 (el servidor ignora lo que el cliente manipula) | **Verificado, no implementado**: ya es cierto. `POST /api/quotes` solo acepta `productId` y `quantity`, los revalida con `CreateQuoteSchema` y los precios los lee del catálogo. Documentado en `docs/THREATS.md` §A5 con impacto **Nulo** |
| RF-11 (módulo puro testeable) | T2 + T3 |
| RF-12 (cero dependencias) | T3: se reutiliza `zod`; `package.json` sin cambios |
| RF-13 (nada más cambia) | T6: los 82 tests originales y el build siguen verdes sin tocar sus ficheros |

## Hallazgos: uno arreglado, dos abiertos

Aparecieron al verificar T7. **H2 lo arregló T9** (era consecuencia de esta misma
spec, así que era lo suyo). H1 y H3 **no se han arreglado**: quedan documentados
en `README.md` §Límites conocidos y en `MEMORY.md`. Cada uno necesita su spec.

| # | Hallazgo | Estado |
|---|---|---|
| H1 | **El formulario de cotización devuelve 400 si el email queda vacío.** `QuoteCartForm` manda `email: ""` porque `FormData.get` devuelve cadena vacía, y `CreateQuoteSchema` rechaza `""` como email inválido | **Abierto. Preexistente. El más grave:** es una vía de negocio rota. El campo está rotulado "opcional" pero el esquema no admite vacío. Comprobado fuera del navegador con `CreateQuoteSchema.safeParse`: `""` rechaza, `undefined`/`null`/válido aceptan |
| H2 | **`/cotizacion` lanzaba `Error: Hydration failed` con carrito guardado** | **Arreglado en T9.** El servidor prerenderiza con el carrito vacío y el cliente hidrataba con el real |
| H3 | Dos pulsaciones rápidas de "+" en el mismo frame solo suman 1 | **Abierto. Preexistente.** `onClick={() => updateQuantity(item.id, item.quantity + 1)}` lee la cantidad del cierre del render. No lo introduce esta spec |

## Datos de prueba creados

La prueba T7#5 creó **2 filas `QuoteRequest` (ids 1 y 2)** en la **base de datos local
de desarrollo**, con `name = "Prueba Spec 003"`. Verificado con un recuento. No se
borran sin permiso: son datos de la BD local, no de producción, y borrarlos es una
escritura en base de datos.