# Default target - detects OS and runs appropriate up command
up:
ifeq ($(OS),Windows_NT)
	$(MAKE) up-windows
else
	$(MAKE) up-linux
endif

# Windows specific up command
up-windows:
	@docker info >nul 2>&1 || (echo "Docker n'est pas démarré. Merci de lancer Docker Desktop." && exit 1)
	docker compose -f compose.dev.yml --env-file .env.local up

# Linux/Unix specific up command
up-linux:
	@docker info >/dev/null 2>&1 || (echo "Docker n'est pas démarré. Merci de lancer Docker Desktop." && exit 1)
	docker compose -f compose.dev.yml --env-file .env.local up

# Stop containers
down:
	docker compose -f compose.dev.yml --env-file .env.local down

# Start Prisma Studio
start-studio:
	npx prisma studio

# Help target to show available commands
help:
	@echo "Available commands:"
	@echo "  up           - Start containers (auto-detects OS)"
	@echo "  up-windows   - Start containers (Windows)"
	@echo "  up-linux     - Start containers (Linux/Unix)"
	@echo "  down         - Stop containers"
	@echo "  start-studio - Start Prisma Studio"
	@echo "  help         - Show this help message"

.PHONY: up up-windows up-linux down start-studio help
