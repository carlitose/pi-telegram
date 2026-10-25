---
ticket_schema: 1
ticket_id: "01"
execution_mode: HITL
blocked_by: []
---

# Catálogo e invocación de Pi por hilo

## Artifact Graph
- Artifact ID: ticket:pi-thread-commands:01
- Role: ticket
- Parent: [Comandos por hilo](../../specs/pi-thread-commands.md)

## Parent Spec
[Comandos por hilo](../../specs/pi-thread-commands.md)

## What to Build
Entrada /pi para catálogo vivo y /pi nombre args, con resources hacia la cola existente y handlers SDK mediante callback del gateway privado tras ACK durable. /pi --reload adapta ctx.reload sin ejecutarlo en vivo durante desarrollo. Mantener contexto/hilo/actor y no representar comandos TUI no expuestos como disponibles.

## Acceptance Criteria
- [ ] Catálogo SDK fresco por instancia, altas/bajas visibles después de recursos cargados, paginación/escape sin rutas privadas.
- [ ] Handler de extensión solicitado una vez tras ACK con args intactos; sin convertirlo en prompt al modelo ni usar contexto manual/falso.
- [ ] Prompt/skill expandido preserva cola, recibos, adjuntos y destino; no cambia schemas ni versión de protocolo de peers; una capability opcional impide enviar /pi a destinatarios antiguos como un prompt ordinario.
- [ ] Contexto/transport/target/actor obsoletos, comandos retirados e internos no producen efectos ni fallback al modelo.
- [ ] --reload y gateway probado sin recarga de sesiones reales; build/dist/tipos/tests y revisión/QA actuales.

## Frontier
Ready para implementación inline. Publicación npm diferida y reservada al usuario, no es gate de implementación.

## Gates
- Attempt: implementación hasta handoff; preparación de release conjunta posterior.
- Budget, time, maximum attempts: none set; sin gasto externo autorizado.
- Approvals: el contexto conservado atribuye al usuario continuar los comandos y preparar una sola versión para que él la publique; el turno actual confirma «Continue the current task». Esta referencia al resumen no pretende ser una transcripción literal de los turnos compactados. No publicar npm ni disparar tags/release automáticamente: el usuario publicará una sola versión cuando comandos estén listos. Sin reload/reinicio real ni actualización de Pi core.
- Exact version: ninguna nueva todavía; mantener 0.1.4 mientras se implementa. Revalidar versión libre una sola vez en preparación final, no crear releases intermedias.
- Existing blocks: ninguno para implementación. Inspeccionados AGENTS, BACKLOG, API SDK y routing/journal/gateway. Recursos/UI no expuestos por API y aceptación real después de reload siguen límites; CI exact-head/entrega se mantienen separados.

## Step-by-Step Implementation Plan
1. Validar contrato/grafo/candidato, definir RED de catálogo, recursos, gateway y routing por sesión.
2. Implementar dominio propietario y callback afterUpdate del gateway, conservar recorrido de cola y forwarding.
3. Wiring, menú/doc/emoji registry y build; pruebas causales y contrato SDK nativo.
4. Congelar, simplificar/revisar inline, QA y handoff; preparar después una sola release conjunta.

## Testing Plan
Catálogo dinámico y aislado, alias/nombres especiales/args, resources sin side effects, ACK/duplicados/retirada/stale context/actor, adjuntos/recibos, callback con ExtensionCommandContext y reload stub. Tipos/build y pruebas focalizadas; perfil completo solo al gate estable por routing/lifecycle. Mocks no acreditan UI/entrega Telegram live.

## Out of Scope
Publicar npm ahora, Pi core/PTY/shell/teclas, activar remote dialogs/custodia gated, nuevos schemas/autoridad de borrado, recargar sesiones reales.
