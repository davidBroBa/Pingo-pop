# Arranque local de Pingo POP tras encender el PC (Windows + Docker Desktop).
#
# La app necesita tres cosas vivas y ninguna se levanta sola al reiniciar:
#   1. Docker Desktop (el motor)
#   2. El contenedor MariaDB (`pingo-db`)
#   3. El servidor de Next.js
#
# Este script las levanta EN ESE ORDEN y espera a que cada una este lista.
# Si arrancas Next antes que MariaDB, el pool de Prisma nace contra una base
# caida y las paginas que leen de la BD devuelven 500 hasta reiniciar Next.
#
# Uso: doble clic en `scripts\dev-up.cmd`, o a mano:
#   powershell -ExecutionPolicy Bypass -File scripts\dev-up.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "== Pingo POP: arranque local ==" -ForegroundColor Cyan

# --- 1. Motor de Docker -----------------------------------------------------
docker info --format "{{.ServerVersion}}" 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[1/4] Docker Desktop parado. Lanzandolo (tarda ~1 min)..."
    Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 10
        docker info --format "{{.ServerVersion}}" 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    }
    if (-not $ready) {
        Write-Host "ERROR: el motor de Docker no respondio en 5 minutos." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[1/4] Motor de Docker ya estaba en marcha."
}

# --- 2. MariaDB --------------------------------------------------------------
Write-Host "[2/4] Levantando MariaDB (docker compose up -d)..."
docker compose up -d | Out-Null

# --- 3. Esperar a que este sana ------------------------------------------------
Write-Host "[3/4] Esperando a que pingo-db este healthy..."
$healthy = $false
for ($i = 0; $i -lt 18; $i++) {
    $status = docker compose ps --format "{{.Status}}" 2>$null
    if ($status -match "healthy") { $healthy = $true; break }
    Start-Sleep -Seconds 5
}
if (-not $healthy) {
    Write-Host "ERROR: pingo-db no llego a 'healthy'. Revisa: docker compose logs db" -ForegroundColor Red
    exit 1
}
Write-Host "      pingo-db healthy."

# --- 4. Next.js -----------------------------------------------------------------
# En primer plano: esta ventana ES el servidor. Cerrarla apaga la app.
Write-Host "[4/4] Arrancando Next.js en http://localhost:3000 (cierra esta ventana para apagarlo)" -ForegroundColor Green
npm run dev
