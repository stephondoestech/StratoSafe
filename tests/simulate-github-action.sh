#!/bin/bash
set -e

# Determine script directory and set project root to one directory up
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Script directory: $SCRIPT_DIR"
echo "Looking for .env file at: $PROJECT_ROOT/.env"

# Load environment variables from .env file in the parent directory
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "Loading environment from $PROJECT_ROOT/.env"
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
  echo "No .env file found at $PROJECT_ROOT/.env"
fi

echo "Simulating GitHub Actions workflow locally"
echo "=========================================="

# Step 1: Obtain OAuth token (if not already set)
if [ -z "$HCP_API_TOKEN" ]; then
  echo "Step 1: Obtaining OAuth token..."
  ./test-hcp-auth.sh
  # Reload environment with new token
  export $(grep -v '^#' .env | xargs)
else
  echo "Step 1: Using existing OAuth token"
fi

# Step 2: Fetch secrets and set as environment variables
echo "Step 2: Fetching secrets from HCP Vault..."

APP_NAME="stratosafe"

fetch_secret() {
  local secret_name=$1
  local env_name=$2
  
  echo "Fetching secret: $secret_name"
  
  response=$(curl -s -X GET \
    "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/secrets/${secret_name}" \
    -H "Authorization: Bearer ${HCP_API_TOKEN}" \
    -H "Content-Type: application/json")
  
  # Extract the secret data and parse it
  secret_data=$(echo "$response" | jq -r '.data')
  value=$(echo "$secret_data" | cut -d= -f2-)
  
  # Set as environment variable
  export $env_name="$value"
  echo "Set $env_name from $secret_name"
}

fetch_secret "dockerhub_username" "DOCKERHUB_USERNAME"
fetch_secret "dockerhub_token" "DOCKERHUB_TOKEN"
fetch_secret "db_username" "DB_USERNAME"
fetch_secret "db_password" "DB_PASSWORD"
fetch_secret "jwt_secret" "JWT_SECRET"

# Step 3: Verify all secrets were retrieved
echo "Step 3: Verifying secrets..."
echo "Retrieved the following secrets (showing variable names only, not values):"
[[ -n "$DOCKERHUB_USERNAME" ]] && echo "- DOCKERHUB_USERNAME" || echo "! DOCKERHUB_USERNAME missing"
[[ -n "$DOCKERHUB_TOKEN" ]] && echo "- DOCKERHUB_TOKEN" || echo "! DOCKERHUB_TOKEN missing"
[[ -n "$DB_USERNAME" ]] && echo "- DB_USERNAME" || echo "! DB_USERNAME missing"
[[ -n "$DB_PASSWORD" ]] && echo "- DB_PASSWORD" || echo "! DB_PASSWORD missing"
[[ -n "$JWT_SECRET" ]] && echo "- JWT_SECRET" || echo "! JWT_SECRET missing"

# Step 4: Simulate Docker build
echo "Step 4: Simulating Docker build commands..."
echo "docker build -t $DOCKERHUB_USERNAME/stratosafe-backend:local ./backend --build-arg DB_USERNAME=$DB_USERNAME --build-arg DB_PASSWORD=$DB_PASSWORD --build-arg JWT_SECRET=$JWT_SECRET"
echo "docker build -t $DOCKERHUB_USERNAME/stratosafe-frontend:local ./frontend"

# Uncomment to actually run the Docker builds
# docker build -t $DOCKERHUB_USERNAME/stratosafe-backend:local ./backend --build-arg DB_USERNAME=$DB_USERNAME --build-arg DB_PASSWORD=$DB_PASSWORD --build-arg JWT_SECRET=$JWT_SECRET
# docker build -t $DOCKERHUB_USERNAME/stratosafe-frontend:local ./frontend

echo "=========================================="
echo "Simulation complete"
