.PHONY: up down

# Sobe Postgres + API + Web (build + detach)
up:
	docker compose up -d --build

# Encerra e remove os containers do Compose
down:
	docker compose down
