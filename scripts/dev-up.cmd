@echo off
rem Doble clic: levanta Docker + MariaDB + Next.js para Pingo POP (local).
powershell -ExecutionPolicy Bypass -File "%~dp0dev-up.ps1"
pause
