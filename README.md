# Desafio Elite Dev 2026

Plataforma de Eventos e Ingressos (organizador publica eventos a partir do TMDb; cliente reserva, paga de forma simulada e recebe QR; portaria valida na entrada).

Stack: **Next.js** (`apps/web`) + **NestJS** (`apps/api`) + **PostgreSQL** + **Prisma 6**.

Plano de execução: [`docs/PLANO.md`](docs/PLANO.md).

## Pré-requisitos

- Docker Desktop (caminho recomendado)
- Ou, para desenvolvimento local: Node.js 20+, npm 10+ e Docker só para o Postgres

## Opção A — Tudo no Docker (recomendado)

```bash
cp .env.example .env
npm run up
```

Sobe **Postgres + API + Web**. Na subida, a API aplica migrations e o seed automaticamente.

- Web: http://localhost:3000
- API: http://localhost:3001
- Login: http://localhost:3000/login

Para encerrar:

```bash
npm run down
```

Logs:

```bash
npm run logs
```

## Opção B — Desenvolvimento local

```bash
cp .env.example .env
cp .env.example apps/api/.env
npm install
npm run db:up                 # só o Postgres
npm run db:deploy
npm run db:seed
npm run dev:api               # terminal 1
npm run dev:web               # terminal 2
```

- API: http://localhost:3001
- Web: http://localhost:3000

Para criar novas migrations: `npm run db:migrate`.

### Contas seed

Senha de todas: `Demo@2026`

| E-mail | Papel |
| --- | --- |
| `organizer@elitedev.local` | ORGANIZER |
| `client1@elitedev.local` | CLIENT |
| `client2@elitedev.local` | CLIENT |
| `gate@elitedev.local` | GATE |

Há ao menos um evento publicado (“Clube da Luta”) com capacidade disponível.

## Scripts úteis

| Script | Descrição |
| --- | --- |
| `npm run up` | Build e sobe Postgres + API + Web |
| `npm run down` | Para todos os containers |
| `npm run logs` | Logs do Compose |
| `npm run db:up` | Sobe só o PostgreSQL |
| `npm run db:deploy` | Aplica migrations (local) |
| `npm run db:seed` | Seed (local) |
| `npm run db:studio` | Prisma Studio |
| `npm run build` | Build local da API e do Web |
| `npm run dev:api` | Nest em watch mode |
| `npm run dev:web` | Next em modo dev |

## Status

Etapa atual: **feat(auth)** + stack completa no Docker Compose.
