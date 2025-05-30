#!/bin/bash

# Script simplificado de deployment para NubemGenesis V2 con RAG
# Usa Cloud Build para evitar problemas de dependencias locales

set -e

echo "🚀 Iniciando deployment de NubemGenesis Orchestrator V2 con RAG..."

# Variables
PROJECT_ID="nubemgenesis-v1-1"
REGION="us-central1"
SERVICE_NAME="nubemgenesis-orchestrator-v2"

# Verificar gcloud
command -v gcloud >/dev/null 2>&1 || { echo "❌ gcloud CLI no está instalado"; exit 1; }

# Configurar proyecto
echo "🔧 Configurando proyecto GCP..."
gcloud config set project ${PROJECT_ID}

# Crear cloudbuild.yaml específico para V2
echo "📝 Creando configuración de Cloud Build..."
cat > cloudbuild-orchestrator-v2.yaml << 'EOF'
steps:
  # Step 1: Build the application using Cloud Build
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'Dockerfile.production'
      - '-t'
      - 'gcr.io/$PROJECT_ID/nubemgenesis-orchestrator-v2:$BUILD_ID'
      - '-t'
      - 'gcr.io/$PROJECT_ID/nubemgenesis-orchestrator-v2:latest'
      - '.'
    timeout: '1200s'

  # Step 2: Push the image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - '--all-tags'
      - 'gcr.io/$PROJECT_ID/nubemgenesis-orchestrator-v2'

  # Step 3: Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'nubemgenesis-orchestrator-v2'
      - '--image'
      - 'gcr.io/$PROJECT_ID/nubemgenesis-orchestrator-v2:$BUILD_ID'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--memory'
      - '2Gi'
      - '--cpu'
      - '2'
      - '--timeout'
      - '300'
      - '--concurrency'
      - '100'
      - '--min-instances'
      - '1'
      - '--max-instances'
      - '10'
      - '--set-env-vars'
      - 'NODE_ENV=production,USE_ORCHESTRATOR_V2=true,USE_LITELLM_V2=true,FLOWISE_USERNAME=admin'
      - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/nubemgenesis-orchestrator-v2:$BUILD_ID'
  - 'gcr.io/$PROJECT_ID/nubemgenesis-orchestrator-v2:latest'

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'
EOF

# Ejecutar Cloud Build
echo "🏗️ Iniciando Cloud Build..."
gcloud builds submit . \
  --config=cloudbuild-orchestrator-v2.yaml \
  --substitutions=_SERVICE_NAME=${SERVICE_NAME} \
  --timeout=30m

# Obtener URL del servicio
echo "🔍 Obteniendo información del servicio..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ ¡Deployment completado exitosamente!"
echo ""
echo "🌐 Servicio disponible en: ${SERVICE_URL}"
echo ""
echo "📊 Nuevas características V2 con RAG:"
echo "   ✨ Sistema RAG para sugerencias inteligentes"
echo "   🤔 Clarificación interactiva de requisitos"
echo "   📚 Aprendizaje continuo de casos exitosos"
echo "   📋 Templates basados en mejores prácticas"
echo ""
echo "🧪 Endpoints disponibles:"
echo "   POST ${SERVICE_URL}/api/v2/orchestrate/orchestrate"
echo "   GET  ${SERVICE_URL}/api/v2/orchestrate/suggestions"
echo "   POST ${SERVICE_URL}/api/v2/orchestrate/feedback"
echo "   GET  ${SERVICE_URL}/api/v2/orchestrate/templates"
echo ""
echo "💡 Ejemplo de uso:"
echo "   curl -X POST ${SERVICE_URL}/api/v2/orchestrate/orchestrate \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\": \"Necesito un agente que analice documentos PDF y responda preguntas\"}'"