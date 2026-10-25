# Comandos de Pi dinámicos por hilo

## Artifact Graph
- Artifact ID: spec:pi-thread-commands
- Role: spec
- Standalone: true
### Children
- [01 Catálogo e invocación](../tickets/pi-thread-commands/01-catalog-and-dispatch.md)

## Objetivo y límites
Permitir usar desde Telegram los comandos que expone la sesión Pi vinculada al hilo. El usuario pidió reflejar altas/bajas de paquetes, instalar primero el hotfix Windows y preparar una sola versión nueva después de los comandos, para que él la publique. El hotfix ya está instalado en disco en Winbox con backup/recibo; las sesiones no se han recargado.

## Fuentes comprobadas
- Pi SDK 1.4.0: getCommands/get_commands devuelve extension, prompt y skill; excluye builtins exclusivos del TUI. El peer 1.0.0 instalado tiene getCommands, expandPromptTemplates, stripFrontmatter y ExtensionCommandContext.reload. No requiere cambiar Pi core ni peers.
- lib/pi.ts ya adapta getCommands. prompt-templates expande plantillas antes de la cola; la cola conserva custodia/recibos y contexto de respuesta.
- commands/createTelegramSessionActionRuntime entrega un ExtensionCommandContext real mediante telegram-internal únicamente después de retirar el update del journal; el token privado impide invocación manual.

## Contrato
- /pi lista el catálogo fresco de esa instancia, paginado y escapado para Telegram. /pi nombre argumentos invoca el nombre SDK exacto; acepta también /pi /nombre. No publica rutas locales ni argumentos en diagnósticos o ACKs.
- El catálogo se relee en cada consulta/solicitud y al despachar un comando ejecutable. Instalaciones/desinstalaciones se reflejan cuando Pi carga sus recursos, normalmente tras reload. No escanear ni cargar paquetes al margen del host.
- Los comandos privados internos se ocultan y rechazan. Los comandos Telegram existentes, sus aliases y los prompts ya aceptados conservan su comportamiento. No fingir soporte genérico de /settings, /hotkeys u otros builtins TUI no expuestos.
- Los comandos de extensión se someten una sola vez a pi.sendUserMessage con expandPromptTemplates:true, después del ACK durable, sin convertirlos en una consulta al modelo. ACK significa solicitado, no prueba de finalización del handler; las UIs de cada extensión mantienen su soporte/limitaciones del host.
- Las plantillas usan la expansión ya existente y las skills el formato documentado de Pi con stripFrontmatter público; el resultado entra en la cola normal conservando adjuntos, orden, recibos y destino. No cambiar el formato durable ni la versión del protocolo entre peers. Anunciar una capability opcional de comandos Pi y rechazar /pi antes del forwarding a destinatarios que no la anuncian: una instancia antigua no debe convertir ese control en prompt al modelo.
- /pi --reload usa ctx.reload del gateway real y solo por solicitud explícita del usuario de ese hilo; no ejecutar reload durante esta tarea. No reutilizar contexto tras reload. El catálogo explica que esto reemplaza recursos cargados, no instala paquetes ni actualiza Pi.
- Solo el usuario emparejado puede inspeccionar/invocar. Conservar la selección y el forwarding existentes: en All se elige una sesión; nunca ejecutar en el líder por defecto ni en un hilo sin binding. Revalidar sesión, target y transporte antes del efecto; un comando retirado/cambiado no cae al modelo.
- Reutilizar el gateway privado afterUpdateCompleted con un callback en memoria para estos efectos. No ejecutar antes de retirar el update, no repetir tras completions duplicadas ni recuperar automáticamente efectos de resultado desconocido. No crear otro gateway, proceso Pi, shell, PTY o inyección de teclas.

## Aceptación
1. Dos sesiones con catálogos distintos muestran/invocan únicamente sus comandos; cambios/remociones se reflejan sin caché propia persistente.
2. El comando de extensión llega a un handler real de Pi con argumentos intactos y sin inferencia adicional; no se ejecuta antes del ACK ni dos veces.
3. Prompt y skill llegan a la cola con expansión correcta, metadatos/adjuntos/recibos conservados; no se invoca un handler por accidente desde la cola.
4. Catálogo/paginación/errores están acotados y escapados, sin rutas/argumentos privados; builtin TUI no soportado se explica, no se simula.
5. Remoción, cambio de contexto/transporte/destino, uso manual del gateway y actores no emparejados rechazan sin efecto indebido.
6. --reload se prueba con contextos de test; ninguna sesión real se recarga desde el agente. Código/dist y checks causales aprobados, con integración SDK nativa donde sea factible y límites live visibles.

## Implementación y verificación
Un tracer bullet: dominio pi-commands para catálogo/recursos, callback del gateway existente, routing por hilo y wiring de composición. RED causal; GREEN; simplificación/review inline y QA. Tipos/build/pack y casos relevantes durante iteración; perfil completo estable al final por el cambio de routing/lifecycle. No repetir perfiles completos por docs/metadatos. Conservar evidencia Windows previa con su identidad, sin relabel.

## Gates
- Attempt: implementación hasta handoff; preparación de release conjunta posterior.
- Budget, time, maximum attempts: none set; sin gasto externo autorizado.
- Approvals: el contexto conservado atribuye al usuario continuar los comandos y preparar una sola versión para que él la publique; el turno actual confirma «Continue the current task». Esta referencia al resumen no pretende ser una transcripción literal de los turnos compactados. No publicar npm ni disparar tags/release automáticamente: el usuario publicará una sola versión cuando comandos estén listos. Sin reload/reinicio real ni actualización de Pi core.
- Exact version: ninguna nueva todavía; mantener 0.1.4 mientras se implementa. Revalidar versión libre una sola vez en preparación final, no crear releases intermedias.
- Existing blocks: ninguno para implementación. Inspeccionados AGENTS, BACKLOG, API SDK y routing/journal/gateway. Recursos/UI no expuestos por API y aceptación real después de reload siguen límites; CI exact-head/entrega se mantienen separados.

## Fuera de alcance
Emular el TUI completo, modificar Pi core, activar remote dialogs o custodia v3 gated, nuevos permisos/schemas/protocolos de borrado, cambios de red/credenciales, publicación npm antes de comandos, o instalar la feature incompleta en sesiones activas.
