# DEPLOY.md — Despliegue de Pingo POP en el servidor

Procedimiento **realmente ejecutado** el 2026-10-05 para la spec `002-cartoon-visual`,
con los errores que aparecieron y cómo se resolvieron. No es un ejemplo teórico:
los errores de la §6 son reales y cuestan tiempo.

## 1. Entorno

| Dato | Valor |
|---|---|
| Servidor | alias SSH `srv` (usuario y host reales están en `~/.ssh/config`, no aquí) |
| Ruta del proyecto | `~/proyectos/pingo-pop` |
| Puerto de producción | `3000` |
| Arranque | `npm run start` (`next start -p 3000`) |
| Log de arranque | `/tmp/pingo-pop-start.log` (esta vez `-002`) |
| Log de build | `/tmp/pp-build-<n>.log` |
| Respaldo del código | `/tmp/pingo-src-backup-<n>` |
| Acceso desde el PC de desarrollo | **bloqueado por firewall**: el puerto 3000 del servidor no responde |

Herramienta de trabajo: el wrapper `srv.ps1` de la skill `proyecto-estandar`. Se
invoca **con el operador `&` en el mismo proceso**, nunca con `powershell -File`.

```powershell
$srv = "$HOME\.config\opencode\skills\proyecto-estandar\scripts\srv.ps1"
& $srv check                              # verifica alias, conexión y herramientas
& $srv exec "git -C ~/proyectos/web status"
```

## 2. Reglas que no se negocian

1. **Nunca uses `sudo`.** El servidor no tiene `NOPASSWD`: un `sudo` no interactivo
   se queda esperando la contraseña hasta agotar el tiempo. El verbo `sudo` del
   wrapper imprime el comando para que lo pegues tú en tu terminal.
2. **Nunca subas `.env`.** Se genera en el servidor con permisos `600`. Los secretos
   no viajan en el tar: se excluyen con `--exclude`.
3. **`docker-compose.override.yml` no viaja.** Es el override local de Windows
   (puerto 3307); en el servidor el 3306 está libre.
4. **Comandos destructivos** (`rm -rf`, `DROP DATABASE`, `git push --force`) el
   wrapper los rechaza. Con `-Force` pasan, y entonces hay que dejar escrito por qué.
5. **Nada de commit ni push** sin que lo pidas expresamente.

## 3. Procedimiento

### 3.1 Gates antes de tocar el servidor

```bash
npm run check     # typecheck && lint && test && build — VERDE o no se despliega
```

### 3.2 Empaquetar y enviar

```powershell
$tmp = "$env:TEMP\pp-sync.tgz"
tar -czf $tmp --exclude=node_modules --exclude=.next --exclude=.env `
    --exclude=docker-compose.override.yml --exclude=*.tsbuildinfo --exclude=.git `
    -C "C:\ruta\al\proyecto" .
scp $tmp srv:/tmp/pp-sync.tgz
```

El tar se crea **fuera del proyecto** (en `%TEMP%`): si lo generas dentro, acabas
incluyéndolo en el siguiente tar.

### 3.3 Respaldar y extraer

```bash
cd ~/proyectos/pingo-pop
cp -a src /tmp/pp-src-backup-002      # respaldo antes de sobrescribir
tar -xzf /tmp/pp-sync.tgz
```

Comprueba que llegó lo que debía, antes de compilar:

```bash
grep -rl cartoon src | wc -l          # debe ser > 0 tras un despliegue visual
```

### 3.4 Compilar

```bash
npm run build > /tmp/pp-build-002.log 2>&1
tail -28 /tmp/pp-build-002.log        # la tabla de rutas solo sale si el build fue bien
cat .next/BUILD_ID                     # debe existir y cambiar con cada build
```

### 3.5 Reiniciar

Primero comprueba qué hay vivo, luego para, luego arranca. En ese orden: arrancar
sin parar deja dos procesos escuchando en el mismo puerto.

```bash
pgrep -af 'next-server|next start'    # 1. qué hay ahora
kill <pid-next-server> <pid-sh>       # 2. parar
sleep 3
pgrep -af 'next-server' || echo "ninguno"
ss -ltn | grep :3000 || echo "libre"  # 3. el puerto debe quedar libre

cd ~/proyectos/pingo-pop
setsid nohup npm run start > /tmp/pingo-pop-start-002.log 2>&1 < /dev/null &
sleep 8
pgrep -af next-server
```

