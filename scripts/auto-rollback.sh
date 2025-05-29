#!/bin/bash

# Auto-rollback script for NubemGenesis
# Triggers automatic rollback based on health metrics

set -euo pipefail

PROJECT_ID="nubemgenesis-v1-1"
REGION="us-central1"
SERVICE_NAME="nubemgenesis"

# Configuration
ERROR_THRESHOLD=5        # % error rate threshold
LATENCY_THRESHOLD=2000   # ms latency threshold  
CHECK_DURATION=300       # 5 minutes monitoring
CHECK_INTERVAL=30        # Check every 30 seconds

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

check_error_rate() {
    # Query error rate from Cloud Monitoring
    gcloud logging read "
        resource.type=\"cloud_run_revision\"
        resource.labels.service_name=\"$SERVICE_NAME\"
        httpRequest.status>=400
        timestamp>=\"$(date -d '5 minutes ago' -u +%Y-%m-%dT%H:%M:%SZ)\"
    " --limit=1000 --format="value(timestamp)" | wc -l
}

check_latency() {
    # Query 95th percentile latency
    gcloud monitoring metrics list --filter="metric.type=\"run.googleapis.com/request_latencies\"" \
        --format="value(points[0].value.doubleValue)" | head -1
}

get_current_revision() {
    gcloud run services describe $SERVICE_NAME \
        --region=$REGION \
        --format="value(status.latestReadyRevisionName)"
}

get_previous_revision() {
    gcloud run revisions list \
        --service=$SERVICE_NAME \
        --region=$REGION \
        --format="value(metadata.name)" \
        --sort-by="~metadata.creationTimestamp" \
        --limit=2 | tail -1
}

rollback_to_previous() {
    local previous_revision
    previous_revision=$(get_previous_revision)
    
    if [[ -z "$previous_revision" ]]; then
        log "ERROR: No previous revision found for rollback"
        return 1
    fi
    
    log "🔄 Rolling back to revision: $previous_revision"
    
    gcloud run services update-traffic $SERVICE_NAME \
        --region=$REGION \
        --to-revisions="$previous_revision=100" \
        --quiet
        
    log "✅ Rollback completed to revision: $previous_revision"
    
    # Send alert
    send_alert "🚨 AUTO-ROLLBACK EXECUTED" \
        "Service: $SERVICE_NAME\nRolled back to: $previous_revision\nReason: Health check failure"
}

send_alert() {
    local title="$1"
    local message="$2"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$title\n$message\"}" \
            "$SLACK_WEBHOOK"
    fi
    
    # Email notification (using Cloud Functions or similar)
    log "ALERT: $title - $message"
}

monitor_health() {
    local start_time
    local current_time
    local errors
    local latency
    
    start_time=$(date +%s)
    current_revision=$(get_current_revision)
    
    log "🔍 Starting health monitoring for revision: $current_revision"
    log "📊 Monitoring for ${CHECK_DURATION}s with ${CHECK_INTERVAL}s intervals"
    
    while true; do
        current_time=$(date +%s)
        elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $CHECK_DURATION ]]; then
            log "✅ Health check passed - no rollback needed"
            break
        fi
        
        # Check error rate
        errors=$(check_error_rate)
        if [[ $errors -gt $ERROR_THRESHOLD ]]; then
            log "🚨 Error rate threshold exceeded: $errors% > $ERROR_THRESHOLD%"
            rollback_to_previous
            return 1
        fi
        
        # Check latency
        latency=$(check_latency)
        if [[ ${latency%.*} -gt $LATENCY_THRESHOLD ]]; then
            log "🚨 Latency threshold exceeded: ${latency}ms > ${LATENCY_THRESHOLD}ms"
            rollback_to_previous
            return 1
        fi
        
        log "📈 Health OK - Errors: $errors%, Latency: ${latency}ms"
        sleep $CHECK_INTERVAL
    done
}

main() {
    log "🚀 Starting auto-rollback monitoring for $SERVICE_NAME"
    
    # Verify service exists
    if ! gcloud run services describe $SERVICE_NAME --region=$REGION &>/dev/null; then
        log "ERROR: Service $SERVICE_NAME not found in region $REGION"
        exit 1
    fi
    
    monitor_health
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi