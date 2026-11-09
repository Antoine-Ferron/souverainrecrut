#!/bin/sh
set -eu
set +x

# Le port aléatoire est ouvert dans le moteur Docker dédié à Jenkins.
case "${DOCKER_HOST:-}" in
    tcp://*) db_host=${DOCKER_HOST#tcp://}; db_host=${db_host%:*}; publish=5432 ;;
    ''|unix://*) db_host=127.0.0.1; publish=127.0.0.1::5432 ;;
    *) echo "DOCKER_HOST doit désigner un socket Unix ou un moteur TCP joignable." >&2; exit 1 ;;
esac

export POSTGRES_PASSWORD="$(node -p "require('node:crypto').randomBytes(24).toString('hex')")"
db=$(docker run -d --rm -p "$publish" -e POSTGRES_PASSWORD -e POSTGRES_DB=souverainrecrut_test postgres:16-alpine)
trap 'docker rm -f "$db" >/dev/null' EXIT
attempt=0
until docker exec "$db" pg_isready -h 127.0.0.1 -U postgres -d souverainrecrut_test >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ "$attempt" -ge 60 ]; then echo "PostgreSQL indisponible après 60 secondes." >&2; exit 1; fi
    sleep 1
done
port=$(docker port "$db" 5432/tcp | head -1 | sed 's/.*://')
export DATABASE_URL="postgresql://postgres:$POSTGRES_PASSWORD@$db_host:$port/souverainrecrut_test"
cd backend
npm run prisma:deploy
npm test
