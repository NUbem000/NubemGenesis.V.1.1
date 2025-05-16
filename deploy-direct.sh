#!/bin/bash

# Desplegar directamente con imagen de Flowise
PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

echo "Desplegando NubemGenesis con imagen de Flowise..."

gcloud run deploy $SERVICE_NAME \
  --image flowiseai/flowise:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,FLOWISE_HOST=0.0.0.0,FLOWISE_PORT=3000 \
  --set-secrets DATABASE_TYPE=DATABASE_TYPE:latest,DATABASE_HOST=DATABASE_HOST:latest,DATABASE_PORT=DATABASE_PORT:latest,DATABASE_NAME=DATABASE_NAME:latest,DATABASE_USER=DATABASE_USER:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:nubemgenesis-db \
  --min-instances 1 \
  --memory 2Gi \
  --cpu 1 \
  --concurrency 80 \
  --port 3000

echo "Despliegue completado. URL:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format=value(status.url)