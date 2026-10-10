# Ediciones sincronizadas del viaje

El plan admite edición bidireccional de datos estructurados. La copia editable
se sincroniza cada 15 minutos. Solo se edita destinations.json; los documentos
se regeneran automáticamente. Los objetos nuevos reciben syncId al sincronizar;
se conservan las identidades existentes. El schema está en
../data/destinations.schema.json.

Si dos ediciones cambian el mismo campo, se conserva el valor del sitio y se
avisa para resolverlo. Los ítems de sorpresa son de solo lectura y se preservan
al agregar, editar o quitar otras actividades. Cada edición aplicada queda
registrada, se publica y produce un aviso al responsable del viaje.

## Retry safety and permissions

New keyless activities receive a stable syncId derived from their contents,
parent path and equal-item occurrence. The validated input is normalized before
any source write, commit, push or Telegram notification. Retrying a failed push,
notification, or concurrent edit does not append another copy of that activity.

Claude CLI has explicit user-setting Write/Edit grants for viaje/ and memory/,
with the scoped PreToolUse guard enforcing those same directories. Native
OpenClaw filesystem tools remain denied for every provider, including OpenAI
fallbacks; workspaceOnly alone would not enforce the two-directory boundary.
The proposed runtime patch only adds workspaceOnly and an explicit OpenAI deny.
It does not remove group:fs. On a fallback without editing tools, Cata must be
told that the edit could not be applied in that session.
