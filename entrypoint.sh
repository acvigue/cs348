#!/bin/sh
set -e

# Run Prisma migrations
echo ""
echo "Running database migrations..."
pnpm prisma migrate deploy
echo "Database migrations completed."
echo ""

if [ "$seed_database" = "true" ] || [ "$SEED_DATABASE" = "true" ]; then
  echo "Generating Prisma client..."
  pnpm prisma generate
  echo "Seeding the database..."
  pnpm prisma db seed
  echo "Database seeding completed."
fi

# Start the Nuxt application
exec "$@"
