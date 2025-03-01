#!/bin/bash
set -e

# Determine script directory and set project root to one directory up
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

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
if [ -z "$HCP_CLIENT_ID" ] || [ -z "$HCP_CLIENT_SECRET" ]; then
  echo "Error: HCP_CLIENT_ID and HCP_CLIENT_SECRET must be set in .env"
  exit 1
fi

if [ -z "$HCP_ORGANIZATION_ID" ] || [ -z "$HCP_PROJECT_ID" ]; then
  echo "Error: HCP_ORGANIZATION_ID and HCP_PROJECT_ID must be set in .env"
  exit 1
fi

# Application name
APP_NAME=${HCP_APP_NAME:-"stratosafe"}
echo "Using application name: $APP_NAME"

# Function to get a fresh token
get_fresh_token() {
  echo "Obtaining a fresh OAuth token..."
  
  HCP_API_TOKEN=$(curl --location "https://auth.idp.hashicorp.com/oauth2/token" \
    --header "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "client_id=$HCP_CLIENT_ID" \
    --data-urlencode "client_secret=$HCP_CLIENT_SECRET" \
    --data-urlencode "grant_type=client_credentials" \
    --data-urlencode "audience=https://api.hashicorp.cloud" | jq -r .access_token)
  
  if [ -z "$HCP_API_TOKEN" ] || [ "$HCP_API_TOKEN" = "null" ]; then
    echo "Failed to obtain OAuth token."
    exit 1
  fi
  
  echo "Successfully obtained fresh OAuth token"
  echo "Token: ${HCP_API_TOKEN:0:10}... (truncated for security)"
  
  # Update the .env file with the new token
  if grep -q "HCP_API_TOKEN" "$ENV_FILE"; then
    sed -i.bak "s|^HCP_API_TOKEN=.*|HCP_API_TOKEN=$HCP_API_TOKEN|" "$ENV_FILE"
    rm -f "$ENV_FILE.bak"  # Remove backup file
  else
    echo "HCP_API_TOKEN=$HCP_API_TOKEN" >> "$ENV_FILE"
  fi
  
  # Export the new token
  export HCP_API_TOKEN
}

# Always get a fresh token to ensure it's valid
get_fresh_token

# Function to test a secret
test_secret() {
  local secret_name=$1
  
  echo "Testing secret: $secret_name"
  
  # First check the secret exists
  metadata_response=$(curl -s --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/secrets/${secret_name}" \
    --header "Authorization: Bearer ${HCP_API_TOKEN}")
  
  # Check for error in response
  error=$(echo "$metadata_response" | jq -r '.error.message // empty')
  if [ ! -z "$error" ]; then
    echo "Error checking secret metadata: $error"
    echo "Response: $metadata_response"
    return 1
  fi
  
  # Check if secret exists
  secret_exists=$(echo "$metadata_response" | jq -r '.secret.name // empty')
  if [ -z "$secret_exists" ]; then
    echo "Secret $secret_name doesn't exist"
    return 1
  fi
  
  echo "Secret $secret_name exists. Trying to retrieve latest version..."
  
  # Now try to get the latest version
  version_response=$(curl -s --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/secrets/${secret_name}/versions/latest" \
    --header "Authorization: Bearer ${HCP_API_TOKEN}")
  
  # Check for error
  error=$(echo "$version_response" | jq -r '.error.message // empty')
  if [ ! -z "$error" ]; then
    echo "Error retrieving secret value: $error"
    echo "Response: $version_response"
    return 1
  fi
  
  # Extract value
  value=$(echo "$version_response" | jq -r '.data // "null"')
  if [ "$value" = "null" ]; then
    echo "WARNING: Retrieved null value for secret"
  else
    echo "Successfully retrieved value for secret $secret_name"
    echo "Value: $value"
  fi
}

echo "Testing secret retrieval with fresh token"
echo "========================================="

# Test each secret
test_secret "dockerhub_username"
test_secret "dockerhub_token"
test_secret "db_username"
test_secret "db_password"
test_secret "jwt_secret"

echo "========================================="
echo "Secret testing complete"
