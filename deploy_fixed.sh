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
[ -d "NubemGenesis.V.1.1" ] || git clone https://github.com/NUbem000/NubemGenesis.V.1.1.git

# 3. Construir la imagen Docker
echo "Construyendo imagen Docker..."
cd NubemGenesis.V.1.1 || exit 1
SHORT_SHA=$(git rev-parse --short HEAD)
docker build -t gcr.io/$PROJECT_ID/nubemgenesis:$SHORT_SHA .

# 4. Subir la imagen a Container Registry
echo "Subiendo imagen a Container Registry..."
docker push gcr.io/$PROJECT_ID/nubemgenesis:$SHORT_SHA

# 5. Crear base de datos en Cloud SQL si no existe
echo "Verificando base de datos en Cloud SQL..."
gcloud sql databases describe nubemgenesis --instance=nubemgenesis-db || \
  gcloud sql databases create nubemgenesis --instance=nubemgenesis-db

# 6. Desplegar en Cloud Run (sin configurar PORT como variable de entorno)
echo "Desplegando en Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/nubemgenesis:$SHORT_SHA \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --service-account nubemgenesis-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-secrets DATABASE_TYPE=DATABASE_TYPE:latest,DATABASE_HOST=DATABASE_HOST:latest,DATABASE_PORT=DATABASE_PORT:latest,DATABASE_NAME=DATABASE_NAME:latest,DATABASE_USER=DATABASE_USER:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,DATABASE_SSL=DATABASE_SSL:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,REDIS_USERNAME=REDIS_USERNAME:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,REDIS_TLS=REDIS_TLS:latest,FLOWISE_USERNAME=FLOWISE_USERNAME:latest,FLOWISE_PASSWORD=FLOWISE_PASSWORD:latest,FLOWISE_SECRETKEY_OVERWRITE=FLOWISE_SECRETKEY_OVERWRITE:latest,JWT_SECRET=JWT_SECRET:latest,LOG_LEVEL=LOG_LEVEL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,MISTRAL_API_KEY=MISTRAL_API_KEY:latest,DEEPSEEK_API_KEY=DEEPSEEK_API_KEY:latest,CORS_ORIGINS=CORS_ORIGINS:latest,IFRAME_ORIGINS=IFRAME_ORIGINS:latest,FLOWISE_FILE_SIZE_LIMIT=FLOWISE_FILE_SIZE_LIMIT:latest \
  --add-cloudsql-instances $PROJECT_ID:$REGION:nubemgenesis-db \
  --min-instances 1 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 3600

echo "========================================================"
echo "Despliegue completado. El sitio estará disponible en:"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
echo $SERVICE_URL
echo "========================================================"

# Nota sobre el dominio
echo "NOTA: Para configurar el dominio nubemgenesis.ai"
echo "1. Primero necesitas registrar el dominio en GoDaddy."
echo "2. Luego, puedes ejecutar el script domain-setup.sh"
echo "========================================================"
