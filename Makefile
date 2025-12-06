.PHONY: install build run docker config

config:
	@if [ ! -f .env ]; then \
		echo "Creating .env file from .env.example template..."; \
		cp .env.example .env; \
		echo "✅ .env file created successfully!"; \
		echo "📝 Please edit .env file to configure your environment variables"; \
	else \
		echo "⚠️  .env file already exists. Skipping creation."; \
		echo "💡 To recreate, delete .env first: rm .env && make config"; \
	fi

install:
	yarn install

build:
	yarn build

run:
	yarn start

docker:
	docker compose up --build

# Developer helpers
lint:
	yarn workspace stratosafe-backend format:check
	yarn workspace stratosafe-backend lint
	yarn workspace stratosafe-frontend lint

lint-fix:
	yarn workspace stratosafe-backend format
	yarn workspace stratosafe-backend lint:fix
	yarn workspace stratosafe-frontend lint:fix

hooks-install:
	git config core.hooksPath .githooks
	chmod +x .githooks/pre-commit
