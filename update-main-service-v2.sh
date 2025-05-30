#!/bin/bash

# Script para actualizar el servicio principal de NubemGenesis con código V2
set -e

echo "🚀 Actualizando servicio principal NubemGenesis con funcionalidad V2..."

PROJECT_ID="nubemgenesis-v1-1"
REGION="us-central1"
SERVICE_NAME="nubemgenesis"
CURRENT_IMAGE=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format='value(spec.template.spec.containers[0].image)')

echo "📋 Imagen actual: ${CURRENT_IMAGE}"

# Opción 1: Actualizar variables para activar V2 y apuntar al backend V2
echo "🔧 Actualizando configuración del servicio..."
gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --update-env-vars \
USE_ORCHESTRATOR_V2=true,\
USE_LITELLM_V2=true,\
V2_API_URL=https://nubemgenesis-v2-demo-394068846550.us-central1.run.app,\
ENABLE_V2_FEATURES=true

echo "✅ Servicio actualizado con variables V2"

# Obtener URL del servicio
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo ""
echo "📊 Configuración actualizada:"
echo "   - Servicio principal: ${SERVICE_URL}"
echo "   - Backend V2 API: https://nubemgenesis-v2-demo-394068846550.us-central1.run.app"
echo ""
echo "⚠️  NOTA: El frontend necesita ser actualizado para mostrar el wizard V2."
echo "   El código está en: packages/ui/src/views/chatflows/CreateFlowWizard.jsx"
echo ""
echo "Para una actualización completa del código:"
echo "1. Build nueva imagen con código actualizado desde GitHub"
echo "2. Deploy la nueva imagen"
echo "3. O usar la opción 2 (demo frontend standalone)"