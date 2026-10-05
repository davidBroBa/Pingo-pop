# PUBLICAR.md — Antes de publicar este repositorio

Checklist para subir Pingo POP a GitHub (o a cualquier remoto) **sin filtrar
secretos**. Está escrito porque el proyecto se desarrolló sin control de versiones:
nadie ha hecho todavía un `git add -A` y una auditoría de lo que saldría.

> **Estado: el repositorio ya está publicado.** El 2026-10-05 se hizo el primer
> commit (`bf52fa4`) y se subió a `github.com/davidBroBa/Pingo-pop`, rama `main`.
> Es **público**. Este documento sigue siendo la lista de comprobación, pero ahora
> es de uso **continuo**: cada commit nuevo vuelve a ser público para siempre, y
> deshacer un commit no borra lo ya subido. Repite el barrido **antes de cada
> commit**, no solo antes del primero.

---

## 1. Lo que ya está ignorado

`.gitignore` cubre, verificado:

| Patrón | Qué protege |
|---|---|
| `.env*` + `!.env.example` | Todos los `.env` (`.env.local`, `.env.production`, `.env.development`…) |
| `/node_modules`, `/.next/`, `/build`, `/out/` | Dependencias y artefactos de build |
| `*.tsbuildinfo`, `next-env.d.ts` | Cache de TypeScript (y el fichero que regenera Next) |
| `/src/generated/prisma` | Cliente Prisma generado (se regenera con `npx prisma generate`) |
| `/public/uploads/products/*` + `!.gitkeep` | **Imágenes subidas por los administradores** |
| `/docker-compose.override.yml` | Override local de Windows (puerto 3307); no debe viajar |
| `/.agents`, `/.claude`, `/.windsurf`, `/.opencode` | Configuración de agentes locales |
| `*.tgz`, `*.tar.gz`, `*.pid`, `*.log` | Artefactos de despliegue |
| `*.pem` | Claves y certificados |
| `/.vercel` | Configuración de despliegue |

**Lo que SÍ debe subirse**, y es fácil confundir con un secreto:

| Ruta | Por qué |
|---|---|
| `.env.example` | Plantilla con valores de ejemplo, no reales. Es la documentación de qué variables hacen falta |
| `prisma/migrations/` | Sin las migraciones no se puede desplegar. **No son secretos** |
| `prisma/schema.prisma` | Estructura de datos. Sin datos de conexión |
| `src/generated/prisma` | **Ignorado a propósito**: son MB generados |

> `docker-compose.yml` sí se sube: lee las credenciales de las variables de entorno,
> no las contiene.

## 2. Barrido de secretos (ejecutado)

**Método:** se leyeron los 7 valores reales de `.env` y se buscó **cada valor
literalmente** en todos los ficheros publicables, **sin imprimir ninguno**. Después,
un barrido por patrones sobre todo el árbol.

Resultado: **ningún valor de `.env` aparece en un fichero versionable**, salvo dos
que **no son secretos** y están además en el código y en la documentación:

| Valor | Dónde aparece | Por qué no es un problema |
|---|---|---|
| `MARIADB_DATABASE` (`pingo_pop`) | `.env.example`, `docker-compose.yml`, `MEMORY.md`, `docs/SDD.md` | Nombre de la base de datos, sin usuario ni contraseña. Ya está en `schema.prisma` |
| `ADMIN_EMAIL` (`admin@pingo-pop.local`) | `.env.example` | Dominio `.local` reservado, inexistente en internet. **Solo es seed** |

Los que **no** aparecen en ningún sitio: `DATABASE_URL`, `SESSION_SECRET`,
`ADMIN_PASSWORD`, `DB_PASSWORD`, `MARIADB_ROOT_PASSWORD`.

> **Si algún día cambias `ADMIN_EMAIL` en `.env` por una dirección real**, deja de
> ser inocuo: vuelve a pasar el barrido antes de publicar.

### Cómo repetir el barrido

```powershell
# 1. Que ningún valor de .env aparezca fuera de .env
$root = (Get-Location).Path
$envMap = @{}
foreach ($l in Get-Content .env) {
  if ($l -match '^\s*#' -or $l -notmatch '=') { continue }
  $k, $v = $l -split '=', 2
  if ($v.Trim().Trim('"').Length -ge 6) { $envMap[$k.Trim()] = $v.Trim().Trim('"') }
}
Get-ChildItem -Recurse -File -Force |
  Where-Object { $_.FullName -notmatch '\\(\.git|node_modules|\.next|src\\generated\\prisma)\\' -and $_.Name -ne '.env' } |
  ForEach-Object {
    $f = $_
    $c = try { [IO.File]::ReadAllText($f.FullName) } catch { $null }
    if (-not $c) { return }
    foreach ($k in $envMap.Keys) {
      if ($c.Contains($envMap[$k])) { "FUGA  $($f.Name)  <- $k" }
    }
  }
# Esperado: como mucho MARIADB_DATABASE y ADMIN_EMAIL, nada más.

# 2. Patrones típicos (una vez hay git)
git grep -nEi 'mysql://[^:$ ]+:[^@$ ]+@|\$argon2|BEGIN [A-Z ]*PRIVATE KEY|gh[pousr]_[A-Za-z0-9]{20,}' -- . ':!*.md'

# 3. Y la prueba que no admite matices: qué se publicaría de verdad
git status --porcelain --untracked-files=all
```

