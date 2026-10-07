# Auditoría de accesibilidad — Pingo POP

> **Fecha:** 2026-10-07 · **Última revisión del código auditado:** la de la spec 009
> (`legal-compliance-privacy`, F9/RF-29/30/31).
>
> **Qué es y qué no es este documento.** Es el resultado de una auditoría
> puntual sobre las superficies públicas principales, hecha con navegador real
> (inspección de DOM, orden de tabulación, eventos de teclado simulados) y
> cálculo de contraste según la fórmula WCAG. No es una certificación: **no se
> declara conformidad con WCAG 2.1 AA** (ver V14 de la spec 009). Los hallazgos
> se clasifican por gravedad y cada uno dice si está corregido, documentado o
> pendiente de decisión.

## 1. Alcance y método

Superficies comprobadas el 2026-10-07:

| Superficie | Qué se comprobó |
|---|---|
| Portada (`/`) | `lang`, h1 únicos, alt de imágenes, skip-link, orden de tabulación |
| `/contacto` | h1, etiquetas de campos de formulario |
| `/login` | etiquetas de campos de formulario |
| Panel de preferencias de cookies | `role="dialog"`, `aria-modal`, `aria-labelledby`, foco inicial, Escape, retorno de foco |
| Contraste (toda la app) | Pares de color reales de `src/app/globals.css` contra WCAG 1.4.3 |

**Método.** Inspección de DOM y eventos de teclado simulados en navegador
(Chromium), y cálculo de ratio de contraste con la fórmula oficial WCAG
(`L = 0.2126·R + 0.7152·G + 0.0722·B`, canales lineales). No se usó lector de
pantalla real.

**Limitaciones** (lo que NO se comprobó, y por qué):

- **Lectores de pantalla reales** (NVDA, VoiceOver, JAWS): no disponibles en el
  entorno. La semántica se verificó por atributos ARIA, no por comportamiento
  de lector.
- **Zoom 400 % y viewport 320 px**: no se ejecutó. Layout responsive es criterio
  de otras fases, no de esta.
- **Contraste en estados `disabled`** (los componentes usan `disabled:opacity-60`):
  por diseño se permite la pérdida de contraste en controles deshabilitados.
- **Superficies de administración y transaccionales** (`/carrito`, `/admin/*`,
  `/cotizacion`): fuera del alcance de esta tanda; el panel de consentimiento y
  las rutas públicas sí se cubrieron.
- **Retorno de foco del diálogo con apertura por teclado**: el foco inicial y el
  retorno al abrir/cerrar se verificaron con flujo real y simulado (abajo).

## 2. Resultados por criterio (WCAG 2.1, nivel AA)

### 2.1 Verificado el 2026-10-07

