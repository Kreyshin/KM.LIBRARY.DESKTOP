#!/bin/sh
set -eu
mkdir -p "${KARMA_DATA_DIR:-/data}/uploads"
touch "${KARMA_DATA_DIR:-/data}/library.sqlite"
./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma
exec node dist/main.js
