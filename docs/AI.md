# AI.md — Uso de IA en Pingo POP

## 1. Alcance
Este documento describe el uso responsable de IA durante el desarrollo de Pingo POP.

## 2. Casos de uso
- Generación/edición de código (rutas API, tests, validaciones)
- Escritura de documentación (SDD, THREATS, GATES)
- Refactor seguro con tests
- Diagnóstico y correcciones (migraciones, casing Linux/Windows)

## 3. Principios
- **Humano aprueba, IA asiste.** Decisiones arquitectónicas y de seguridad las valida el desarrollador.
- **Tests primero.** Cambios críticos van acompañados de tests.
- **Verificación real.** Nunca se afirma que algo funciona sin ejecutarlo (typecheck/lint/test/build).
- **Sin fuga de secretos.** No se envían `.env`, hashes o credenciales al modelo.
- **Código verificable.** Se ejecutan comandos de verificación y se reporta su salida.

## 4. Riesgos mitigados
- Hallucinations → verificación contra código real (grep/read)
- Cambios demasiado amplios → edición dirigida (edit tool)
- Seguridad → modelo de amenazas + tests específicos
- Fuga de secretos → `.env` nunca se envía al modelo ni se imprime; los comandos de
  verificación leen la `.env` del servidor **dentro** del servidor y solo devuelven
  códigos HTTP. El barrido de secretos y lo que se puede publicar están en
  `docs/PUBLICAR.md`

## 5. Estado
Uso justificado, controlado, verificable con gates en verde (82/82). La spec
`002-cartoon-visual` se verificó **contra la producción desplegada**, no solo en
local. La ninguna afirmación de este proyecto se da por buena sin el comando que la
sostiene: los documentos `docs/`, `specs/*/tasks.md` y `MEMORY.md` citan la
verificación concreta de cada tarea.