| Criterio | Resultado | Evidencia |
|---|---|---|
| 2.4.1 Saltar bloques (A) | **Corregido hoy** | La portada no tenía skip-link (hallazgo A1 de la F9). Implementado en `MainLayout` (`a[href="#contenido"]` + `main#contenido` con `tabIndex={-1}`) y verificado en navegador: es el **primer focusable** de la página y al activarlo el foco pasa a `main#contenido`. |
| 3.2.2 / patrón de diálogo modal: Escape cierra (ARIA APG) | **Corregido hoy** | El panel no escuchaba Escape (harnessing de la F9). Implementado en `ConsentPanel` y verificado: `keydown Escape` cierra el diálogo. |
| 2.4.3 Orden de foco / retorno de foco (APG) | **Corregido hoy** | Al cerrar el panel con Escape, el foco no volvía al elemento que lo abrió. Implementado en `ConsentProvider` (guarda el `activeElement` al abrir y lo reenfoca al cerrar) y verificado: con foco previo en el enlace "Preferencias de cookies", al cerrar con Escape el foco vuelve exactamente a ese enlace. |
| 1.1.1 Texto alternativo | ✓ | Hero con `alt=""` decorativo; el resto de imágenes con `alt` real (`/`). |
| 3.1.1 Idioma de la página | ✓ | `lang="es"` en el `html` (`/`). |
| 1.3.1 Encabezados | ✓ | Un único `h1` por página en `/` y `/contacto`. |
| 1.3.1 / 3.3.2 Etiquetas de campos | ✓ | `/login`: 2 campos (email, contraseña) con `label` asociado. `/contacto`: no tiene formulario (cero campos). |
| 4.1.2 Nombre, rol, valor del diálogo | ✓ | Panel: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="consent-title"`, botón de cierre con `aria-label="Cerrar panel de preferencias"`. |
| 2.4.7 Foco visible | ✓ (puntual) | Los elementos interactivos tienen la clase `cartoon-focus` en el proyecto; se comprobó que el skip-link mantiene la cadena de foco visible al recibirlo. No se hizo barrido exhaustivo de todos los focusables. |

### 2.2 Contraste (WCAG 1.4.3, fórmula real de `globals.css`)

| Par (texto / fondo) | Ratio | Umbral AA (4.5:1) | Uso |
|---|---|---|---|
| `--foreground` #1e1e1e / blanco #ffffff | 16.67 | ✓ | Texto de cuerpo |
| `--foreground-muted` #707070 / blanco | 4.95 | ✓ | Texto secundario |
| `--foreground-muted` #707070 / `--cartoon-cream` #fff4d6 | 4.52 | ✓ | Texto secundario sobre footer crema |
| `--primary` #2a2227 / blanco | 15.48 | ✓ | Títulos y enlaces |
| `--primary` / `--accent` #f7b92c | 8.79 | ✓ | Texto sobre botones amarillos |
| `--primary` / `--cartoon-cream` | 14.13 | ✓ | Footer crema |
| `--primary` / `--cartoon-coral` #f87171 | 5.60 | ✓ | Avisos de confirmación |
| `--accent` / blanco | **1.76** | ✗ | **Solo decorativo y hover** (ver 3.1) |
| `--foreground-muted` / `--accent` | **2.77** | ✗ | Botón "Elegir archivo" del admin (ver 3.2) |

## 3. Hallazgos

### 3.1 Hover de enlaces en Navbar y Footer — gravedad MEDIA — pendiente de decisión

Los enlaces de `Navbar` y `Footer` usan `hover:text-accent`. Con el cursor
encima, el texto pasa de `--primary` (15.48:1) a `--accent` sobre blanco
(**1.76:1**), ilegible en el momento del hover.

**No se ha corregido porque implica una decisión de diseño** (elegir qué color
de hover mantiene la línea visual del proyecto, por ejemplo un `accent`
oscurecido o `--cartoon-coral` a 7.56:1 que ya está en los tokens). Se
documenta como pendiente; es un cambio de una clase por enlace cuando se decida
el color.

### 3.2 Contraste del botón "Elegir archivo" — gravedad BAJA — **corregido hoy**

`AdminProductsView` usaba `file:bg-accent` y el texto del control heredaba
`text-foreground-muted`: **2.77:1**. Corregido con `file:text-primary`
(8.79:1), un cambio inequívoco que reutiliza el color que ya usan todos los
botones amarillos.

### 3.3 Focus trap completo del diálogo — gravedad MEDIA — documentado, no verificado

El panel declara `aria-modal="true"` (semánticamente correcto: el usuario de
lector de pantalla queda confinado al diálogo), pero el **confinamiento físico
del Tab** dentro del panel no está implementado ni se ha verificado con teclado
real. Los controles del panel son pocos y visibles, pero un usuario de teclado
podría tabular fuera del diálogo. Se documenta como limitación; requiere teclado
real o prueba con lector para validar la solución.

### 3.4 Barrido no exhaustivo de foco visible — gravedad BAJA — documentado

La clase `cartoon-focus` existe y se aplica a botones, enlaces y campos. No se
hizo revisión uno a uno de todos los focusables del sistema (limitado a las
superficies del §1).

## 4. Estado

- **Corregido y verificado en esta auditoría:** skip-link (2.4.1), Escape del
  diálogo (APG), retorno de foco (APG), contraste del file picker (1.4.3).
- **Documentado como pendiente:** hover `text-accent` (§3.1), focus trap del
  diálogo (§3.3), barrido de foco visible (§3.4).
- **Sin claim de conformidad AA** (V14 de la spec 009): esta auditoría no es una
  certificación.

## 5. Cómo se reprodujo cada comprobación

La verificación de teclado se hizo con eventos reales y simulados en Chromium:

1. **Skip-link:** `Tab` inicial → primer focusable = `a[href="#contenido"]`;
   activarlo → `document.activeElement` = `MAIN:contenido`.
2. **Escape + retorno de foco:** foco en el enlace del pie → `click` → el panel
   enfoca `consent-close` (focus inicial) → `keydown Escape` → el panel se
   cierra y `document.activeElement` vuelve al enlace "Preferencias de cookies".
3. **Contraste:** cálculo de ratio con la fórmula oficial sobre los tokens de
   `src/app/globals.css` (comandos `node -e` con la función `lum`/`ratio`).