El script que se usó está en `%TEMP%\opencode\secret-sweep.ps1` (fuera del
repositorio, a propósito).

Ojo con `Get-Content -Raw`: en algunos ficheros de esta máquina da
*"A parameter cannot be found that matches parameter name 'Raw'"*. Usa
`[System.IO.File]::ReadAllText()`.

## 3. Ficheros que **parecen** secretos y no lo son

No los borres "por seguridad" sin leer el comentario que tienen al lado: son
decisiones de diseño y quitarlos rompe cosas.

| Dónde | Qué es | Por qué está ahí |
|---|---|---|
| `src/app/api/auth/login/route.ts` → `DUMMY_HASH` | Un hash argon2id literal | **No protege ningún secreto.** Iguala el coste de CPU entre "usuario no existe" y "contraseña incorrecta" para no filtrar por tiempo. Tiene el TSDoc explicándolo |
| `tests/session-token.test.ts` | Dos `SESSION_SECRET` de prueba | Fixtures de test. Deben ser distintos entre sí para probar la firma |
| `prisma/make-buyer.ts` | `BUYER_PASSWORD = "Comprador-de-prueba-1"` | Contraseña de una cuenta **local** de pruebas, contra una base de datos de desarrollo. No existe fuera de tu máquina. Aun así está en el punto de mira de los escáneres de secretos |
| `.env.example` | `TU_CONTRASENA`, `cambia-esta-contrasena` | Marcadores de plantilla |

Sobre `make-buyer.ts`: si prefieres que ni siquiera ese escáner lo señale, la
alternativa es leer la contraseña de una variable de entorno con ese valor por
defecto. Es un cambio de comportamiento del script, así que **decídelo tú**; no se ha
tocado.

## 4. Las capturas

`docs/capturas/002-cartoon-visual/` contiene 9 PNG (1,0 MB): portada, catálogo,
cotización y contacto, antes y después del rediseño, más una de producción.

Comprobado que **solo contienen datos de demostración**: los nombres y precios del
catálogo de ejemplo (`Pines metálicos`, `Botones fotográficos`, `Impresión 3D`,
`Llaveros`, `Llavero personalizado`). **Ni credenciales, ni emails, ni datos de
clientes**, porque nada de eso se pinta en las rutas públicas.

Aun así, antes de publicar en un repositorio que sea de veras público, decide:

- **¿Importa que se vea el catálogo de ejemplo?** Si el catálogo real no debe ser
  visible, borra `docs/capturas/` o sustitúyelo por capturas con contenido falso.
- **Nunca captures `/admin/*` ni la sesión iniciada** en un repositorio público: el
  panel enseña el catálogo real, y cualquier token que se colara en la barra de
  direcciones queda en la imagen.

## 5. Qué comprobar antes del primer `push`

```bash
git status --short --untracked-files=all   # repasa esta lista fichero a fichero
git check-ignore -v -- .env                # quién decide, y por qué
git diff --cached --stat                   # tras un git add
```

### Verificación ejecutada el 2026-10-05

Repositorio: `github.com/davidBroBa/Pingo-pop`, rama `main`, commit `bf52fa4`,
**público**. `main` local sigue a `origin/main` (0 ahead / 0 behind) y el árbol de
trabajo está limpio.

**Lo que entró en el commit: 155 ficheros.** Comprobado uno a uno antes de
commitear:

| Comprobación | Resultado |
|---|---|
| `.env` en la lista | **No** |
| Ficheros bajo `src/generated/prisma/` | **0** |
| Ficheros bajo `node_modules/` o `.next/` | **0** |
| Imágenes reales en `public/uploads/products/` | **0** (solo el `.gitkeep`) |
| `docker-compose.override.yml` | **No** |
| `tsconfig.tsbuildinfo`, `next-env.d.ts` | **No** |
| `.env.example` en la lista | **Sí**, es lo que tiene que pasar |
| Migraciones de Prisma | **Sí**, 5 ficheros (necesarias para desplegar) |
| `.env`, `.env.local`… (cualquier `.env*` que no sea `.example`) | **Ninguno** |

