#!/bin/bash

# Script para actualizar NubemGenesis con código V2
# Usa la imagen existente como base y agrega los archivos nuevos

set -e

echo "🚀 Actualizando NubemGenesis con funcionalidad V2..."

PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

# Configurar proyecto
gcloud config set project ${PROJECT_ID}

# Opción 1: Actualizar servicio existente con más variables
echo "📝 Actualizando variables de entorno..."
gcloud run services update ${SERVICE_NAME} \
  --region ${REGION} \
  --set-env-vars \
NODE_ENV=production,\
USE_ORCHESTRATOR_V2=true,\
USE_LITELLM_V2=true,\
ORCHESTRATOR_WATCH_CAPABILITIES=false,\
ORCHESTRATOR_ENABLE_EVALUATION=false,\
PORT=3000

# Obtener información del servicio
echo "🔍 Obteniendo información del servicio..."
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo ""
echo "✅ Actualización completada!"
echo "🌐 Servicio disponible en: ${SERVICE_URL}"
echo ""
echo "📊 Variables V2 configuradas:"
echo "   - USE_ORCHESTRATOR_V2=true"
echo "   - USE_LITELLM_V2=true"
echo ""
echo "⚠️  NOTA: Los endpoints V2 estarán disponibles cuando se actualice el código."
echo ""
echo "Para actualizar el código:"
echo "1. El código V2 está en GitHub: https://github.com/NUbem000/NubemGenesis.V.1.1.git"
echo "2. Necesitas hacer un nuevo build y deploy con el código actualizado"
echo "3. Las variables ya están configuradas para activar V2 automáticamente"