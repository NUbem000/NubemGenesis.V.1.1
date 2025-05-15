#\!/bin/bash

PROJECT_ID="nubemgenesis-v1-1"
REGION="us-central1"
SERVICE_NAME="nubemgenesis"
DOMAIN="nubemgenesis.ai"

echo "Actualizando el servicio de Cloud Run con todas las variables y secretos necesarios..."
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --platform=managed \
  --set-secrets DATABASE_TYPE=DATABASE_TYPE:latest,DATABASE_HOST=DATABASE_HOST:latest,DATABASE_PORT=DATABASE_PORT:latest,DATABASE_NAME=DATABASE_NAME:latest,DATABASE_USER=DATABASE_USER:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,DATABASE_SSL=DATABASE_SSL:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,REDIS_USERNAME=REDIS_USERNAME:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,REDIS_TLS=REDIS_TLS:latest,FLOWISE_USERNAME=FLOWISE_USERNAME:latest,FLOWISE_PASSWORD=FLOWISE_PASSWORD:latest,FLOWISE_SECRETKEY_OVERWRITE=FLOWISE_SECRETKEY_OVERWRITE:latest,JWT_SECRET=JWT_SECRET:latest,LOG_LEVEL=LOG_LEVEL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,MISTRAL_API_KEY=MISTRAL_API_KEY:latest,DEEPSEEK_API_KEY=DEEPSEEK_API_KEY:latest,CORS_ORIGINS=CORS_ORIGINS:latest,IFRAME_ORIGINS=IFRAME_ORIGINS:latest,FLOWISE_FILE_SIZE_LIMIT=FLOWISE_FILE_SIZE_LIMIT:latest \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:nubemgenesis-db \
  --min-instances=1 \
  --memory=4Gi \
  --cpu=2 \
  --concurrency=80

echo "Configurando dominio personalizado..."
gcloud beta run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=$DOMAIN \
  --region=$REGION

echo "Mostrando información del dominio..."
gcloud beta run domain-mappings describe \
  --domain=$DOMAIN \
  --region=$REGION

echo "Proceso completado. Verifique el estado del servicio y el dominio."
