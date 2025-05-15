#\!/bin/bash

# Script para desplegar NubemGenesis en GCP

PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

echo "========================================================"
echo "Iniciando despliegue de NubemGenesis en GCP"
echo "========================================================"

# 1. Asegurarse de que estamos en el proyecto correcto
echo "Configurando proyecto GCP..."
gcloud config set project $PROJECT_ID

# 2. Clonar el repositorio
echo "Clonando repositorio de NubemGenesis..."
git clone https://github.com/NUbem000/NubemGenesis.V.1.1.git

# 3. Construir la imagen Docker
echo "Construyendo imagen Docker..."
SHORT_SHA=$(git -C NubemGenesis.V.1.1 rev-parse --short HEAD)
docker build -t gcr.io/$PROJECT_ID/nubemgenesis:$SHORT_SHA ./NubemGenesis.V.1.1

# 4. Subir la imagen a Container Registry
echo "Subiendo imagen a Container Registry..."
docker push gcr.io/$PROJECT_ID/nubemgenesis:$SHORT_SHA

# 5. Desplegar en Cloud Run
echo "Desplegando en Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/nubemgenesis:$SHORT_SHA \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --service-account nubemgenesis-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets DATABASE_TYPE=DATABASE_TYPE:latest,DATABASE_HOST=DATABASE_HOST:latest,DATABASE_PORT=DATABASE_PORT:latest,DATABASE_NAME=DATABASE_NAME:latest,DATABASE_USER=DATABASE_USER:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,DATABASE_SSL=DATABASE_SSL:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,REDIS_USERNAME=REDIS_USERNAME:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,REDIS_TLS=REDIS_TLS:latest,PORT=PORT:latest,FLOWISE_USERNAME=FLOWISE_USERNAME:latest,FLOWISE_PASSWORD=FLOWISE_PASSWORD:latest,FLOWISE_SECRETKEY_OVERWRITE=FLOWISE_SECRETKEY_OVERWRITE:latest,JWT_SECRET=JWT_SECRET:latest,LOG_LEVEL=LOG_LEVEL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,MISTRAL_API_KEY=MISTRAL_API_KEY:latest,DEEPSEEK_API_KEY=DEEPSEEK_API_KEY:latest,CORS_ORIGINS=CORS_ORIGINS:latest,IFRAME_ORIGINS=IFRAME_ORIGINS:latest,FLOWISE_FILE_SIZE_LIMIT=FLOWISE_FILE_SIZE_LIMIT:latest \
  --add-cloudsql-instances $PROJECT_ID:$REGION:nubemgenesis-db \
  --min-instances 1 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 3600

# 6. Configurar dominio
echo "Configurando dominio personalizado..."
gcloud secrets versions access latest --secret=DOMAIN_SETUP_SCRIPT > domain-setup.sh
chmod +x domain-setup.sh
./domain-setup.sh

echo "========================================================"
echo "Despliegue completado. El sitio estará disponible en:"
echo "https://$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')"
echo "y próximamente en https://$(gcloud secrets versions access latest --secret=DOMAIN_NAME)"
echo "========================================================"
