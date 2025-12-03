# StratoSafe

Secure, TypeScript-first monorepo for encrypted file storage with MFA, RBAC, and a React UI.

## Overview
- Backend: Node.js/Express + TypeORM + PostgreSQL; JWT auth, MFA, rate limiting.
- Frontend: React + Material UI with protected routes and profile/security pages.
- Container-ready: Docker Compose spins up API, DB, and frontend.

## Tech Stack
- Node.js 22+, Yarn workspaces, TypeScript
- Express, TypeORM, PostgreSQL
- React, React Router, Material UI
- Jest + Supertest, React Testing Library

## Prerequisites
- Node.js 22 or later and Yarn
- PostgreSQL (local or via Docker)
- Docker & Docker Compose (optional, recommended for parity)

## Quick Start (local)
```bash
git clone https://github.com/stephondoestech/stratosafe.git
cd stratosafe
make config           # copies .env.example to .env
make install          # yarn install across workspaces
make run              # starts backend + frontend concurrently
```
Backend API: http://localhost:3001 • Frontend: http://localhost:3000

## Environment
Edit `.env` before running. Required/important keys:
- `JWT_SECRET` (32+ chars, required)  
- `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_PORT`  
- `UPLOAD_MAX_SIZE_MB` (default 10), `UPLOAD_ALLOWED_MIME` (CSV list)  
Server exits if the database cannot be reached outside test mode.

## Commands
- `make install` – install dependencies
- `make run` – start backend + frontend
- `make build` – build backend then frontend
- `make docker` – compose up with builds
- `yarn test` – backend tests; `yarn test:coverage` for coverage
- `yarn lint` / `yarn lint:fix` – lint backend
- `yarn workspace stratosafe-frontend test` – frontend tests

## Project Structure
- `backend/` – Express API (`src/controllers`, `routes`, `models`, `middlewares`, `__tests__`)
- `frontend/` – React app (`src/components`, `pages`, `context`, `services`)
- `tests/` – helper shell scripts for CI-style checks
- `Dockerfile`, `docker-compose.yml` – container setup

## Docker Workflow
```bash
make docker          # build + run all services
# or
docker compose up --build
```

## Unraid (CA Apps, single image)
1) In Unraid, open Community Apps, search for “StratoSafe”, and click Install. The template deploys the combined image (backend + frontend).  
2) Set template variables:  
   - `PORT` (container listens on 3001; map to your desired host port)  
   - `DB_HOST`, `DB_PORT` (5432), `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`  
   - `JWT_SECRET` (32+ chars, required)  
   - Optional: `UPLOAD_MAX_SIZE_MB`, `UPLOAD_ALLOWED_MIME`, `LOG_LEVEL`  
3) Volume mapping: host `/mnt/user/appdata/stratosafe/uploads` → container `/app/uploads` to persist uploads.  
4) Port mapping: container 3001 → your chosen host port. The bundled frontend serves from the same container and proxies `/api` to the backend.  
5) Apply to start the container, then visit `http://<unraid-ip>:<host-port>` in your browser; verify signup/login and uploads.  

## Security Notes
- Do not commit secrets; keep `.env` local.
- Rate limiting and JWT auth are enforced; keep `JWT_SECRET` strong and rotate when possible.
- Uploaded files live under `backend/uploads/`; adjust allowed MIME types and size limits via env vars.
