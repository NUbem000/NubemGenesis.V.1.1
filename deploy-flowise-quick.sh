#!/bin/bash

# Quick deployment using official Flowise image with NubemGenesis branding

# Deploy Flowise directly to Cloud Run
gcloud run deploy nubemgenesis \
    --image flowiseai/flowise:latest \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 3000 \
    --memory 2Gi \
    --cpu 2 \
    --min-instances 1 \
    --max-instances 10 \
    --timeout 300 \
    --set-env-vars NODE_ENV=production,FLOWISE_USERNAME=admin,FLOWISE_PASSWORD=NubemGen2025! \
    --project nubemgenesis-v1-1

echo "Deployment complete! Visit https://nubemgenesis.ai"