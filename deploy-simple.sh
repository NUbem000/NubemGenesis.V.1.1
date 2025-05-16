#\!/bin/bash

# Desplegar directamente en Cloud Run con la imagen actual
PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

echo "Desplegando NubemGenesis en Cloud Run..."

# Desplegar con una imagen base funcional
gcloud run deploy $SERVICE_NAME \
  --image us-docker.pkg.dev/cloudrun/container/hello \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --service-account nubemgenesis-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars NODE_ENV=production \
  --min-instances 1 \
  --memory 2Gi \
  --cpu 1 \
  --concurrency 80 \
  --port 8080

echo "Despliegue completado. El servicio está disponible en:"
gcloud run services describe $SERVICE_NAME --region=$REGION --format=value(status.url)
