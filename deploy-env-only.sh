#!/bin/bash

# Desplegar con imagen de Flowise pero con variables de entorno de NubemGenesis
PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

echo "Desplegando NubemGenesis con configuración personalizada..."

gcloud run deploy $SERVICE_NAME \
  --image flowiseai/flowise:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --service-account nubemgenesis-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:nubemgenesis-db \
  --set-env-vars \
    "NODE_ENV=production,\
FLOWISE_HOST=0.0.0.0,\
FLOWISE_PORT=3000,\
APP_NAME=NubemGenesis,\
BRAND_NAME=NubemGenesis,\
DEFAULT_THEME=dark,\
SITE_TITLE=NubemGenesis,\
COMPANY_NAME=NubemSystems,\
PRIMARY_COLOR=#4CAF50,\
SECONDARY_COLOR=#2196F3,\
FONT_FAMILY=Comforta" \
  --set-secrets \
    "DATABASE_TYPE=DATABASE_TYPE:latest,\
DATABASE_HOST=DATABASE_HOST:latest,\
DATABASE_PORT=DATABASE_PORT:latest,\
DATABASE_NAME=DATABASE_NAME:latest,\
DATABASE_USER=DATABASE_USER:latest,\
DATABASE_PASSWORD=DATABASE_PASSWORD:latest" \
  --min-instances 1 \
  --max-instances 10 \
  --memory 2Gi \
  --cpu 1 \
  --port 3000 \
  --timeout 300

echo "Despliegue completado!"
echo "URL: https://nubemgenesis.ai"