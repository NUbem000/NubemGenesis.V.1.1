#!/bin/bash

# Actualizar el servicio con configuraciones de frontend
PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

echo "Actualizando variables de entorno para el nuevo branding..."

gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --platform=managed \
  --set-env-vars "NODE_ENV=production,FLOWISE_HOST=0.0.0.0,FLOWISE_PORT=3000,SITE_TITLE=NubemGenesis,DEFAULT_THEME=dark"

echo "Actualizando el servicio de Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image flowiseai/flowise:latest \
  --region $REGION \
  --platform managed \
  --set-env-vars \
    "NODE_ENV=production,\
FLOWISE_HOST=0.0.0.0,\
FLOWISE_PORT=3000,\
SITE_TITLE=NubemGenesis,\
BRAND_NAME=NubemGenesis,\
DEFAULT_THEME=dark"

echo "Despliegue completado!"