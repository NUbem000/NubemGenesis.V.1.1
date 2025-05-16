#!/bin/bash

# Desplegar rápidamente con configuraciones actualizadas
PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

echo "Actualizando configuración del servicio con branding de NubemGenesis..."

gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --platform=managed \
  --set-env-vars \
    "NODE_ENV=production,\
FLOWISE_HOST=0.0.0.0,\
FLOWISE_PORT=3000,\
APP_NAME=NubemGenesis,\
BRAND_NAME=NubemGenesis,\
DEFAULT_THEME=dark,\
SITE_TITLE=NubemGenesis - Plataforma de IA Generativa,\
COMPANY_NAME=NubemSystems,\
PRIMARY_COLOR=#4CAF50,\
SECONDARY_COLOR=#2196F3"

echo "Configuración actualizada!"
echo "URL: https://nubemgenesis.ai"