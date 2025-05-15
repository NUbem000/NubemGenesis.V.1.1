#\!/bin/bash

# Variables
PROJECT_ID="nubemgenesis-v1-1"
REGION="us-central1"
SERVICE_NAME="nubemgenesis"
DOMAIN="nubemgenesis.ai"
IMAGE="us-central1-docker.pkg.dev/${PROJECT_ID}/nubemgenesis/app:latest"

# Esperar a que la imagen esté disponible
echo "Verificando la disponibilidad de la imagen..."
gcloud artifacts docker images describe $IMAGE || {
  echo "La imagen $IMAGE no está disponible. Espere a que termine la compilación en Cloud Build."
  exit 1
}

# Desplegar en Cloud Run
echo "Desplegando la aplicación en Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --service-account=nubemgenesis-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-secrets DATABASE_TYPE=DATABASE_TYPE:latest,DATABASE_HOST=DATABASE_HOST:latest,DATABASE_PORT=DATABASE_PORT:latest,DATABASE_NAME=DATABASE_NAME:latest,DATABASE_USER=DATABASE_USER:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,DATABASE_SSL=DATABASE_SSL:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,REDIS_USERNAME=REDIS_USERNAME:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,REDIS_TLS=REDIS_TLS:latest,FLOWISE_USERNAME=FLOWISE_USERNAME:latest,FLOWISE_PASSWORD=FLOWISE_PASSWORD:latest,FLOWISE_SECRETKEY_OVERWRITE=FLOWISE_SECRETKEY_OVERWRITE:latest,JWT_SECRET=JWT_SECRET:latest,LOG_LEVEL=LOG_LEVEL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,MISTRAL_API_KEY=MISTRAL_API_KEY:latest,DEEPSEEK_API_KEY=DEEPSEEK_API_KEY:latest,CORS_ORIGINS=CORS_ORIGINS:latest,IFRAME_ORIGINS=IFRAME_ORIGINS:latest,FLOWISE_FILE_SIZE_LIMIT=FLOWISE_FILE_SIZE_LIMIT:latest \
  --add-cloudsql-instances ${PROJECT_ID}:${REGION}:nubemgenesis-db \
  --min-instances 1 \
  --memory 4Gi \
  --cpu 2 \
  --timeout 3600 \
  --concurrency 80

# Verificar el despliegue
echo "Verificando el despliegue..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
echo "Servicio desplegado en: $SERVICE_URL"

# Configurar el dominio personalizado
echo "Configurando dominio personalizado $DOMAIN..."
gcloud beta run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=$DOMAIN \
  --region=$REGION

# Mostrar los registros DNS necesarios
echo "Registros DNS necesarios para el dominio $DOMAIN:"
gcloud beta run domain-mappings describe \
  --domain=$DOMAIN \
  --region=$REGION

echo "Despliegue completado. El servicio estará disponible en:"
echo "- $SERVICE_URL"
echo "- https://$DOMAIN (después de la propagación DNS)"
