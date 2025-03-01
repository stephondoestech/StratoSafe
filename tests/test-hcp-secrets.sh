#!/bin/bash
set -e

# ==========================================
# HCP Vault Secrets Testing Script
# ==========================================
# This script performs a complete test of HCP Vault Secrets:
# 1. Validates environment variables
# 2. Obtains a fresh OAuth token
# 3. Lists available applications
# 4. Lists available secrets
# 5. Retrieves and displays secret values
# ==========================================

# Determine script directory and set project root to one directory up
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# ==========================
# Step 1: Environment Setup
# ==========================

echo "HCP Vault Secrets Testing Script"
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

# Validate required environment variables
missing_vars=0
if [ -z "$HCP_CLIENT_ID" ]; then
  echo "Error: HCP_CLIENT_ID is not set"
  missing_vars=1
fi

if [ -z "$HCP_CLIENT_SECRET" ]; then
  echo "Error: HCP_CLIENT_SECRET is not set"
  missing_vars=1
fi

if [ -z "$HCP_ORGANIZATION_ID" ]; then
  echo "Error: HCP_ORGANIZATION_ID is not set"
  missing_vars=1
fi

if [ -z "$HCP_PROJECT_ID" ]; then
  echo "Error: HCP_PROJECT_ID is not set"
  missing_vars=1
fi

if [ $missing_vars -eq 1 ]; then
  echo "One or more required environment variables are missing. Please check your .env file."
  exit 1
fi

# Application name
APP_NAME=${HCP_APP_NAME:-"stratosafe"}
echo "Using application name: $APP_NAME"

# ==========================
# Step 2: Obtain OAuth Token
# ==========================

echo ""
echo "Step 2: Obtaining OAuth Token"

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

echo "Successfully obtained OAuth token"
echo "Token: ${HCP_API_TOKEN:0:10}... (truncated for security)"

# Update the .env file with the new token
if grep -q "HCP_API_TOKEN" "$ENV_FILE"; then
  sed -i.bak "s|^HCP_API_TOKEN=.*|HCP_API_TOKEN=$HCP_API_TOKEN|" "$ENV_FILE"
  rm -f "$ENV_FILE.bak"  # Remove backup file
else
  echo "HCP_API_TOKEN=$HCP_API_TOKEN" >> "$ENV_FILE"
fi

# Export the token for this session
export HCP_API_TOKEN

# ==========================
# Step 3: List Applications
# ==========================

echo ""
echo "Step 3: Listing Available Applications"

applications_response=$(curl -s --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps" \
  --header "Authorization: Bearer ${HCP_API_TOKEN}")

# Check for errors
error=$(echo "$applications_response" | jq -r '.error.message // empty')
if [ ! -z "$error" ]; then
  echo "Error listing applications: $error"
  echo "Full response: $applications_response"
  exit 1
fi

# Extract and display applications
app_count=$(echo "$applications_response" | jq -r '.applications | length // 0')
if [ "$app_count" -eq 0 ]; then
  echo "No applications found in organization $HCP_ORGANIZATION_ID, project $HCP_PROJECT_ID"
else
  echo "Found $app_count application(s):"
  echo "$applications_response" | jq -r '.applications[] | "- " + .name'
  
  # Check if our application exists
  app_exists=$(echo "$applications_response" | jq -r --arg APP "$APP_NAME" '.applications[] | select(.name == $APP) | .name // empty')
  if [ -z "$app_exists" ]; then
    echo "WARNING: Application '$APP_NAME' does not exist in this organization/project"
    echo "Please create it in the HCP Vault Secrets UI or use a different application name"
  else
    echo "Application '$APP_NAME' exists!"
  fi
fi

# ==========================
# Step 4: List Secrets
# ==========================

echo ""
echo "Step 4: Listing Available Secrets"

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

# Create array of expected secrets
expected_secrets=("dockerhub_username" "dockerhub_token" "db_username" "db_password" "jwt_secret")

# Check if all expected secrets exist
for secret in "${expected_secrets[@]}"; do
  secret_exists=$(echo "$secrets_response" | jq -r --arg SECRET "$secret" '.secrets[] | select(.name == $SECRET) | .name // empty')
  if [ -z "$secret_exists" ]; then
    echo "WARNING: Expected secret '$secret' does not exist"
  fi
done

# ==========================
# Step 5: Retrieve Secrets
# ==========================

echo ""
echo "Step 5: Retrieving Secret Values"

# Function to get a specific secret using two-step process
get_secret_value() {
  local app_name=$1
  local secret_name=$2
  
  echo ""
  echo "Testing secret: $secret_name"
  
  # First, get the metadata to verify the secret exists
  metadata_response=$(curl -s --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${app_name}/secrets/${secret_name}" \
    --header "Authorization: Bearer ${HCP_API_TOKEN}")
  
  # Check for errors
  error=$(echo "$metadata_response" | jq -r '.error.message // empty')
  if [ ! -z "$error" ]; then
    echo "Error checking secret metadata: $error"
    return 1
  fi
  
  # Check if the secret exists
  secret_exists=$(echo "$metadata_response" | jq -r '.secret.name // empty')
  if [ -z "$secret_exists" ]; then
    echo "ERROR: Secret '$secret_name' doesn't exist"
    return 1
  fi
  
  echo "Secret metadata found. Retrieving secret value..."
  
  # Second, use the open endpoint to get the actual secret value
  value_response=$(curl -s --location "https://api.cloud.hashicorp.com/secrets/2023-06-13/organizations/${HCP_ORGANIZATION_ID}/projects/${HCP_PROJECT_ID}/apps/${app_name}/open/${secret_name}" \
    --header "Authorization: Bearer ${HCP_API_TOKEN}")
  
  # Check for errors
  error=$(echo "$value_response" | jq -r '.error.message // empty')
  if [ ! -z "$error" ]; then
    echo "Error fetching secret value: $error"
    return 1
  fi
  
  # Extract and print the secret value
  secret_value=$(echo "$value_response" | jq -r '.open_secrets_response.data // "null"')
  
  if [ "$secret_value" = "null" ]; then
    echo "WARNING: Secret value is null. You may not have permission to open this secret."
  else
    echo "Successfully retrieved secret value!"
    echo "Value: $secret_value"
    
    # Parse the secret in key=value format
    key=$(echo "$secret_value" | cut -d= -f1)
    value=$(echo "$secret_value" | cut -d= -f2-)
    
    # If we got valid key=value, print it nicely
    if [ ! -z "$key" ] && [ "$key" != "$secret_value" ]; then
      echo "Parsed as: $key = $value"
    fi
  fi
}

# Test with each expected secret
for secret in "${expected_secrets[@]}"; do
  get_secret_value "$APP_NAME" "$secret"
done

# ==========================
# Step 6: Summary
# ==========================

echo ""
echo "Step 6: Summary"
echo "====================================="
echo "HCP Vault Secrets testing completed!"
echo ""
echo "Next steps:"
echo "1. Ensure all required secrets exist and have values"
echo "2. Update your GitHub Actions workflow to use these secrets"
echo "3. Run a test build with the GitHub Actions workflow"
echo "====================================="
