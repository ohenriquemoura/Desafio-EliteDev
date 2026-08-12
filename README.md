# Desafio Elite Dev 2026

Plataforma de Eventos e Ingressos (organizador publica eventos a partir do TMDb; cliente reserva, paga de forma simulada e recebe QR; portaria valida na entrada).

Stack: **Next.js** (`apps/web`) + **NestJS** (`apps/api`) + **PostgreSQL**.

Plano de execução: [`docs/PLANO.md`](docs/PLANO.md).

## Pré-requisitos

- Node.js 20+
- npm 10+
- Docker Desktop (para o PostgreSQL)

## Configuração rápida

```bash
cp .env.example .env
npm run db:up
```

O Postgres sobe em `localhost:5432` (usuário/senha/db: `elitedev`).

## Rodar em desenvolvimento

Em terminais separados:

```bash
npm run dev:api
npm run dev:web
```

- API: http://localhost:3001
- Web: http://localhost:3000

## Scripts úteis

| Script | Descrição |
| --- | --- |
| `npm run db:up` | Sobe o PostgreSQL |
| `npm run db:down` | Para o PostgreSQL |
| `npm run build` | Build da API e do Web |
| `npm run dev:api` | Nest em watch mode |
| `npm run dev:web` | Next em modo dev |

## Status

Etapa atual: **chore(setup)** — monorepo, Docker Compose e esqueletos Nest/Next. Schema, auth e fluxo de negócios vêm nas próximas etapas.
