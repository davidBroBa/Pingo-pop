# Plan: Pingo POP — Perfil de cuenta y cambio de contraseña (006-user-profile)

## 1. Estrategia

Una sola columna nueva (`User.sessionVersion`) habilita la revocación; todo lo demás
encaja encima sin tocar el modelo. El orden importa: primero el módulo puro (testable
sin DOM ni BD), después la capa de sesión, después los endpoints, y la página al final.

## 2. Fases

| Fase | Qué | Por qué en ese orden |
|---|---|---|
| F1 | `src/lib/account-schema.ts` puro: políticas de contraseña y esquemas | Es lo único testeable sin navegador ni BD. Va primero y se ve en rojo antes de existir |
| F2 | `sessionVersion` en el modelo + migración | Sin la columna no hay revocación que probar |
| F3 | `sv` en `session-token.ts` + `getSessionUser()` + `requireAdmin()` | Una cookie vieja debe seguir funcionando tras desplegar (RF-18): es el riesgo de ruptura |
| F4 | `POST /api/account/password` y `PATCH /api/account/profile` | Ya se puede probar la revocación de verdad, con la cookie anterior |
| F5 | Página `/perfil` + navbar + panel | Puramente visual, ya con la lógica probada |
| F6 | Cambiar la contraseña del admin local | Al final: si algo falla, no dejamos al admin sin poder entrar |
| F7 | Documentación | `MEMORY.md`, `CHANGELOG.md`, `docs/SDD.md` |

## 3. Principio que manda

**La lógica comprobable va en módulos puros de `src/lib/`.** El runner es
`node:test` **sin jsdom**, así que nada que viva dentro de un componente o de un route
handler se puede testear. Por eso las dos políticas de contraseña y la comparación de
versiones son **funciones puras** en `src/lib/`, no lógica enterrada en la ruta.

## 4. Verificación por fase

- **F1:** tests nuevos en rojo antes de escribir el módulo.
- **F2:** `prisma migrate dev` y comprobar que el nombre de la tabla sigue siendo `User`.
- **F3:** los 107 tests existentes siguen en verde **sin tocarlos**; los nuevos cubren `sv`.
- **F4:** en navegador, cambiar la contraseña y comprobar que la **cookie anterior**
  recibe 401. Esa es la prueba que vale.
- **F5:** perfil de BUYER y de ADMIN en el navegador.
- **F6:** login real con la contraseña nueva, y comprobar que la anterior ya no entra.
- **F7:** `npm run check` en exit 0.

## 5. Riesgos de orden

- **Meter `sv` obligatorio rompería las cookies ya emitidas.** Por eso `verifySession`
  trata el `sv` ausente como `0` (RF-18) y solo F6 invalida de verdad.
- **`requireAdmin` pasando a consultar la BD** añade una consulta por llamada de admin.
  Es aceptable (tráfico bajo) y es el precio de revocar. Si ever se pone pesado, se
  cachea; hoy no hace falta.
- **Tocar el login es el camino más delicado del auth.** El plan **no lo cambia**
  (D5): solo añade `sessionVersion` al `select`.