Reparto: `src/` 92, `docs/` 17, `prisma/` 8, `public/` 7, `specs/` 6, `tests/` 5,
`scripts/` 3 y 24 ficheros de configuración y documentación en raíz.

**Y después de subirlo, comprobado contra la API de GitHub** (que es lo que de
verdad importa: lo que GitHub sirve, no lo que tú crees que subiste):

| Ruta | Respuesta | Lectura |
|---|---|---|
| `.env` | **404** | No está publicado |
| `.env.local` | **404** | No está publicado |
| `docker-compose.override.yml` | **404** | No está publicado |
| `src/generated/prisma/client.ts` | **404** | Generado, no publicado |
| `public/uploads/products/1382341486…jpg` | **404** | Subidas de admin, no publicadas |
| `.env.example` | **200** | Publicado, correcto |
| `README.md`, `CHANGELOG.md`, `docs/PUBLICAR.md`, `docs/DEPLOY.md` | **200** | Publicados |
| `prisma/schema.prisma` | **200** | Publicado, correcto |

Puedes repetir esa comprobación en cualquier momento:

```bash
curl -s -o NUL -w "%{http_code}\n" https://api.github.com/repos/davidBroBa/Pingo-pop/contents/.env
# 404 es lo correcto
```

> **Matiz sobre `git check-ignore`**: imprime la regla que decide aunque esa regla
> sea una negación. Para `.env.example` dice `36:!.env.example`: es el patrón que lo
> **deja** pasar. La prueba que no admite matices es `git status --untracked-files=all`:
> si el fichero aparece ahí, se publicaría.

Y antes de publicar:

```bash
npm run check               # typecheck + lint + 82 tests + build: todo verde
```

Estado de los gates tras la documentación (2026-10-05): **typecheck OK, lint OK,
82/82 tests en 10 suites, build OK con 15 rutas.**

## 6. Historial: por qué esto se lee ahora

El repositorio es **público** y ya tiene un commit publicado. Esto cambia el
equilibrio: hoy no hay secretos en el historial, y **mantenerlo así es trabajo
permanente**.

- **Antes de cada commit**: repite el barrido de la §2. Un secreto publicado en un
  repositorio público no se quita con un commit nuevo: aunque lo borres después,
  queda en el historial y en las caches y forks de terceros.
- **Usa `git add` con nombre de fichero** cuando dudes, no `git add -A` a ciegas, y
  revisa `git diff --cached` antes de commitear.
- **Nunca commitees `.env` "para que no se pierda"**. Va en el gestor de secretos
  del servidor.
- **`git commit --no-verify`**: si lo usas, deja escrito el motivo en el mensaje del
  commit. Los hooks existen por algo.
- Si algún día hay que **reescribir el historial** (porque entró un secreto), es un
  trabajo aparte y coordinate: `git filter-repo` sobre el clon, un `push --force` a
  todas las ramas y etiquetas, y avisar a quien tenga un fork. El
  `push --force` aquí se hizo **solo** para reemplazar un `main` antiguo, y se dejó
  la etiqueta `backup-691d142` para que nada quedara huérfano.

## 7. Lo que este repositorio **no** incluye a propósito

| Ausente | Por qué |
|---|---|
| `.env` | Secretos de la instalación (incluye los del servidor) |
| `src/generated/prisma/` | Se regenera: `npx prisma generate` |
| `public/uploads/products/*` | Datos de clientes subidos por los administradores |
| `docker-compose.override.yml` | Específico de la máquina de desarrollo |
| La IP del servidor y su usuario | No hacen falta para trabajar con el proyecto; se acceden por el alias `srv` |
| Historial de la versión antigua | Reemplazado por el proyecto completo. Sigue accesible en la etiqueta `backup-691d142` |

## 8. Resumen ejecutivo

| Pregunta | Respuesta |
|---|---|
| ¿Está ya publicado? | **Sí**: `github.com/davidBroBa/Pingo-pop`, rama `main`, commit `bf52fa4`, **público** |
| ¿Hay secretos en lo publicado? | **No.** Ningún valor de `.env` aparece fuera de `.env`, confirmado contra la API de GitHub (404) |
| ¿Hay datos personales en las capturas? | **No.** Solo catálogo de demostración |
| ¿Las migraciones se publican? | **Sí**, y deben: son necesarias para desplegar |
| ¿Qué hacer antes de cada commit? | Barrido de secretos + `git status --porcelain -uall` + `npm run check` en verde |
| ¿Hay que reescribir historial? | No hace falta hoy. Si algún día entra un secreto, sí, y hay que coordinarlo |