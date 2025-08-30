help:
	@echo "Available commands:"
	@echo "  dev        - Start development environment"
	@echo "  prod       - Start production environment"
	@echo "  build      - Build all services"
	@echo "  logs       - Show logs for all services"
	@echo "  logs-f     - Follow logs for all services"
	@echo "  health     - Check health of all services"
	@echo "  stop       - Stop all services"
	@echo "  clean      - Stop and remove all containers, volumes, and networks"
	@echo "  restart    - Restart all services"

# Development environment
dev:
	docker compose -f .\docker-compose.dev.yml -p hambaar-app up -d --build

# Production environment
prod:
	docker compose -f .\docker-compose.yml -p hambaar-app up -d --build

# Build all services
build:
	docker compose build

# Show logs
logs:
	docker compose logs

# Follow logs
logs-f:
	docker compose logs -f

# Health check
health:
	@echo "Checking service health..."
	@docker compose ps --format "table {{.Service}}\t{{.Status}}\t{{.Ports}}"

# Clean (down) service (For Development environment)
clean:
	docker compose -f .\docker-compose.dev.yml -p hambaar down

# Restart services
restart:
	docker compose restart

# Database shell
db-shell:
	docker compose exec postgres psql -U postgres -d hambaar-db

# Redis shell
redis-shell:
	docker compose exec redis redis-cli

# Show backend logs only
backend-logs:
	docker compose logs -f backend-dev backend-prod