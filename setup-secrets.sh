#!/bin/bash

# Script to set up secrets in Google Secret Manager
# Run this before deploying the orchestrator

set -e

echo "🔐 Setting up secrets for NubemGenesis Orchestrator"
echo "================================================"

# Check if gcloud is configured
if ! gcloud config get-value project &> /dev/null; then
    echo "❌ Please configure gcloud first: gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

PROJECT_ID=$(gcloud config get-value project)
echo "Using project: $PROJECT_ID"

# Function to create or update a secret
create_secret() {
    SECRET_NAME=$1
    SECRET_VALUE=$2
    
    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME &> /dev/null; then
        echo "Updating secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=-
    else
        echo "Creating secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=-
    fi
}

# LiteLLM secrets
echo -e "\n📝 Enter LiteLLM configuration:"
read -p "LiteLLM Master Key (leave empty to generate): " LITELLM_MASTER_KEY
if [ -z "$LITELLM_MASTER_KEY" ]; then
    LITELLM_MASTER_KEY="sk-nm-$(openssl rand -hex 16)"
    echo "Generated: $LITELLM_MASTER_KEY"
fi
create_secret "litellm-master-key" "$LITELLM_MASTER_KEY"

# API Keys
echo -e "\n🔑 Enter API Keys (leave empty to skip):"
read -p "OpenAI API Key: " OPENAI_KEY
[ ! -z "$OPENAI_KEY" ] && create_secret "openai-api-key" "$OPENAI_KEY"

read -p "Anthropic API Key: " ANTHROPIC_KEY
[ ! -z "$ANTHROPIC_KEY" ] && create_secret "anthropic-api-key" "$ANTHROPIC_KEY"

read -p "Google API Key: " GOOGLE_KEY
[ ! -z "$GOOGLE_KEY" ] && create_secret "google-api-key" "$GOOGLE_KEY"

read -p "Mistral API Key: " MISTRAL_KEY
[ ! -z "$MISTRAL_KEY" ] && create_secret "mistral-api-key" "$MISTRAL_KEY"

read -p "Together API Key: " TOGETHER_KEY
[ ! -z "$TOGETHER_KEY" ] && create_secret "together-api-key" "$TOGETHER_KEY"

# Database configuration
echo -e "\n💾 Enter database configuration:"
read -p "Database URL (postgresql://...): " DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL="postgresql://nubemgenesis:nubemgenesis123@localhost:5432/nubemgenesis"
    echo "Using default: $DATABASE_URL"
fi
create_secret "database-url" "$DATABASE_URL"

read -p "Redis URL (redis://...): " REDIS_URL
if [ -z "$REDIS_URL" ]; then
    REDIS_URL="redis://localhost:6379"
    echo "Using default: $REDIS_URL"
fi
create_secret "redis-url" "$REDIS_URL"

# Application secrets
echo -e "\n🔒 Application secrets:"
JWT_SECRET=$(openssl rand -hex 32)
echo "Generated JWT Secret"
create_secret "jwt-secret" "$JWT_SECRET"

FLOWISE_SECRET=$(openssl rand -hex 32)
echo "Generated Flowise Secret"
create_secret "flowise-secret" "$FLOWISE_SECRET"

# Observability secrets
echo -e "\n📊 Observability configuration (optional):"
read -p "LangSmith API Key: " LANGSMITH_KEY
[ ! -z "$LANGSMITH_KEY" ] && create_secret "langsmith-api-key" "$LANGSMITH_KEY"

read -p "Langfuse Public Key: " LANGFUSE_PUBLIC
[ ! -z "$LANGFUSE_PUBLIC" ] && create_secret "langfuse-public-key" "$LANGFUSE_PUBLIC"

read -p "Langfuse Secret Key: " LANGFUSE_SECRET
[ ! -z "$LANGFUSE_SECRET" ] && create_secret "langfuse-secret-key" "$LANGFUSE_SECRET"

# Create service account if it doesn't exist
echo -e "\n👤 Setting up service account..."
SERVICE_ACCOUNT="nubemgenesis-orchestrator@$PROJECT_ID.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT &> /dev/null; then
    echo "Creating service account..."
    gcloud iam service-accounts create nubemgenesis-orchestrator \
        --display-name="NubemGenesis Orchestrator Service Account"
fi

# Grant necessary permissions
echo "Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/run.invoker"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/cloudscheduler.jobRunner"

echo -e "\n✅ Secrets setup complete!"
echo "You can now run: gcloud builds submit --config cloudbuild-orchestrator.yaml"