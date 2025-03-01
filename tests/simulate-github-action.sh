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
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
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
  
  # Get the secret using the working approach
  response=$(curl -s -X GET \
    "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/open/${secret_name}" \
    -H "Authorization: Bearer ${HCP_API_TOKEN}" \
    -H "Content-Type: application/json")
  
  # Extract the secret value using the correct JSON path
  secret_value=$(echo "$response" | jq -r '.secret.version.value // "null"')
  
  if [ "$secret_value" = "null" ]; then
    echo "Error: Failed to retrieve secret value for $secret_name"
    echo "Response: $response"
    return 1
  fi
  
  # Parse the key=value format
  key=$(echo "$secret_value" | cut -d= -f1)
  value=$(echo "$secret_value" | cut -d= -f2-)
  
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
[[ -n "$DOCKERHUB_USERNAME" ]] && echo "- DOCKERHUB_USERNAME ✓" || echo "! DOCKERHUB_USERNAME missing"
[[ -n "$DOCKERHUB_TOKEN" ]] && echo "- DOCKERHUB_TOKEN ✓" || echo "! DOCKERHUB_TOKEN missing"
[[ -n "$DB_USERNAME" ]] && echo "- DB_USERNAME ✓" || echo "! DB_USERNAME missing"
[[ -n "$DB_PASSWORD" ]] && echo "- DB_PASSWORD ✓" || echo "! DB_PASSWORD missing"
[[ -n "$JWT_SECRET" ]] && echo "- JWT_SECRET ✓" || echo "! JWT_SECRET missing"

# Step 4: Simulate Docker build
echo "Step 4: Simulating Docker build commands..."
echo "docker build -t $DOCKERHUB_USERNAME/stratosafe-backend:local $PROJECT_ROOT/backend --build-arg DB_USERNAME=$DB_USERNAME --build-arg DB_PASSWORD=$DB_PASSWORD --build-arg JWT_SECRET=$JWT_SECRET"
echo "docker build -t $DOCKERHUB_USERNAME/stratosafe-frontend:local $PROJECT_ROOT/frontend"

# Ask if the user wants to execute the Docker builds
echo ""
echo "Would you like to execute these Docker build commands? (y/n)"
read -r execute_docker

if [[ "$execute_docker" =~ ^[Yy]$ ]]; then
  echo "Executing Docker builds..."
  # Use PROJECT_ROOT to reference directories correctly
  docker build -t "$DOCKERHUB_USERNAME/stratosafe-backend:local" "$PROJECT_ROOT/backend" --build-arg DB_USERNAME="$DB_USERNAME" --build-arg DB_PASSWORD="$DB_PASSWORD" --build-arg JWT_SECRET="$JWT_SECRET"
  docker build -t "$DOCKERHUB_USERNAME/stratosafe-frontend:local" "$PROJECT_ROOT/frontend"
  
  echo "Docker builds completed."
  echo "You can run the containers with:"
  echo "docker run -p 3001:3001 -e DB_HOST=host.docker.internal -e DB_PORT=5432 -e DB_USERNAME=$DB_USERNAME -e DB_PASSWORD=$DB_PASSWORD -e JWT_SECRET=$JWT_SECRET $DOCKERHUB_USERNAME/stratosafe-backend:local"
  echo "docker run -p 3000:3000 $DOCKERHUB_USERNAME/stratosafe-frontend:local"
else
  echo "Skipping Docker builds."
fi

echo "=========================================="
echo "Simulation complete"
