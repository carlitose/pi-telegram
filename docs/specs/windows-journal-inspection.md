# Inspección de journals compatible con Windows

## Artifact Graph
- Artifact ID: spec:windows-journal-inspection
- Role: spec
- Standalone: true
### Children
- [01 Lectura y protección de capacidad](../tickets/windows-journal-inspection/01-windows-read-protection.md)

## Tipo y objetivo
Reparación de un fallo reproducido: las lecturas de protección de journals deben poder inspeccionar archivos regulares en Windows, sin interpretar errores como ausencia de trabajo ni resetear historial. La petición es recuperar Telegram en el host Windows; los comandos dinámicos por Telegram quedan fuera de alcance y pospuestos.

## Evidencia y causa
En Windows/Node 24, `readForProtection` falla con `platform lacks no-follow nonblocking open evidence` antes de leer cualquier journal. `acquireTelegramUpdateJournalFamily` e `inspectTelegramProfileJournalNamespace` exigen `O_NOFOLLOW` y `O_NONBLOCK`, que Node no expone en Windows. Con A–Z ocupados, el resultado `unknown` bloquea la retirada aunque haya bindings inactivos y propietarios muertos. El planificador, con protecciones externas despejadas solo como contrafactual, sí propone una víctima; esa simulación no autoriza su eliminación.

## Contrato objetivo
- Permitir lectura de archivos regulares en Windows con flags soportados por Node, conservando todas las comprobaciones existentes de anclaje/censo, rechazo de enlaces/tipos especiales, identidad `lstat`/descriptor, tamaño, cambios durante lectura, perfil/bot, esquema y límites de archivos/bytes/trabajo.
- Usar los flags POSIX de no-follow/nonblocking cuando estén disponibles. No extender silenciosamente la excepción Windows a otros sistemas sin esas capacidades.
- Mantener las precondiciones documentadas de almacenamiento privado cooperativo y serialización/quiescencia por el llamador. No afirmar resistencia a manipulación hostil del mismo usuario, ABA ni continuidad de ACL.
- Protección de capacidad no modifica, recupera, pone en cuarentena ni crea journals. Un error sigue siendo `unknown`, nunca evidencia de vacío.
- Preservar íntegramente permisos de retirada, protección de cola, autoridad exacta de líder/target, límites A–Z y contrato de borrado. No borrar topics ni alterar estado durante la validación.
- No cambiar formatos de datos, dependencias, API pública, versión de Pi, credenciales ni configuración de red.

## Aceptación
1. Un journal válido y un namespace válido se inspeccionan en Windows real sin depender de flags POSIX inexistentes.
2. Las pruebas Windows de protección dejan de omitir globalmente la ruta afectada; casos específicamente POSIX siguen diferenciados honestamente.
3. Enlaces/junctions, tipos inesperados, cambios de identidad/contenido, perfil/bot/esquema ajenos y límites insuficientes se rechazan sin cambiar los bytes.
4. Sistemas no Windows que carezcan de los flags conservan el rechazo fail-closed y su prueba sintética explícita.
5. Build/distributivo, tipos y pruebas causales de journal/retirement/integración se validan. No se afirma recuperación de una sesión real desde una simulación.

## Implementación y verificación

El perfil completo Windows reveló `ETIMEDOUT` únicamente en dos escenarios del fixture de rotación de bus: su cliente de prueba heredaba 1 s para retiradas serializadas con I/O real; los escenarios fallaron tras 1,66–2,27 s (duración del caso completo, no una medida de la operación individual). Dar a ese fixture un plazo explícito y acotado de 10 s, manteniendo todas las aserciones de permisos/efectos, sin cambiar timeouts ni reintentos de producción. Validar el caso aislado y bajo la misma carga del perfil completo.

Un ticket vertical: tests RED de compatibilidad/capacidad, selección de flags privada al dominio journal, pruebas negativas y guardas existentes, GREEN, build, simplificación/revisión inline y QA. Priorizar la selección causal; matriz completa exact-head será gate de entrega cuando se autorice publicar. Las pruebas de datos reales son de lectura, nunca una instalación del candidato no integrado.

## Gates
- Attempt: implementación hasta handoff skills-only; entrega Git/npm y sincronización son etapas separadas.
- Budget, time, maximum attempts: none set; sin gasto externo autorizado.
- Approvals: corrección local y pruebas cubiertas por la petición de recuperar Telegram en Windows. Para este parche adicional, commit/push/PR/merge/tag/npm y despliegue de una nueva release quedan open; no inferir una autorización general de la entrega anterior. Reload/restart y Pi core no autorizados.
- Exact version: ninguna indicada; base observada release/reactive-next-0 `4ce386e060b8ec51cd1952fe6161971019991392` (0.1.4).
- Existing blocks: ninguno para implementar. Entrega requiere autorización y CI exact-head; uso real requiere cargar una release integrada y observarla. El rechazo POSIX reproducido es el defecto, no una aprobación pendiente que se deba evadir.

## Fuera de alcance
Comandos dinámicos, ampliación del alfabeto, migración/limpieza del almacenamiento, borrado manual de topics, rebajar protección ante evidencia incompleta, reset de colas/journals o cambios en otros paquetes.
