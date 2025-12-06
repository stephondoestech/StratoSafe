.PHONY: help config install install-ci build run docker lint lint-fix hooks-install publish publish-local tag release-patch release-minor release-major list-releases version

# Variables
REGISTRY ?= docker.io
IMAGE_NAME ?= stratosafe
DOCKER_USER ?= $(shell git config user.username 2>/dev/null)
IMAGE_TAG ?= latest
VERSION_FILE := VERSION
CURRENT_VERSION := $(shell [ -f $(VERSION_FILE) ] && cat $(VERSION_FILE) || echo "0.1.0")

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "%-18s %s\n", $$1, $$2}'

config: ## Create local .env from example if missing
	@if [ ! -f .env ]; then \
		echo "Creating .env file from .env.example template..."; \
		cp .env.example .env; \
		echo "✅ .env file created successfully!"; \
		echo "📝 Please edit .env file to configure your environment variables"; \
	else \
		echo "⚠️  .env file already exists. Skipping creation."; \
		echo "💡 To recreate, delete .env first: rm .env && make config"; \
	fi

install: ## Install all workspace dependencies
	yarn install

install-ci: ## Install with frozen lockfile (CI parity)
	yarn install --frozen-lockfile

build: ## Build backend and frontend
	yarn build

run: ## Run both backend and frontend
	yarn start

docker: ## Build and start services via docker-compose
	docker compose up --build

# Developer helpers
lint: ## Run formatting check and linters
	yarn workspace stratosafe-backend format:check
	yarn workspace stratosafe-backend lint
	yarn workspace stratosafe-frontend lint

lint-fix: ## Auto-format and auto-fix lint issues
	yarn workspace stratosafe-backend format
	yarn workspace stratosafe-backend lint:fix
	yarn workspace stratosafe-frontend lint:fix

hooks-install: ## Install git hooks from .githooks
	git config core.hooksPath .githooks
	chmod +x .githooks/pre-commit

# Release / publish
publish: ## Build and push image to registry
	@if [ -z "$(DOCKER_USER)" ]; then echo "Set DOCKER_USER or configure git user.username"; exit 1; fi
	docker buildx build --platform linux/amd64 -t $(REGISTRY)/$(DOCKER_USER)/$(IMAGE_NAME):$(IMAGE_TAG) --push .

publish-local: ## Build image locally without push
	@if [ -z "$(DOCKER_USER)" ]; then echo "Set DOCKER_USER or configure git user.username"; exit 1; fi
	docker build -t $(REGISTRY)/$(DOCKER_USER)/$(IMAGE_NAME):$(IMAGE_TAG) .

# Release helpers (uses VERSION file + git tags)
version: ## Show current version from VERSION file
	@echo $(CURRENT_VERSION)

tag: ## Update VERSION file and push annotated tag (usage: make tag VERSION=v1.0.0)
	@if [ -z "$(VERSION)" ]; then echo "Usage: make tag VERSION=v1.0.0"; exit 1; fi
	@VERSION_NUM=$$(echo $(VERSION) | sed 's/^v//'); \
	echo $$VERSION_NUM > $(VERSION_FILE); \
	git add $(VERSION_FILE); \
	git commit -m "chore: bump version to $$VERSION_NUM" || true; \
	git tag -a v$$VERSION_NUM -m "Release v$$VERSION_NUM"; \
	git push origin v$$VERSION_NUM

release-patch: ## Create next patch tag from current version (default 0.1.0)
	@BASE=$(CURRENT_VERSION); \
	MAJOR=$$(echo $$BASE | cut -d. -f1); \
	MINOR=$$(echo $$BASE | cut -d. -f2); \
	PATCH=$$(echo $$BASE | cut -d. -f3); \
	NEW_PATCH=$$((PATCH + 1)); \
	NEW_VERSION="$$MAJOR.$$MINOR.$$NEW_PATCH"; \
	echo "Creating patch release v$$NEW_VERSION"; \
	$(MAKE) tag VERSION=v$$NEW_VERSION

release-minor: ## Create next minor tag from current version (default 0.1.0)
	@BASE=$(CURRENT_VERSION); \
	MAJOR=$$(echo $$BASE | cut -d. -f1); \
	MINOR=$$(echo $$BASE | cut -d. -f2); \
	NEW_MINOR=$$((MINOR + 1)); \
	NEW_VERSION="$$MAJOR.$$NEW_MINOR.0"; \
	echo "Creating minor release v$$NEW_VERSION"; \
	$(MAKE) tag VERSION=v$$NEW_VERSION

release-major: ## Create next major tag from current version (default 1.0.0)
	@BASE=$(CURRENT_VERSION); \
	MAJOR=$$(echo $$BASE | cut -d. -f1); \
	NEW_MAJOR=$$((MAJOR + 1)); \
	NEW_VERSION="$$NEW_MAJOR.0.0"; \
	echo "Creating major release v$$NEW_VERSION"; \
	$(MAKE) tag VERSION=v$$NEW_VERSION

list-releases: ## List the latest version tags
	@git tag -l "v*.*.*" | sort -V | tail -10
