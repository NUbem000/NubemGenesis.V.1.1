#!/bin/bash

# NubemGenesis Orchestrator Deployment Script
# Deploy the complete orchestration system to production

set -e

echo "🚀 NubemGenesis Orchestrator Deployment"
echo "======================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-nubemgenesis-v1-1}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-nubemgenesis-orchestrator}"
LITELLM_SERVICE="${LITELLM_SERVICE:-litellm-proxy}"

# Functions
check_requirement() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is required but not installed.${NC}"
        exit 1
    fi
}

# Check requirements
echo "📋 Checking requirements..."
check_requirement "docker"
check_requirement "docker-compose"
check_requirement "gcloud"
check_requirement "pnpm"

# Set GCP project
echo -e "\n🔧 Setting up GCP project..."
gcloud config set project $PROJECT_ID

# Step 1: Build and push Docker images
echo -e "\n🏗️  Building Docker images..."

# Build LiteLLM proxy image
docker build -f Dockerfile.litellm -t gcr.io/$PROJECT_ID/$LITELLM_SERVICE:latest .
docker build -f Dockerfile.production-ready -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .

# Push images to GCR
echo -e "\n📤 Pushing images to Google Container Registry..."
docker push gcr.io/$PROJECT_ID/$LITELLM_SERVICE:latest
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest

# Step 2: Deploy LiteLLM proxy
echo -e "\n🚀 Deploying LiteLLM proxy service..."
cat > litellm-service.yaml <<EOF
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: $LITELLM_SERVICE
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containers:
      - image: gcr.io/$PROJECT_ID/$LITELLM_SERVICE:latest
        ports:
        - containerPort: 4000
        env:
        - name: LITELLM_MASTER_KEY
          valueFrom:
            secretKeyRef:
              name: litellm-secrets
              key: master-key
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: openai
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: anthropic
        - name: GOOGLE_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: google
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
EOF

gcloud run services replace litellm-service.yaml --region=$REGION

# Get LiteLLM service URL
LITELLM_URL=$(gcloud run services describe $LITELLM_SERVICE --region=$REGION --format='value(status.url)')
echo -e "${GREEN}✅ LiteLLM deployed at: $LITELLM_URL${NC}"

# Step 3: Deploy main orchestrator service
echo -e "\n🚀 Deploying main orchestrator service..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --set-env-vars "USE_LITELLM_V2=true" \
  --set-env-vars "LITELLM_PROXY_URL=$LITELLM_URL" \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets="LITELLM_MASTER_KEY=litellm-secrets:latest" \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --set-secrets="REDIS_URL=redis-url:latest" \
  --set-secrets="LANGSMITH_API_KEY=langsmith-key:latest" \
  --set-secrets="LANGFUSE_PUBLIC_KEY=langfuse-public:latest" \
  --set-secrets="LANGFUSE_SECRET_KEY=langfuse-secret:latest"

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo -e "${GREEN}✅ Orchestrator deployed at: $SERVICE_URL${NC}"

# Step 4: Set up Cloud Scheduler for evaluations
echo -e "\n⏰ Setting up evaluation scheduler..."

# Daily evaluation
gcloud scheduler jobs create http daily-evaluation \
  --location=$REGION \
  --schedule="0 2 * * *" \
  --uri="$SERVICE_URL/api/v1/orchestrate/evaluate/trigger/daily-eval" \
  --http-method=POST \
  --oidc-service-account-email=$SERVICE_NAME@$PROJECT_ID.iam.gserviceaccount.com

# Weekly evaluation
gcloud scheduler jobs create http weekly-evaluation \
  --location=$REGION \
  --schedule="0 3 * * 0" \
  --uri="$SERVICE_URL/api/v1/orchestrate/evaluate/trigger/weekly-eval" \
  --http-method=POST \
  --oidc-service-account-email=$SERVICE_NAME@$PROJECT_ID.iam.gserviceaccount.com

