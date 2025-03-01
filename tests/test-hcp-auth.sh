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
if [ -z "$HCP_CLIENT_ID" ] || [ -z "$HCP_CLIENT_SECRET" ]; then
  echo "Error: HCP_CLIENT_ID and HCP_CLIENT_SECRET must be set"
  echo "Create a .env file with these variables or export them directly"
  exit 1
fi

# Request OAuth token using the correct endpoint and format
echo "Requesting OAuth token from HCP..."
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


echo "Successfully obtained HCP OAuth token"
echo "Token: ${HCP_API_TOKEN:0:10}... (truncated for security)"

# Update or create .env file
ENV_FILE="$PROJECT_ROOT/.env"
if [ -f "$ENV_FILE" ]; then
  # Check if HCP_API_TOKEN already exists in the file
  if grep -q "^HCP_API_TOKEN=" "$ENV_FILE"; then
    # Update existing token
    # Create a temporary file with the sed command
    sed "s|^HCP_API_TOKEN=.*|HCP_API_TOKEN=$HCP_API_TOKEN|" "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
    echo "Updated existing HCP_API_TOKEN in .env file"
  else
    # Append token to existing file
    echo "HCP_API_TOKEN=$HCP_API_TOKEN" >> "$ENV_FILE"
    echo "Added HCP_API_TOKEN to existing .env file"
  fi
else
  # Create a new .env file
  echo "HCP_API_TOKEN=$HCP_API_TOKEN" > "$ENV_FILE"
  echo "Created new .env file with token"
fi

# Export for current session as well
export HCP_API_TOKEN

echo "Token is now available as \$HCP_API_TOKEN in your environment"
