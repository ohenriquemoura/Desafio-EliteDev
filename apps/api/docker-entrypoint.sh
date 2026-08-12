#!/bin/sh
set -e

echo ">> Aplicando migrations..."
npx prisma migrate deploy

echo ">> Executando seed..."
npx prisma db seed

echo ">> Iniciando API..."
exec node dist/main.js
