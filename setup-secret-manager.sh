#!/bin/bash

# Script to set up Secret Manager for API keys

PROJECT_ID="nubemgenesis"
LOCATION="us-central1"

echo "Setting up Secret Manager for NubemGenesis Orchestrator..."

# Enable Secret Manager API
echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID

# Create secrets for API keys
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    
    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID >/dev/null 2>&1; then
        echo "Secret $SECRET_NAME already exists, updating..."
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
    else
        echo "Creating secret $SECRET_NAME..."
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=- --project=$PROJECT_ID
    fi
}

# Placeholder API keys - replace with actual keys
echo "Creating API key secrets..."
create_secret "openai-api-key" "sk-placeholder-openai-key"
create_secret "anthropic-api-key" "sk-placeholder-anthropic-key"
create_secret "google-api-key" "placeholder-google-key"
create_secret "cohere-api-key" "placeholder-cohere-key"
create_secret "huggingface-api-key" "hf_placeholder_key"

# Grant Cloud Run service account access to secrets
SERVICE_ACCOUNT="nubemgenesis-orchestrator@$PROJECT_ID.iam.gserviceaccount.com"

echo "Granting Secret Manager access to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

# Create Cloud Tasks queue for evaluations
echo "Setting up Cloud Tasks..."
gcloud services enable cloudtasks.googleapis.com --project=$PROJECT_ID

# Create evaluation queue
if ! gcloud tasks queues describe evaluation-queue --location=$LOCATION --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "Creating evaluation queue..."
    gcloud tasks queues create evaluation-queue \
        --location=$LOCATION \
        --max-concurrent-dispatches=10 \
        --max-attempts=3 \
        --project=$PROJECT_ID
fi

# Enable Error Reporting
echo "Enabling Error Reporting..."
gcloud services enable clouderrorreporting.googleapis.com --project=$PROJECT_ID

echo "Secret Manager setup complete!"
echo ""
echo "IMPORTANT: Replace the placeholder API keys with actual keys:"
echo "  gcloud secrets versions add openai-api-key --data-file=- --project=$PROJECT_ID"
echo "  gcloud secrets versions add anthropic-api-key --data-file=- --project=$PROJECT_ID"
echo "  gcloud secrets versions add google-api-key --data-file=- --project=$PROJECT_ID"
echo "  gcloud secrets versions add cohere-api-key --data-file=- --project=$PROJECT_ID"
echo "  gcloud secrets versions add huggingface-api-key --data-file=- --project=$PROJECT_ID"