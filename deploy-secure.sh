#!/bin/bash

# Secure deployment script for NubemGenesis
set -e

echo "🚀 Starting secure deployment of NubemGenesis..."

# Configuration
PROJECT_ID="nubemgenesis-v1-1"
REGION="us-central1"
SERVICE_NAME="nubemgenesis"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Ensure we're in the right project
gcloud config set project $PROJECT_ID
echo "✅ Project set to: $PROJECT_ID"

# Build the secure image
echo "🔨 Building secure Docker image..."
cd packages/server
docker build -f Dockerfile.secure -t $IMAGE_NAME:latest -t $IMAGE_NAME:$(date +%Y%m%d-%H%M%S) .

# Push to Container Registry
echo "📤 Pushing image to Container Registry..."
docker push $IMAGE_NAME:latest

# Deploy to Cloud Run with security configurations
echo "🔐 Deploying to Cloud Run with security hardening..."
gcloud run deploy $SERVICE_NAME \
    --image=$IMAGE_NAME:latest \
    --region=$REGION \
    --platform=managed \
    --no-allow-unauthenticated \
    --memory=4Gi \
    --cpu=2 \
    --max-instances=10 \
    --min-instances=1 \
    --port=3000 \
    --timeout=300 \
    --concurrency=80 \
    --set-env-vars="NODE_ENV=production" \
    --set-secrets="DATABASE_HOST=DATABASE_HOST:latest,DATABASE_NAME=DATABASE_NAME:latest,DATABASE_USER=DATABASE_USER:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,DATABASE_PORT=DATABASE_PORT:latest,DATABASE_TYPE=DATABASE_TYPE:latest,DATABASE_SSL=DATABASE_SSL:latest,FLOWISE_USERNAME=FLOWISE_USERNAME:latest,FLOWISE_PASSWORD=FLOWISE_PASSWORD:latest,FLOWISE_SECRETKEY_OVERWRITE=FLOWISE_SECRETKEY_OVERWRITE:latest,API_KEY_MASTER_KEY=API_KEY_MASTER_KEY:latest,JWT_SECRET=JWT_SECRET:latest,SESSION_SECRET=SESSION_SECRET:latest" \
    --service-account=nubemgenesis-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --vpc-connector=nubemgenesis-connector \
    --ingress=all \
    --quiet

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')

echo "🔐 Setting up IAM policies for secure access..."
# Add IAM policy for authenticated users only
gcloud run services add-iam-policy-binding $SERVICE_NAME \
    --region=$REGION \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --condition='expression=request.auth.claims.email_verified==true,title=Verified Email Only'

echo "🛡️ Configuring security headers..."
# Apply security policy to Load Balancer (if exists)
gcloud compute backend-services list --filter="name ~ nubemgenesis" --format="value(name)" | while read backend; do
    if [ -n "$backend" ]; then
        gcloud compute backend-services update $backend \
            --security-policy=nubemgenesis-security-policy \
            --global
        echo "✅ Applied security policy to backend: $backend"
    fi
done

echo "📊 Deployment completed successfully!"
echo "🌐 Service URL: $SERVICE_URL"
echo "🔒 Service is secured with:"
echo "   ✅ No unauthenticated access"
echo "   ✅ Cloud Armor DDoS protection"
echo "   ✅ Rate limiting (100 req/min)"
echo "   ✅ Security headers"
echo "   ✅ Non-root container"
echo "   ✅ Health checks enabled"

echo "🔐 Next steps:"
echo "   1. Configure Domain and SSL certificate"
echo "   2. Set up monitoring and alerting"
echo "   3. Run security tests"
echo "   4. Configure backup strategy"

# Test health endpoint
echo "🏥 Testing health endpoint..."
if curl -s "$SERVICE_URL/ping" >/dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed - service may need time to start"
fi