#!/bin/bash
# Setup Cloud Scheduler jobs for automated evaluations

PROJECT_ID="nubemgenesis-deploy"
REGION="us-central1"
SERVICE_URL="https://nubemgenesis-orchestrator-v2-254545325749.us-central1.run.app"

# Enable Cloud Scheduler API if not already enabled
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID

# Create service account for scheduler if not exists
gcloud iam service-accounts create evaluation-scheduler \
    --display-name="Evaluation Scheduler" \
    --project=$PROJECT_ID 2>/dev/null || true

# Grant necessary permissions
gcloud run services add-iam-policy-binding nubemgenesis-orchestrator-v2 \
    --member="serviceAccount:evaluation-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --region=$REGION \
    --project=$PROJECT_ID 2>/dev/null || true

# Create daily evaluation job
gcloud scheduler jobs create http daily-model-evaluation \
    --location=$REGION \
    --schedule="0 2 * * *" \
    --uri="$SERVICE_URL/api/v1/orchestrate/evaluate" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body='{"type":"daily","benchmark":"general","models":["gpt-3.5-turbo","claude-3-sonnet","gemini-pro"]}' \
    --oidc-service-account-email="evaluation-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
    --project=$PROJECT_ID 2>/dev/null || \
    echo "Daily evaluation job already exists"

# Create weekly comprehensive evaluation job
gcloud scheduler jobs create http weekly-model-evaluation \
    --location=$REGION \
    --schedule="0 3 * * 0" \
    --uri="$SERVICE_URL/api/v1/orchestrate/evaluate" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body='{"type":"weekly","benchmark":"all","models":"all"}' \
    --oidc-service-account-email="evaluation-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
    --project=$PROJECT_ID 2>/dev/null || \
    echo "Weekly evaluation job already exists"

# Create monthly report generation job
gcloud scheduler jobs create http monthly-evaluation-report \
    --location=$REGION \
    --schedule="0 4 1 * *" \
    --uri="$SERVICE_URL/api/v1/orchestrate/evaluate/report" \
    --http-method=POST \
    --headers="Content-Type=application/json" \
    --message-body='{"type":"monthly","generateReport":true}' \
    --oidc-service-account-email="evaluation-scheduler@$PROJECT_ID.iam.gserviceaccount.com" \
    --project=$PROJECT_ID 2>/dev/null || \
    echo "Monthly report job already exists"

echo "Cloud Scheduler jobs setup complete!"