#!/bin/bash

# Enable required Google Cloud APIs for NubemGenesis Orchestrator
set -e

echo "🔧 Enabling required Google Cloud APIs"
echo "====================================="

PROJECT_ID=$(gcloud config get-value project)
echo "Project: $PROJECT_ID"

# List of required APIs
APIS=(
    "secretmanager.googleapis.com"      # Secret Manager
    "run.googleapis.com"                # Cloud Run
    "cloudbuild.googleapis.com"         # Cloud Build
    "cloudscheduler.googleapis.com"     # Cloud Scheduler
    "containerregistry.googleapis.com"  # Container Registry
    "compute.googleapis.com"            # Compute Engine (for Cloud Build)
    "iam.googleapis.com"                # IAM
    "logging.googleapis.com"            # Cloud Logging
    "monitoring.googleapis.com"         # Cloud Monitoring
)

echo ""
echo "📋 Enabling APIs..."
for api in "${APIS[@]}"; do
    echo -n "   Enabling $api... "
    if gcloud services enable $api --project=$PROJECT_ID 2>/dev/null; then
        echo "✅"
    else
        echo "⚠️  (may already be enabled)"
    fi
done

echo ""
echo "⏳ Waiting for APIs to propagate (30 seconds)..."
sleep 30

echo ""
echo "✅ APIs enabled successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Run: ./setup-secrets-auto.sh"
echo "2. Then: gcloud builds submit --config cloudbuild-orchestrator.yaml"