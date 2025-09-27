up:
	@docker info >nul 2>&1 || (echo "Docker n'est pas démarré. Merci de lancer Docker Desktop." && exit 1)
	docker compose -f compose.dev.yml --env-file .env.local up