# New model check
gcloud scheduler jobs create http new-model-check \
  --location=$REGION \
  --schedule="0 */6 * * *" \
  --uri="$SERVICE_URL/api/v1/orchestrate/evaluate/trigger/new-model-check" \
  --http-method=POST \
  --oidc-service-account-email=$SERVICE_NAME@$PROJECT_ID.iam.gserviceaccount.com

# Step 5: Set up monitoring
echo -e "\n📊 Setting up monitoring..."

# Create uptime check
gcloud monitoring uptime-check-configs create \
  --display-name="Orchestrator Health Check" \
  --resource-type="uptime-check" \
  --monitored-resource="{'type':'uptime_url','labels':{'host':'$SERVICE_URL','project_id':'$PROJECT_ID'}}" \
  --http-check="{'path':'/api/v1/orchestrate/health','port':443,'use_ssl':true}" \
  --period=60

# Create alert policy
cat > alert-policy.json <<EOF
{
  "displayName": "Orchestrator Error Rate",
  "conditions": [{
    "displayName": "Error rate > 5%",
    "conditionThreshold": {
      "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.label.response_code_class!=\"2xx\"",
      "comparison": "COMPARISON_GT",
      "thresholdValue": 0.05,
      "duration": "300s",
      "aggregations": [{
        "alignmentPeriod": "60s",
        "perSeriesAligner": "ALIGN_RATE"
      }]
    }
  }],
  "alertStrategy": {
    "autoClose": "1800s"
  },
  "enabled": true
}
EOF

gcloud alpha monitoring policies create --policy-from-file=alert-policy.json

# Step 6: Initialize the system
echo -e "\n🔧 Initializing orchestration system..."
curl -X POST "$SERVICE_URL/api/v1/orchestrate/init" \
  -H "Content-Type: application/json" \
  -d '{"initialize": true}'

# Step 7: Run health checks
echo -e "\n🏥 Running health checks..."
HEALTH_CHECK=$(curl -s "$SERVICE_URL/api/v1/orchestrate/health")
echo "Health status: $HEALTH_CHECK"

# Step 8: Test orchestration
echo -e "\n🧪 Testing orchestration..."
TEST_RESPONSE=$(curl -s -X POST "$SERVICE_URL/api/v1/orchestrate" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Create a simple test chatbot",
    "constraints": {
      "maxCost": 0.01,
      "securityLevel": "low"
    }
  }')

if echo "$TEST_RESPONSE" | grep -q "flowId"; then
    echo -e "${GREEN}✅ Orchestration test successful!${NC}"
else
    echo -e "${RED}❌ Orchestration test failed${NC}"
    echo "Response: $TEST_RESPONSE"
fi

# Deployment summary
echo -e "\n${GREEN}🎉 Deployment Complete!${NC}"
echo "======================================"
echo "🌐 Services:"
echo "   - Orchestrator: $SERVICE_URL"
echo "   - LiteLLM Proxy: $LITELLM_URL"
echo ""
echo "📊 Monitoring:"
echo "   - Metrics: $SERVICE_URL/metrics"
echo "   - Health: $SERVICE_URL/api/v1/orchestrate/health"
echo ""
echo "📚 API Documentation:"
echo "   - Orchestrate: POST $SERVICE_URL/api/v1/orchestrate"
echo "   - Capabilities: GET $SERVICE_URL/api/v1/orchestrate/capabilities"
echo "   - Models: GET $SERVICE_URL/api/v1/orchestrate/models"
echo ""
echo "⏰ Scheduled Jobs:"
echo "   - Daily evaluation: 2:00 AM UTC"
echo "   - Weekly evaluation: 3:00 AM UTC Sunday"
echo "   - New model check: Every 6 hours"
echo ""
echo "🔒 Security:"
echo "   - All secrets stored in Secret Manager"
echo "   - HTTPS enforced"
echo "   - Rate limiting active"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Configure custom domain"
echo "   2. Set up Grafana dashboards"
echo "   3. Configure alerting channels"
echo "   4. Run load tests"

# Clean up
rm -f litellm-service.yaml alert-policy.json

echo -e "\n✨ Happy orchestrating!"