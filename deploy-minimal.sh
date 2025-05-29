#!/bin/bash

# Deploy minimal working version to Cloud Run

# Build and push Docker image directly
docker build -f packages/server/Dockerfile.phase1 -t us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/nubemgenesis:production packages/server/

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/nubemgenesis:production

# Deploy to Cloud Run
gcloud run deploy nubemgenesis \
    --image us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/nubemgenesis:production \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 3000 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars NODE_ENV=production \
    --project nubemgenesis-v1-1

echo "Deployment complete!"