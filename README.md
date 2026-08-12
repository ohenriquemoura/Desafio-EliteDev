# Desafio Elite Dev 2026

Plataforma de Eventos e Ingressos (organizador publica eventos a partir do TMDb; cliente reserva, paga de forma simulada e recebe QR; portaria valida na entrada).

Stack: **Next.js** (`apps/web`) + **NestJS** (`apps/api`) + **PostgreSQL** + **Prisma 6**.

Plano de execução: [`docs/PLANO.md`](docs/PLANO.md).

## Pré-requisitos

- Node.js 20+
- npm 10+
- Docker Desktop (para o PostgreSQL)

## Configuração rápida

```bash
cp .env.example .env
cp .env.example apps/api/.env   # Prisma CLI lê o .env em apps/api
npm install
npm run db:up
npm run db:deploy               # aplica migrations existentes
npm run db:seed
```

O Postgres sobe em `localhost:5432` (usuário/senha/db: `elitedev`).

Para criar novas migrations em desenvolvimento: `npm run db:migrate`.

### Contas seed

Senha de todas: `Demo@2026`

| E-mail | Papel |
| --- | --- |
| `organizer@elitedev.local` | ORGANIZER |
| `client1@elitedev.local` | CLIENT |
| `client2@elitedev.local` | CLIENT |
| `gate@elitedev.local` | GATE |

Há ao menos um evento publicado (“Clube da Luta”) com capacidade disponível.

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
| `npm run db:deploy` | Aplica migrations existentes (CI / setup) |
| `npm run db:migrate` | Cria/aplica migrations em desenvolvimento |
| `npm run db:seed` | Popula usuários e evento demo |
| `npm run db:studio` | Abre o Prisma Studio |
| `npm run build` | Build da API e do Web |
| `npm run dev:api` | Nest em watch mode |
| `npm run dev:web` | Next em modo dev |

## Status

Etapa atual: **feat(db)** — schema Prisma (`users`, `events`, `reservations`, `tickets`), constraint de estoque e seed.
