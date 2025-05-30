#!/bin/bash

# Script de deployment para NubemGenesis con Orchestrator V2 + RAG
# Este script actualiza el sistema con las nuevas capacidades de RAG

set -e

echo "🚀 Iniciando deployment de NubemGenesis Orchestrator V2 con RAG..."

# Variables de configuración
PROJECT_ID="nubemgenesis-production"
REGION="us-central1"
SERVICE_NAME="nubemgenesis-orchestrator"
IMAGE_NAME="gcr.io/${PROJECT_ID}/nubemgenesis-orchestrator-v2"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

# Verificar herramientas necesarias
echo "🔍 Verificando herramientas necesarias..."
command -v gcloud >/dev/null 2>&1 || { echo "❌ gcloud CLI no está instalado"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker no está instalado"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm no está instalado"; exit 1; }

# Configurar proyecto de GCP
echo "🔧 Configurando proyecto GCP..."
gcloud config set project ${PROJECT_ID}

# Habilitar APIs necesarias
echo "🌐 Habilitando APIs de Google Cloud..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    redis.googleapis.com \
    secretmanager.googleapis.com

# Ejecutar migración de base de datos
echo "🗄️ Ejecutando migraciones de base de datos..."
cd packages/server
pnpm typeorm migration:run -d ./src/utils/typeormDataSource.ts || {
    echo "⚠️ Advertencia: No se pudieron ejecutar las migraciones localmente"
    echo "Se ejecutarán durante el startup del servicio"
}
cd ../..

# Build del proyecto
echo "🏗️ Construyendo el proyecto..."
pnpm install
pnpm build

# Crear Dockerfile actualizado con optimizaciones para V2
echo "📝 Creando Dockerfile optimizado..."
cat > Dockerfile.orchestrator-v2 << 'EOF'
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8.6.10

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/server/package.json ./packages/server/
COPY packages/ui/package.json ./packages/ui/
COPY packages/components/package.json ./packages/components/
COPY packages/api-documentation/package.json ./packages/api-documentation/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build all packages
RUN pnpm build

# Production image
FROM node:18-alpine

RUN apk add --no-cache tini

# Install pnpm
RUN npm install -g pnpm@8.6.10

WORKDIR /app

# Copy built application
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

# Set production environment
ENV NODE_ENV=production
ENV USE_ORCHESTRATOR_V2=true
ENV USE_LITELLM_V2=true

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "packages/server/dist/index.js"]
EOF

# Build Docker image
echo "🐳 Construyendo imagen Docker..."
docker build -f Dockerfile.orchestrator-v2 -t ${IMAGE_NAME}:latest -t ${IMAGE_NAME}:v2 .

# Push image to GCR
echo "📤 Subiendo imagen a Google Container Registry..."
docker push ${IMAGE_NAME}:latest
docker push ${IMAGE_NAME}:v2

# Crear secretos necesarios en Secret Manager
echo "🔐 Configurando secretos..."
gcloud secrets create pinecone-api-key --data-file=- <<< "${PINECONE_API_KEY}" 2>/dev/null || \
    echo "Secret pinecone-api-key ya existe"

# Actualizar Cloud Run con la nueva imagen
echo "☁️ Desplegando en Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME}:v2 \
    --platform managed \
    --region ${REGION} \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --concurrency 100 \
    --min-instances 1 \
    --max-instances 10 \
    --set-env-vars "NODE_ENV=production,USE_ORCHESTRATOR_V2=true,USE_LITELLM_V2=true" \
    --update-secrets "PINECONE_API_KEY=pinecone-api-key:latest" \
    --allow-unauthenticated

# Obtener URL del servicio
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region ${REGION} --format 'value(status.url)')

echo "✅ Deployment completado!"
echo "🌐 Servicio disponible en: ${SERVICE_URL}"
echo ""
echo "📊 Nuevas características disponibles:"
echo "   - Sistema RAG para sugerencias inteligentes"
echo "   - Clarificación interactiva de requisitos"
echo "   - Aprendizaje continuo de casos exitosos"
echo "   - Templates basados en mejores prácticas"
echo ""
echo "🧪 Para probar la nueva funcionalidad:"
echo "   curl -X POST ${SERVICE_URL}/api/v2/orchestrate/orchestrate \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"query\": \"I need an agent that analyzes documents\"}''"