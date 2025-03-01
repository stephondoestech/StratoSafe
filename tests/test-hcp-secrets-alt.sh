#!/bin/bash
set -e

# ==========================================
# Fixed HCP Vault Secrets Script
# ==========================================
# Using the correct JSON path to extract values
# ==========================================

# Determine script directory and set project root to one directory up
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Fixed HCP Vault Secrets Script"
echo "====================================="
echo "Step 1: Environment Setup"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"

# Load environment variables from .env file
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment from $ENV_FILE"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "No .env file found at $ENV_FILE"
  exit 1
fi

# Check required environment variables
if [ -z "$HCP_API_TOKEN" ]; then
  echo "Error: HCP_API_TOKEN must be set"
  echo "Run ./test-hcp-auth.sh first to get a token"
  exit 1
fi

if [ -z "$HCP_ORGANIZATION_ID" ] || [ -z "$HCP_PROJECT_ID" ]; then
  echo "Error: HCP_ORGANIZATION_ID and HCP_PROJECT_ID must be set in .env"
  exit 1
fi

# Application name
APP_NAME=${HCP_APP_NAME:-"stratosafe"}
echo "Using application name: $APP_NAME"

# ==========================
# Step 2: List Secrets
# ==========================

echo ""
echo "Step 2: Listing Available Secrets"

secrets_response=$(curl -s --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/secrets" \
  --header "Authorization: Bearer ${HCP_API_TOKEN}")

# Check for errors
error=$(echo "$secrets_response" | jq -r '.error.message // empty')
if [ ! -z "$error" ]; then
  echo "Error listing secrets: $error"
  echo "Full response: $secrets_response"
  exit 1
fi

# Extract and display secrets
secret_count=$(echo "$secrets_response" | jq -r '.secrets | length // 0')
if [ "$secret_count" -eq 0 ]; then
  echo "No secrets found in application '$APP_NAME'"
else
  echo "Found $secret_count secret(s):"
  echo "$secrets_response" | jq -r '.secrets[] | "- " + .name'
fi

# ==========================
# Step 3: Retrieve All Secrets
# ==========================

echo ""
echo "Step 3: Retrieving All Secret Values"

# Create array of expected secrets
expected_secrets=("dockerhub_username" "dockerhub_token" "db_username" "db_password" "jwt_secret")

# Function to get a specific secret using the correct JSON path
get_secret_value() {
  local secret_name=$1
  
  echo ""
  echo "Retrieving secret: $secret_name"
  
  # Get secret directly - using the approach that we found works
  response=$(curl -s --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/open/${secret_name}" \
    --header "Authorization: Bearer ${HCP_API_TOKEN}")
  
  # Check for errors
  error=$(echo "$response" | jq -r '.error.message // empty')
  if [ ! -z "$error" ]; then
    echo "Error fetching secret value: $error"
    return 1
  fi
  
  # Extract the secret value using the CORRECT path (.secret.version.value)
  secret_value=$(echo "$response" | jq -r '.secret.version.value // "null"')
  
  if [ "$secret_value" = "null" ]; then
    echo "WARNING: Secret value is null. This means the JSON path might be incorrect."
    echo "Full response:"
    echo "$response" | jq '.'
    return 1
  fi
  
  echo "Successfully retrieved secret value!"
  echo "Value: $secret_value"
  
  # Parse the secret in key=value format
  key=$(echo "$secret_value" | cut -d= -f1)
  value=$(echo "$secret_value" | cut -d= -f2-)
  
  # If we got valid key=value, print it nicely
  if [ ! -z "$key" ] && [ "$key" != "$secret_value" ]; then
    echo "Parsed as: $key = $value"
  fi
  
  # Export the value as an environment variable
  env_name=$(echo "$key" | tr '[:lower:]' '[:upper:]')
  export "$env_name"="$value"
  echo "Exported as environment variable: $env_name=$value"
}

# Test with each expected secret
for secret in "${expected_secrets[@]}"; do
  get_secret_value "$secret"
done

# ==========================
# Step 4: Verify and Summarize
# ==========================

echo ""
echo "Step 4: Verifying Environment Variables"
echo "====================================="
echo "Environment variables set:"
[[ -n "$DOCKERHUB_USERNAME" ]] && echo "- DOCKERHUB_USERNAME ✓" || echo "! DOCKERHUB_USERNAME missing"
[[ -n "$DOCKERHUB_TOKEN" ]] && echo "- DOCKERHUB_TOKEN ✓" || echo "! DOCKERHUB_TOKEN missing"
[[ -n "$DB_USERNAME" ]] && echo "- DB_USERNAME ✓" || echo "! DB_USERNAME missing"
[[ -n "$DB_PASSWORD" ]] && echo "- DB_PASSWORD ✓" || echo "! DB_PASSWORD missing"
[[ -n "$JWT_SECRET" ]] && echo "- JWT_SECRET ✓" || echo "! JWT_SECRET missing"

echo ""
echo "====================================="
echo "HCP Vault Secrets script completed successfully!"
echo ""
echo "You can now use these environment variables in your local development"
echo "Use the following command to simulate a Docker build:"
echo "docker build -t $DOCKERHUB_USERNAME/stratosafe-backend:local ./backend \\"
echo "  --build-arg DB_USERNAME=$DB_USERNAME \\"
echo "  --build-arg DB_PASSWORD=$DB_PASSWORD \\"
echo "  --build-arg JWT_SECRET=$JWT_SECRET"
echo "====================================="
