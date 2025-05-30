#!/bin/bash

# Script to set up monitoring and alerting for production orchestrator

PROJECT_ID="nubemgenesis"
SERVICE_NAME="nubemgenesis-orchestrator"
LOCATION="us-central1"
NOTIFICATION_EMAIL="alerts@nubemgenesis.com"

echo "Setting up monitoring and alerting for NubemGenesis Orchestrator..."

# Enable required APIs
echo "Enabling monitoring APIs..."
gcloud services enable monitoring.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudtrace.googleapis.com --project=$PROJECT_ID

# Create notification channel (email)
echo "Creating notification channel..."
CHANNEL_ID=$(gcloud alpha monitoring channels create \
    --display-name="NubemGenesis Alerts" \
    --type=email \
    --channel-labels=email_address=$NOTIFICATION_EMAIL \
    --project=$PROJECT_ID \
    --format="value(name)" 2>/dev/null || echo "")

if [ -z "$CHANNEL_ID" ]; then
    # If creation failed, try to find existing channel
    CHANNEL_ID=$(gcloud alpha monitoring channels list \
        --filter="displayName='NubemGenesis Alerts'" \
        --project=$PROJECT_ID \
        --format="value(name)" | head -1)
fi

# Create alert policies
create_alert_policy() {
    local POLICY_NAME=$1
    local CONDITION=$2
    local THRESHOLD=$3
    local DURATION=$4
    local DOCUMENTATION=$5
    
    cat > /tmp/alert-policy.json <<EOF
{
  "displayName": "$POLICY_NAME",
  "conditions": [
    {
      "displayName": "$POLICY_NAME Condition",
      "conditionThreshold": {
        "filter": "$CONDITION",
        "comparison": "COMPARISON_GT",
        "thresholdValue": $THRESHOLD,
        "duration": "$DURATION"
      }
    }
  ],
  "notificationChannels": ["$CHANNEL_ID"],
  "documentation": {
    "content": "$DOCUMENTATION"
  },
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "3600s"
    }
  }
}
EOF
    
    gcloud alpha monitoring policies create --policy-from-file=/tmp/alert-policy.json --project=$PROJECT_ID || echo "Policy may already exist"
}

# High error rate alert
echo "Creating high error rate alert..."
create_alert_policy \
    "Orchestrator High Error Rate" \
    "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class!=\"2xx\"" \
    "10" \
    "60s" \
    "High error rate detected. Check logs for details."

# High latency alert
echo "Creating high latency alert..."
create_alert_policy \
    "Orchestrator High Latency" \
    "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_latencies\"" \
    "5000" \
    "300s" \
    "High latency detected. Average response time exceeds 5 seconds."

# Memory usage alert
echo "Creating memory usage alert..."
create_alert_policy \
    "Orchestrator High Memory Usage" \
    "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/container/memory/utilizations\"" \
    "0.9" \
    "300s" \
    "Memory usage exceeds 90%. Consider scaling or optimizing."

# Create custom dashboard
echo "Creating monitoring dashboard..."
cat > /tmp/dashboard.json <<EOF
{
  "displayName": "NubemGenesis Orchestrator Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE",
                    "crossSeriesReducer": "REDUCE_SUM",
                    "groupByFields": ["metric.label.response_code_class"]
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Latency Distribution",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_DELTA",
                    "crossSeriesReducer": "REDUCE_PERCENTILE_95"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Memory Usage",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/container/memory/utilizations\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "CPU Usage",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"$SERVICE_NAME\" AND metric.type=\"run.googleapis.com/container/cpu/utilizations\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
EOF

gcloud monitoring dashboards create --config-from-file=/tmp/dashboard.json --project=$PROJECT_ID || echo "Dashboard may already exist"

# Create uptime check
echo "Creating uptime check..."
cat > /tmp/uptime-check.json <<EOF
{
  "displayName": "Orchestrator Health Check",
  "monitoredResource": {
    "type": "uptime_url",
    "labels": {
      "host": "$SERVICE_NAME-7ut3uy4xcq-uc.a.run.app",
      "project_id": "$PROJECT_ID"
    }
  },
  "httpCheck": {
    "path": "/health",
    "port": 443,
    "requestMethod": "GET",
    "useSsl": true
  },
  "period": "60s",
  "timeout": "10s",
  "selectedRegions": ["USA"]
}
EOF

gcloud alpha monitoring uptime create --config-from-file=/tmp/uptime-check.json --project=$PROJECT_ID || echo "Uptime check may already exist"

# Clean up
rm -f /tmp/alert-policy.json /tmp/dashboard.json /tmp/uptime-check.json

echo "Monitoring setup complete!"
echo ""
echo "Dashboard URL: https://console.cloud.google.com/monitoring/dashboards/custom"
echo "Alerts URL: https://console.cloud.google.com/monitoring/alerting/policies"
echo ""
echo "IMPORTANT: Update the notification email in the script to receive alerts"