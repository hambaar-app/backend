#!/bin/sh

set -e

# Sync the schema (no migrations in this project — `db push` workflow)
npm run prisma:push

# Seeding is explicit and idempotent: opt in per boot with SEED_ON_BOOT=true.
# The Docker runtime target does not use this entrypoint by default
# (see Dockerfile); `npm run seed` remains the manual path.
if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  npm run seed
fi

exec "$@"