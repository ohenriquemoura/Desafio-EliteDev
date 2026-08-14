# Desafio Elite Dev 2026 — Plataforma de Eventos e Ingressos

Plataforma em que o **organizador** publica sessões a partir do catálogo **TMDb**, o **cliente** escolhe cadeiras, paga de forma simulada e recebe ingresso com **QR**, e a **portaria** valida o código na entrada (câmera ou digitação).

### Aplicação publicada

| Camada | URL |
| --- | --- |
| **Web** | [https://desafio-elite-dev-pied.vercel.app](https://desafio-elite-dev-pied.vercel.app) |
| **API** | [https://desafio-elitedev-production.up.railway.app](https://desafio-elitedev-production.up.railway.app) |
| Health | [https://desafio-elitedev-production.up.railway.app/health](https://desafio-elitedev-production.up.railway.app/health) |

Login demo (seed): senha `Demo@2026` — `organizer@elitedev.local` / `client1@elitedev.local` / `gate@elitedev.local`.

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Front-End | Next.js 15 (App Router) + React |
| Back-End | NestJS (Node.js) |
| Banco | PostgreSQL 16 |
| ORM | Prisma 6 |
| Auth | JWT Bearer + papéis `ORGANIZER` / `CLIENT` / `GATE` |
| API externa | [TMDb](https://developer.themoviedb.org/docs) (chave só no backend) |
| Infra local | Docker Compose (Postgres + API + Web) |
| Deploy | Neon (Postgres) + Railway (API) + Vercel (Web) |

Monorepo npm workspaces:

```text
apps/web   → interface (Next.js)
apps/api   → API (NestJS) + Prisma
docs/      → plano e artefatos de processo
```

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (caminho recomendado)
- Conta no [TMDb](https://www.themoviedb.org/settings/api) com **API Key** (v3)
- Opcional: `make` (para `make up` / `make down`) ou só npm / Docker Compose
- Alternativa local: Node.js **20+**, npm **10+** e Docker só para o Postgres

---

## Como executar (recomendado — Docker Compose)

Sobe **PostgreSQL + API + Web**. Na subida da API: `prisma migrate deploy` + seed automático.

```bash
cp .env.example .env
# Edite .env e preencha:
#   TMDB_API_KEY=sua_chave_tmdb
# (opcional em local) altere JWT_SECRET e TICKET_HMAC_SECRET
```

Escolha **um** dos jeitos abaixo (são equivalentes):

| Forma | Subir | Encerrar |
| --- | --- | --- |
| **Make** (mais curto) | `make up` | `make down` |
| **npm** | `npm run up` | `npm run down` |
| **Docker Compose** direto | `docker compose up -d --build` | `docker compose down` |

Exemplo com Make:

```bash
make up
```

Aguarde os containers ficarem healthy/ready e abra:

| Serviço | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Login | http://localhost:3000/login |

Logs (Compose):

```bash
docker compose logs -f
# ou
npm run logs
```

O `Makefile` só expõe dois alvos: `up` e `down`.

### Variáveis de ambiente (`.env`)

Baseie-se em [`.env.example`](.env.example):

| Variável | Onde | Função |
| --- | --- | --- |
| `POSTGRES_*` | Compose / DB | Credenciais do PostgreSQL |
| `DATABASE_URL` | API | Conexão Prisma (local: `localhost`; Compose sobrescreve para `postgres`) |
| `API_PORT` | API | Porta HTTP da API (padrão `3001`) |
| `WEB_ORIGIN` | API | CORS do front (padrão `http://localhost:3000`) |
| `JWT_SECRET` | API | Assinatura do JWT |
| `TICKET_HMAC_SECRET` | API | Assinatura HMAC dos códigos de ingresso/QR |
| `TMDB_API_KEY` | API | Chave TMDb (**obrigatória** para o organizador buscar filmes) |
| `NEXT_PUBLIC_API_URL` | Web | URL da API usada pelo browser (padrão `http://localhost:3001`) |
| `WEB_PORT` | Compose | Porta do Next (padrão `3000`) |

A chave TMDb **não** vai para o bundle do front: só o Nest chama a TMDb.

---

## Dados de teste (seed)

Senha de **todas** as contas: `Demo@2026`

| E-mail | Papel | Para quê |
| --- | --- | --- |
| `organizer@elitedev.local` | ORGANIZER | Criar/publicar eventos a partir do TMDb |
| `client1@elitedev.local` | CLIENT | Reservar cadeiras, pagar, ver QR |
| `client2@elitedev.local` | CLIENT | Segundo cliente (concorrência / outro fluxo) |
| `gate@elitedev.local` | GATE | Validar ingresso na portaria |

Há ao menos um evento publicado (“Clube da Luta”) com cadeiras disponíveis. Eventos criados pelo organizador também geram mapa de assentos conforme a capacidade.

---

## Percurso sugerido para o avaliador

Pode usar a [app publicada](https://desafio-elite-dev-pied.vercel.app) ou subir o stack local com seed:

1. **Organizador** — login → `/organizer` → buscar filme TMDb → publicar (local, data, capacidade, preço).
2. **Cliente** — login com `client1@…` → `/events` → escolher cadeiras → reservar → pagamento simulado (**aprovar** ou **recusar**).
3. **Ingressos** — em `/tickets`, abrir o QR; copiar o **link de compartilhamento** (`/share/...`) e abrir sem login.
4. **Portaria** — login com `gate@…` → `/gate` → selecionar o evento → ler QR pela câmera **ou** colar o código:
   - 1ª validação → **válido** (mostra a cadeira)
   - 2ª validação → **já utilizado**
   - código inventado → **inválido**
   - evento errado no seletor → **evento errado**

---

## O que foi implementado

### Funcional (requisitos do PDF)

- Catálogo TMDb (now playing / search) só para organizador autenticado
- CRUD/publicação de eventos + cartaz e detalhe públicos
- Reserva com **mapa de assentos** (lock de cadeira; evita venda duplicada)
- Pagamento **simulado** (aprovação e recusa)
- Ingresso com código QR **HMAC** (não forjável só no cliente)
- “Meus ingressos” + compartilhamento por link público (somente leitura)
- Portaria: câmera + digitação; quatro retornos claros
- Auth JWT com três papéis
- Seed completo para percorrer o fluxo sem montar nada do zero
- Docker Compose full stack

### Opcionais

- Mapa de assentos
- Docker Compose (Postgres + API + Web)
- **Deploy** público (Neon + Railway + Vercel)

### Testes básicos

Cobertura unitária das regras críticas da API:

```bash
npm test
# ou
npm run test -w api
```

Inclui:

- geração do mapa de assentos (`seat-plan`)
- HMAC do código do ingresso (não forjável)
- validação da portaria (`VALID` / `ALREADY_USED` / `INVALID` / `WRONG_EVENT`)
- validação do DTO de reserva por cadeiras

---

## Decisões de arquitetura (resumo)

| Escolha | Por quê |
| --- | --- |
| **TMDb** em vez de Ticketmaster | Catálogo estável de filmes em cartaz, chave simples, encaixa no “cinema” da UI |
| **Mapa de assentos** (não só pista) | Deixa explícita a regra “mesmo lugar não vende duas vezes”; capacidade do organizador gera o mapa |
| **Prisma 6 + PostgreSQL** | Constraints de estoque (`held + sold ≤ capacity`) + `SELECT … FOR UPDATE` nas reservas |
| **Código de ingresso HMAC** (`TICKET_HMAC_SECRET`) | QR opaco; portaria valida assinatura + estado `ISSUED`/`USED` |
| **Pagamento simulado no Nest** | Atende confirmação/recusa sem gateway real no MVP |
| **Identidade visual própria (tema cinema)** | Evitar “AI slop” genérico; tipografia Oswald/Work Sans, accent vermelho/dourado |
| **Monorepo + Compose** | Um `npm run up` para o avaliador subir tudo |

---

## Deploy (produção)

Stack publicada:

| Serviço | Provedor | Papel |
| --- | --- | --- |
| PostgreSQL | [Neon](https://neon.tech) (`sa-east-1`) | Banco + migrations/seed via Prisma |
| API NestJS | [Railway](https://railway.app) | Dockerfile na raiz; healthcheck `/health`; `PORT` + bind `0.0.0.0` |
| Web Next.js | [Vercel](https://vercel.com) | Root Directory `apps/web`; só o front |

### O que foi feito no deploy

1. **Neon** — projeto Postgres 16; `DATABASE_URL` com SSL; `prisma migrate deploy` + seed.
2. **Railway (API)** — builder **Dockerfile** (raiz do monorepo); entrypoint aplica migrate/seed e sobe o Nest; variáveis: `DATABASE_URL`, `JWT_SECRET`, `TICKET_HMAC_SECRET`, `TMDB_API_KEY`, `PORT`, `WEB_ORIGIN`, `NODE_ENV=production`.
3. **Vercel (Web)** — projeto com Root Directory **`apps/web`** (não `apps/api`); variável `NEXT_PUBLIC_API_URL` apontando para a URL pública do Railway.
4. **CORS** — `WEB_ORIGIN` no Railway = URL exata do front na Vercel, **sem** barra no final (ex.: `https://desafio-elite-dev-pied.vercel.app`).

URLs atuais:

- Front: https://desafio-elite-dev-pied.vercel.app  
- API: https://desafio-elitedev-production.up.railway.app  

### Variáveis importantes em produção

| Variável | Onde | Valor típico |
| --- | --- | --- |
| `DATABASE_URL` | Railway | Connection string Neon |
| `JWT_SECRET` / `TICKET_HMAC_SECRET` | Railway | Segredos fortes |
| `TMDB_API_KEY` | Railway | Chave TMDb |
| `PORT` | Railway | Porta que o proxy usa (ex. `3001`) |
| `WEB_ORIGIN` | Railway | URL da Vercel (sem `/` final) |
| `NEXT_PUBLIC_API_URL` | Vercel | URL pública da API no Railway |

A Vercel **não** hospeda a API Nest: só o Next. Segredos JWT/DB ficam só no Railway.

---

## Limitações conhecidas

- Sem cancelamento de reserva/ingresso com devolução automática de cadeira.
- Busca no cartaz público é navegação pela listagem; busca TMDb é do organizador.
- Câmera da portaria depende de permissão do browser e HTTPS/localhost; há fallback por digitação.
- Capacidade do mapa limitada a **260** assentos (26 fileiras × 10) na geração automática.
- Pagamento é 100% simulado (botões aprovar/recusar), sem provedor externo.

Se algo não subir: confira `TMDB_API_KEY`, portas `3000`/`3001`/`5432` livres e `docker compose logs`.

---

## Scripts úteis

| Comando | Descrição |
| --- | --- |
| `make up` / `npm run up` / `docker compose up -d --build` | Sobe Postgres + API + Web |
| `make down` / `npm run down` / `docker compose down` | Encerra os containers |
| `npm run logs` / `docker compose logs -f` | Logs do Compose |
| `npm run db:up` | Sobe só o PostgreSQL |
| `npm run db:deploy` | Aplica migrations |
| `npm run db:seed` | Roda o seed |
| `npm run db:studio` | Prisma Studio |
| `npm test` / `npm run test -w api` | Testes básicos da API |
| `npm run build` | Build local API + Web |
| `npm run dev:api` / `dev:web` | Dev servers |

---

## Uso de IA
Foi utilizado o Cursor IA para auxiliar o desenvolvimento, passei as decisões de arquitetura e minhas ideias para o modelo OPUS 5 criar um plano de implementação, a partir disso tomei a frente da implementação, revisanado o código e aplicando minhas ideias de usabilidade e identidade visual no pruduto. Outra parte que o Cursor foi essencial foi no deploy me ajudando a fazer o troubleshoot dos problemas que enfrentei até a aplicação ficar no ar.
>

## Estrutura rápida da API

| Área | Exemplos |
| --- | --- |
| Auth | `POST /auth/login`, `POST /auth/register` |
| TMDb (ORGANIZER) | `GET /tmdb/now-playing`, `GET /tmdb/search?q=` |
| Eventos | `GET /events`, `GET /events/:id`, `GET /events/:id/seats`, `POST /events` |
| Reservas (CLIENT) | `POST /reservations`, `POST /reservations/:id/pay` |
| Ingressos | `GET /tickets/mine`, `GET /tickets/share/:token` |
| Portaria (GATE) | `POST /gate/validate` |

---
