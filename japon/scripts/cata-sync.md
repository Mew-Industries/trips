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
