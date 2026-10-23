#!/usr/bin/env sh
set -eu
: "${RESTORE_DATABASE_URL:?Configure um banco de DESTINO para restauração}"
: "${RESTORE_FILE:?Informe o caminho do arquivo .dump}"
if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
 echo "Operação destrutiva: defina CONFIRM_RESTORE=YES para restaurar no banco destino." >&2
 exit 1
fi
test -s "$RESTORE_FILE"
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore não instalado" >&2; exit 1; }
pg_restore --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-acl "$RESTORE_FILE"
echo "Restauração concluída: confira contagens, checksums e índices antes de trocar o sistema."
