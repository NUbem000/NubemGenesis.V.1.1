#!/bin/bash

# Deploy del servidor V2 demo/standalone
set -e

echo "🚀 Deploying NubemGenesis V2 Demo Server..."

PROJECT_ID="nubemgenesis-v1-1"
REGION="us-central1"
SERVICE_NAME="nubemgenesis-v2-demo"
IMAGE_NAME="gcr.io/${PROJECT_ID}/nubemgenesis-v2-demo"

# Configurar proyecto
gcloud config set project ${PROJECT_ID}

# Build y push usando Cloud Build
echo "🏗️ Building demo server..."
gcloud builds submit \
  --tag ${IMAGE_NAME}:latest \
  --timeout=10m

# Deploy a Cloud Run
echo "☁️ Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --memory 512Mi \
  --cpu 1 \
  --timeout 60 \
  --min-instances 0 \
  --max-instances 5 \
  --allow-unauthenticated

# Obtener URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ V2 Demo Server deployed successfully!"
echo "🌐 Service URL: ${SERVICE_URL}"
echo ""
echo "📋 Test the V2 endpoints:"
echo ""
echo "1. Templates:"
echo "   curl ${SERVICE_URL}/api/v2/orchestrate/templates"
echo ""
echo "2. Orchestration with clarification:"
echo "   curl -X POST ${SERVICE_URL}/api/v2/orchestrate/orchestrate \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\": \"I need to analyze documents\"}'"
echo ""
echo "3. Health check:"
echo "   curl ${SERVICE_URL}/health"