---
ticket_schema: 1
ticket_id: "01"
execution_mode: HITL
blocked_by: []
---

# Corregir inspección y protección de capacidad en Windows

## Artifact Graph
- Artifact ID: ticket:windows-journal-inspection:01
- Role: ticket
- Parent: [Inspección Windows](../../specs/windows-journal-inspection.md)

## Parent Spec
[Inspección Windows](../../specs/windows-journal-inspection.md)

## What to Build
Eliminar el requisito imposible de flags POSIX en Windows mediante una selección privada de flags soportados, sin quitar validaciones de identidad, tipos, enlace, censo, esquema, límites o autoridad. Cubrir la lectura del journal/namespace y su uso en protección de slots. Reconstruir dist.

## Acceptance Criteria
- [ ] Journal/namespace regular válido se inspecciona en Windows, sin skips globales por flags.
- [ ] Enlaces, tipos especiales, cambios observables y datos/ámbitos/límites inválidos siguen rechazados sin reescritura.
- [ ] Otras plataformas sin capacidades POSIX siguen fail-closed; no se añade una API pública ni dependencia.
- [ ] Protección sigue tratando fallos como unknown y no obtiene permisos de borrado desde mocks.
- [ ] Candidato, grafo, build/tipos y selección causal quedan comprobados, con fallos y límites conservados.

## Frontier
Ready para implementación y pruebas locales. Entrega adicional no autorizada; no bloquear implementación por ese gate posterior.

## Gates
- Attempt: implementación hasta handoff skills-only; entrega/sincronización posteriores separadas.
- Budget, time, maximum attempts: none set; sin gasto externo autorizado.
- Approvals: corrección local y pruebas cubiertas por recuperar Telegram en Windows. Commit/push/PR/merge/tag/npm y despliegue de esta nueva release: open. Sin autorización general, reload/restart ni Pi core.
- Exact version: ninguna; base observada release/reactive-next-0 4ce386e060b8ec51cd1952fe6161971019991392.
- Existing blocks: ninguno para implementar; CI exact-head y autorización de entrega posteriores. No modificar estado para ocultar el defecto.

## Step-by-Step Implementation Plan
1. Validar fuentes/contrato y reproducir RED en pruebas de inspección.
2. Aplicar selección Windows de flags manteniendo todas las guardas y excepciones no Windows.
3. Habilitar pruebas de protección afectadas, ejecutar selección causal y build; conservar evidencia.
4. Congelar CandidateRef, simplificar/revisar y entregar inline con gates visibles.

## Testing Plan
Journal y namespace positivos/negativos; protección/retirement y selección integración afectada; typecheck, build, import/pack. No repetir suites completas por cambios documentales. Matriz completa CI requerida antes de release; sin prueba live ni borrado de topics durante QA.

## Out of Scope
Comandos por Telegram, migración/limpieza, formato de journal, dependencias, red/auth/Pi core, cambios de cola o permisos de borrado.
