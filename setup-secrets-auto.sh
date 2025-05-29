#!/bin/bash

# Automated script to set up secrets in Google Secret Manager
set -e

echo "🔐 Setting up secrets for NubemGenesis Orchestrator (Automated)"
echo "=============================================================="

PROJECT_ID=$(gcloud config get-value project)
echo "Using project: $PROJECT_ID"

# Function to create or update a secret
create_secret() {
    SECRET_NAME=$1
    SECRET_VALUE=$2
    
    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID &> /dev/null; then
        echo "Updating secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
    else
        echo "Creating secret: $SECRET_NAME"
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=- --replication-policy="automatic" --project=$PROJECT_ID
    fi
}

# Create required secrets with default/dummy values
echo "📝 Creating LiteLLM configuration..."
LITELLM_MASTER_KEY="sk-nm-$(openssl rand -hex 16)"
create_secret "litellm-master-key" "$LITELLM_MASTER_KEY"

# Create placeholder API keys (to be updated later with real values)
echo "🔑 Creating placeholder API keys..."
create_secret "openai-api-key" "sk-placeholder-update-with-real-key"
create_secret "anthropic-api-key" "sk-ant-placeholder-update-with-real-key"
create_secret "google-api-key" "placeholder-update-with-real-key"
create_secret "mistral-api-key" "placeholder-update-with-real-key"
create_secret "together-api-key" "placeholder-update-with-real-key"

# Database configuration
echo "💾 Creating database configuration..."
DATABASE_URL="postgresql://nubemgenesis:nubemgenesis123@10.0.0.3:5432/nubemgenesis"
create_secret "database-url" "$DATABASE_URL"

REDIS_URL="redis://10.0.0.4:6379"
create_secret "redis-url" "$REDIS_URL"

# Application secrets
echo "🔒 Creating application secrets..."
JWT_SECRET=$(openssl rand -hex 32)
create_secret "jwt-secret" "$JWT_SECRET"

FLOWISE_SECRET=$(openssl rand -hex 32)
create_secret "flowise-secret" "$FLOWISE_SECRET"

# Observability secrets (placeholders)
echo "📊 Creating observability configuration..."
create_secret "langsmith-api-key" "placeholder-update-if-needed"
create_secret "langfuse-public-key" "placeholder-update-if-needed"
create_secret "langfuse-secret-key" "placeholder-update-if-needed"

# Create service account if it doesn't exist
echo -e "\n👤 Setting up service account..."
SERVICE_ACCOUNT="nubemgenesis-orchestrator"

if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com --project=$PROJECT_ID &> /dev/null; then
    echo "Creating service account..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
        --display-name="NubemGenesis Orchestrator Service Account" \
        --project=$PROJECT_ID
fi

# Grant necessary permissions
echo "🔐 Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --project=$PROJECT_ID

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project=$PROJECT_ID

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudscheduler.jobRunner" \
    --project=$PROJECT_ID

# Grant Cloud Build permissions
echo "🏗️ Granting Cloud Build permissions..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CLOUD_BUILD_SA="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUD_BUILD_SA" \
    --role="roles/run.admin" \
    --project=$PROJECT_ID

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUD_BUILD_SA" \
    --role="roles/iam.serviceAccountUser" \
    --project=$PROJECT_ID

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUD_BUILD_SA" \
    --role="roles/cloudscheduler.admin" \
    --project=$PROJECT_ID

echo -e "\n✅ Secrets setup complete!"
echo ""
echo "⚠️  IMPORTANT: Update these placeholder secrets with real values:"
echo "   - openai-api-key"
echo "   - anthropic-api-key"
echo "   - google-api-key"
echo "   - mistral-api-key"
echo "   - together-api-key"
echo ""
echo "To update a secret:"
echo "echo -n 'your-real-api-key' | gcloud secrets versions add SECRET_NAME --data-file=-"
echo ""
echo "📦 Ready to deploy! Run:"
echo "gcloud builds submit --config cloudbuild-orchestrator.yaml --project=$PROJECT_ID"