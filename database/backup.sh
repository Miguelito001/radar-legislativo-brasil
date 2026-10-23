#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?Defina DATABASE_URL fora do repositório antes do backup}"
command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump não instalado" >&2; exit 1; }
command -v sha256sum >/dev/null 2>&1 || { echo "sha256sum não instalado" >&2; exit 1; }
dir="${BACKUP_DIR:-./backups}"
mkdir -p "$dir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$dir/radar-legislativo-$stamp.dump"
tmp="$file.partial"
trap 'rm -f "$tmp"' EXIT INT TERM
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-acl --file="$tmp"
test -s "$tmp"
mv "$tmp" "$file"
sha256sum "$file" > "$file.sha256"
trap - EXIT INT TERM
echo "Backup criado: $file"
echo "Copie e criptografe este backup para armazenamento separado e teste sua restauração."
