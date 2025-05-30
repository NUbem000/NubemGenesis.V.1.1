#!/bin/bash

# Script para desplegar el sistema de autenticación en Google Cloud Run
# Requiere permisos de administrador en el proyecto nubemgenesis-v1-1

set -e

echo "🚀 Desplegando NubemGenesis con Sistema de Autenticación..."

# Variables
PROJECT_ID="nubemgenesis-v1-1"
REGION="us-central1"
SERVICE_NAME="nubemgenesis"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:auth-system-$(date +%Y%m%d-%H%M%S)"

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================${NC}"
echo -e "${BLUE}   NubemGenesis - Deployment con Sistema de Autenticación    ${NC}"
echo -e "${BLUE}==============================================================${NC}"
echo ""

# Verificar gcloud CLI
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI no está instalado${NC}"
    exit 1
fi

# Verificar autenticación
echo -e "${YELLOW}🔍 Verificando autenticación...${NC}"
CURRENT_ACCOUNT=$(gcloud config get-value account 2>/dev/null || echo "")
if [ -z "$CURRENT_ACCOUNT" ]; then
    echo -e "${RED}❌ No estás autenticado en gcloud${NC}"
    echo -e "${YELLOW}Ejecuta: gcloud auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Autenticado como: $CURRENT_ACCOUNT${NC}"

# Configurar proyecto
echo -e "${YELLOW}🔧 Configurando proyecto GCP...${NC}"
gcloud config set project ${PROJECT_ID}

# Habilitar APIs necesarias
echo -e "${YELLOW}🔌 Habilitando APIs necesarias...${NC}"
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# Crear Dockerfile optimizado para el sistema de autenticación
echo -e "${YELLOW}📝 Creando Dockerfile optimizado...${NC}"
cat > Dockerfile.auth-system << 'EOF'
# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev giflib-dev

# Install pnpm
RUN npm install -g pnpm@latest

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml turbo.json ./
COPY packages ./packages

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm build

# Production stage
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache dumb-init cairo pango libjpeg-turbo giflib

# Create non-root user
RUN addgroup -g 1001 -S nubem && adduser -S nubem -u 1001

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nubem:nubem /app/packages/server/dist ./packages/server/dist
COPY --from=builder --chown=nubem:nubem /app/packages/server/bin ./packages/server/bin
COPY --from=builder --chown=nubem:nubem /app/packages/server/marketplaces ./packages/server/marketplaces
COPY --from=builder --chown=nubem:nubem /app/packages/server/oauth2.html ./packages/server/oauth2.html
COPY --from=builder --chown=nubem:nubem /app/packages/server/package.json ./packages/server/

# Copy UI build
COPY --from=builder --chown=nubem:nubem /app/packages/ui/dist ./packages/ui/dist
COPY --from=builder --chown=nubem:nubem /app/packages/ui/package.json ./packages/ui/

# Copy components
COPY --from=builder --chown=nubem:nubem /app/packages/components/dist ./packages/components/dist
COPY --from=builder --chown=nubem:nubem /app/packages/components/package.json ./packages/components/

# Copy workspace files
COPY --from=builder --chown=nubem:nubem /app/package.json ./
COPY --from=builder --chown=nubem:nubem /app/pnpm-workspace.yaml ./

# Install pnpm and production dependencies
RUN npm install -g pnpm@latest
RUN pnpm install --prod --frozen-lockfile

# Set working directory
WORKDIR /app/packages/server

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Switch to non-root user
USER nubem

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/api/v1/ping', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

EXPOSE 8080
EOF

# Construir y subir imagen
echo -e "${YELLOW}🔨 Construyendo imagen Docker...${NC}"
gcloud builds submit --tag ${IMAGE_NAME} -f Dockerfile.auth-system .

# Desplegar en Cloud Run
echo -e "${YELLOW}🚀 Desplegando en Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_NAME} \
  --platform=managed \
  --region=${REGION} \
  --allow-unauthenticated \
  --port=8080 \
  --memory=2Gi \
  --cpu=1 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="PORT=8080" \
  --set-env-vars="DATABASE_TYPE=sqlite" \
  --set-env-vars="LOG_LEVEL=info"

# Obtener URL del servicio
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --region=${REGION} --format='value(status.url)')

echo -e "${BLUE}==============================================================${NC}"
echo -e "${GREEN}✅ ¡Deployment completado exitosamente!${NC}"
echo -e "${BLUE}==============================================================${NC}"
echo ""
echo -e "${GREEN}🌐 URL del servicio: ${SERVICE_URL}${NC}"
echo -e "${GREEN}🔐 Sistema de autenticación: ACTIVADO${NC}"
echo ""
echo -e "${YELLOW}📋 Credenciales por defecto:${NC}"
echo -e "   👤 Usuario: admin"
echo -e "   📧 Email: admin@nubemgenesis.ai" 
echo -e "   🔐 Contraseña: NubemAdmin2025!"
echo ""
echo -e "${YELLOW}🔗 Endpoints de autenticación:${NC}"
echo -e "   📝 Registro: ${SERVICE_URL}/api/v1/auth/register"
echo -e "   🔑 Login: ${SERVICE_URL}/api/v1/auth/login"
echo -e "   👤 Perfil: ${SERVICE_URL}/api/v1/auth/profile"
echo -e "   ✅ Estado: ${SERVICE_URL}/api/v1/auth/status"
echo ""
echo -e "${GREEN}🎉 Los usuarios ahora pueden registrarse en la aplicación!${NC}"

# Limpiar archivo temporal
rm -f Dockerfile.auth-system

echo -e "${BLUE}==============================================================${NC}"