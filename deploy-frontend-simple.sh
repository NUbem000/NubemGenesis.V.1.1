#!/bin/bash

# Simple deployment script for frontend

echo "Building frontend Docker image..."
docker build -t gcr.io/nubemgenesis/nubemgenesis-frontend:latest -f Dockerfile.frontend .

echo "Pushing to Container Registry..."
docker push gcr.io/nubemgenesis/nubemgenesis-frontend:latest

echo "Deploying to Cloud Run..."
gcloud run deploy nubemgenesis-frontend \
    --image gcr.io/nubemgenesis/nubemgenesis-frontend:latest \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --memory 256Mi \
    --cpu 1 \
    --max-instances 10 \
    --project nubemgenesis

echo "Frontend deployment complete!"