`npm run start` es un proceso que crea hijos; **`setsid` lo desancla** de la sesión
SSH para que sobreviva al cierre. Ver el aviso de la §6.1.

### 3.6 Verificar (no des por hecho que arrancó)

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/
for r in / /products /cotizacion /contacto /novedades /login; do
  printf "%-14s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$r)"
done
# las de admin deben redirigir (307) sin sesión
for r in /admin/productos /admin/categorias /admin/apariencia; do
  printf "%-20s %s\n" "$r" "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$r)"
done
```

Y el logout con y sin credenciales, **sin imprimir ningún secreto**:

```bash
set -a; . ./.env; set +a
# login correcto
curl -s -o /dev/null -w '%{http_code}\n' -X POST -H 'Content-Type: application/json' \
  --data "$(jq -nc --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" '{email:$e,password:$p}')" \
  http://localhost:3000/api/auth/login          # esperado: 200
# contraseña incorrecta  -> 401 ; usuario inexistente -> 401  (mismo código = sin enumeración)
```

Resultado registrado del despliegue del 2026-10-05: 6 rutas públicas **200**, 2 de
admin **307** sin sesión, login correcto **200**, contraseña incorrecta **401**,
usuario inexistente **401**, cookie `pp_session` con `HttpOnly`, `Secure` y
`SameSite`.

### 3.7 Verificación visual

Desde el PC de desarrollo, por túnel (ver §4): navegar y comprobar estilos
computados. El HTML servido debe llevar las clases `variable` de `next/font` en
`<html>`, y el CSS las utilidades cartoon.

## 4. Túnel de acceso

```powershell
ssh -N -L 3001:localhost:3000 srv      # en segundo plano
```

Después, `http://localhost:3001` es la producción. Para cerrar el túnel, terminar el
proceso `ssh` correspondiente.

El túnel tiene un segundo uso poco obvio: **mientras no sincronices, la copia del
servidor sirve el código anterior**. Es la forma barata de capturar el estado
"antes" de un rediseño sin tocar git.

## 5. Volver atrás

```bash
# 1. Parar producción
kill <pid-next-server>
# 2. Restaurar el código
rm -rf ~/proyectos/pingo-pop/src
cp -a /tmp/pp-src-backup-002 ~/proyectos/pingo-pop/src
cd ~/proyectos/pingo-pop && npm run build
setsid nohup npm run start > /tmp/pingo-pop-start.log 2>&1 < /dev/null &
```

`prisma/migrations/` no se toca en un despliegue de código: las migraciones se
aplican aparte y a conciencia (`npx prisma migrate deploy`). Nunca
`prisma migrate reset` en el servidor: borra los datos.

## 6. Errores reales de este despliegue

### 6.1 El wrapper dio error, pero el proceso sí arrancó

```
[srv] ERROR: El comando remoto excedio 180s y lo he matado.
```

**No significa que el arranque falló.** Con `setsid nohup ... &` el proceso se
desancla y sobrevive; lo que se queda colgando es el canal SSH, y el wrapper lo mata
a los 180 s. Después del error hay que volver a preguntar:

```powershell
& $srv exec 'pgrep -af next-server; tail -12 /tmp/pingo-pop-start-002.log; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/'
```

Regla: **antes de reintentar un arranque, comprueba si ya hay un `next-server`
vivo**, o quedan dos procesos compitiendo por el puerto 3000.

### 6.2 `exit=True` en vez del código de salida

Al pasar `echo exit=$?` a través del wrapper, PowerShell expande `$?` y lo
convierte en `True` antes de enviarlo. **No es el código de salida real.** Para
obtenerlo hay que usar `&&`/`||` o imprimir dentro del propio comando remoto. Para
saber si un build fue bien, mirar la tabla de rutas del log y `BUILD_ID` es más
fiable que el código de salida.

### 6.3 `scp` a veces no funciona a través de `srv.ps1 get`

El verbo `get` **mangles las rutas absolutas**. Usa `scp` directamente, como en la
§3.2.

### 6.4 La IP del servidor no responde

`curl http://<ip-del-servidor>:3000` → *connection refused* aunque la app esté viva. No es
la app: es el firewall del servidor. Solución: túnel (§4).

## 7. Estado actual (2026-10-05)

- Build de producción: `BUILD_ID v7Y4ofSNf4KkeWY_7E8as`, 15 rutas.
- Proceso: `next-server` PID **44721**, log en `/tmp/pingo-pop-start-002.log`.
- Última modificación del código desplegado: spec `002-cartoon-visual` completa.