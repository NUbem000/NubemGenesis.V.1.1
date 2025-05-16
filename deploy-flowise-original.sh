#!/bin/bash

# Desplegar con imagen original de Flowise
gcloud run deploy nubemgenesis \
  --image flowiseai/flowise:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,FLOWISE_HOST=0.0.0.0,FLOWISE_PORT=3000 \
  --set-secrets DATABASE_HOST=DATABASE_HOST:latest,DATABASE_PORT=DATABASE_PORT:latest,DATABASE_NAME=DATABASE_NAME:latest,DATABASE_USER=DATABASE_USER:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest \
  --add-cloudsql-instances nubemgenesis-v1-1:us-central1:nubemgenesis-db \
  --min-instances 1 \
  --memory 2Gi \
  --cpu 1 \
  --concurrency 80 \
  --port 3000

echo "Despliegue completado!"