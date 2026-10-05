# GATES.md — Gates de calidad y seguridad (Pingo POP)

## 1. Gates obligatorios
| Gate | Comando | Estado | Notas |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit` | **OK** | Sin errores |
| Lint | `npm run lint` | **OK** | ESLint, sin errores/avisos relevantes |
| Tests | `npm test` | **OK** | 82/82 passing (10 suites) |
| Build | `npm run build` | **OK** | 15 rutas, todas dinámicas donde corresponde |
| Auditoría | `npm audit` | **PARCIAL** | 8 high severity (residuales, justificadas) |

## 2. Auditoría npm
`npm audit --json` (resumen):
- **Total:** 8 vulnerabilidades altas (dev-only en tooling)
- **Causa principal:** cadena `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces` (`GHSA-vfj7-8cjw-p6xm`) — `braces <=3.0.3`, última 3.0.3; **no hay parche disponible**
- **Otra:** `prisma → @prisma/config → deepmerge-ts` — fix en 8.0.0 pero `@prisma/config@7.1.5` fija 7.1.5; forzar rompería validación de `prisma migrate`
- **Acciones tomadas:** `npm audit fix` aplicados (`nanoid`, otras menores). No se ejecutó `--force` (evitar breaking changes no justificadas).
- **Mitigación:** solo afecta tooling de desarrollo/lint/build. No llega a runtime de producción. Se documenta y se re-evalúa cuando Prisma/Next publiquen parches.

## 3. Verificación manual de seguridad (ejecutada)
- Cookie sin firma → middleware redirige `/login`; APIs → 401
- Cookie firmada truncada → rechazada (401/redirect)
- Rate limit login → 429 tras exceder
- Upload: HTML disfrazado → 415; SVG con script → 415; GIF → 415; >5 MiB → 415
- imagePath con `../` → Zod rechaza (400)
- BUYER no puede escribir → 403
- Mismo 401 para email inexistente vs contraseña incorrecta → OK (sin enumeración)
- Login con BD caída → 503 + `Retry-After: 30` (donde aplica)

## 4. Estado gates
**VERDE**: typecheck, lint, tests, build. **AMARILLO JUSTIFICADO**: npm audit (8 altas residuales, dev-only, sin parche).

## 5. Comandos para verificar
```bash
# Todos en orden
npx tsc --noEmit && npm run lint && npm test && npm run build
```
```bash
# Auditoría
npm audit --omit=dev  # foco runtime (idealmente 0). Dev-tooling puede quedar.
```
