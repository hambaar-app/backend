#!/bin/sh

set -e

# Run the migration
npm run prisma:push

# Run seeders
npm run seed

exec "$@"