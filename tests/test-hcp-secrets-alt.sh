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

# First let's check what secret versions are available
get_secret_value() {
  local app_name=$1
  local secret_name=$2

echo "Checking secret metadata first:"
SECRET_NAME="jwt_secret"
metadata_response=$(curl -s --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/secrets/${SECRET_NAME}" \
  --header "Authorization: Bearer ${HCP_API_TOKEN}")

echo "Metadata response for $SECRET_NAME:"
echo "$metadata_response" | jq '.'

# Now check if the version value is actually available
VERSION=$(echo "$metadata_response" | jq -r '.secret.version.version // "1"')
echo "Version number from metadata: $VERSION"

# Now try to get the specific version
echo "Trying to get specific version $VERSION for $SECRET_NAME:"
version_response=$(curl -s -v --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/secrets/${SECRET_NAME}/versions/${VERSION}" \
  --header "Authorization: Bearer ${HCP_API_TOKEN}")

echo "Full version response:"
echo "$version_response" | jq '.'

# Try an alternative API endpoint structure
echo "Trying alternative API endpoint structure:"
alt_response=$(curl -s -v --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${APP_NAME}/open/${SECRET_NAME}" \
  --header "Authorization: Bearer ${HCP_API_TOKEN}")

echo "Alternative endpoint response:"
echo "$alt_response" | jq '.'

echo "=============================================="
echo "Debug information complete"
}

# Test with each secret
get_secret_value "$APP_NAME" "dockerhub_username"
get_secret_value "$APP_NAME" "dockerhub_token"
get_secret_value "$APP_NAME" "db_username"
get_secret_value "$APP_NAME" "db_password"
get_secret_value "$APP_NAME" "jwt_secret"
