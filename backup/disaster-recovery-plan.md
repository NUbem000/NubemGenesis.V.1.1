# Disaster Recovery Plan - NubemGenesis

## 🎯 Recovery Objectives

### **RTO/RPO Targets**

| Service Component | RTO (Recovery Time) | RPO (Data Loss) | Criticality |
|-------------------|---------------------|-----------------|-------------|
| **API Service** | < 15 minutes | < 5 minutes | 🔴 Critical |
| **Database** | < 30 minutes | < 1 minute | 🔴 Critical |
| **File Storage** | < 1 hour | < 15 minutes | 🟡 Important |
| **Cache (Redis)** | < 5 minutes | Acceptable | 🟢 Low |
| **Frontend** | < 10 minutes | N/A | 🟡 Important |

## 🗄️ Backup Strategy

### **Database Backup**

```bash
# Automated daily backups
#!/bin/bash
# Database backup script

BACKUP_DIR="/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="nubemgenesis"

# Create backup with compression
pg_dump $DB_NAME | gzip > $BACKUP_DIR/nubemgenesis_$DATE.sql.gz

# Upload to Cloud Storage
gsutil cp $BACKUP_DIR/nubemgenesis_$DATE.sql.gz \
  gs://nubemgenesis-backups/database/

# Keep local backups for 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Verify backup integrity
gunzip -t $BACKUP_DIR/nubemgenesis_$DATE.sql.gz
```

### **Application State Backup**

```yaml
# Backup Configuration
backup_schedule:
  database:
    frequency: "every 6 hours"
    retention: "30 days"
    method: "pg_dump with compression"
    
  file_storage:
    frequency: "daily"
    retention: "90 days"
    method: "gsutil rsync"
    
  secrets:
    frequency: "weekly"
    retention: "indefinite"
    method: "encrypted export"
    
  configuration:
    frequency: "on change"
    retention: "indefinite"
    method: "git repository"
```

## 🚨 Disaster Scenarios & Response

### **Scenario 1: Cloud Run Service Failure**

**Detection**: Health checks fail, 5xx error rate > 50%

**Response Steps**:
```bash
1. Automatic failover to standby region
2. Scale up healthy instances
3. Investigate root cause
4. Gradual traffic restoration
```

**Recovery Time**: < 15 minutes

### **Scenario 2: Database Corruption/Failure**

**Detection**: Database connection errors, data inconsistency

**Response Steps**:
```bash
1. Stop all write operations
2. Activate read-only mode
3. Restore from latest backup
4. Validate data integrity
5. Resume normal operations
```

**Recovery Time**: < 30 minutes

### **Scenario 3: Complete Region Outage**

**Detection**: All services unreachable in primary region

**Response Steps**:
```bash
1. Activate disaster recovery region
2. Update DNS routing
3. Restore data from backups
4. Validate all services
5. Communicate to users
```

**Recovery Time**: < 2 hours

## 🔄 Automated Recovery Procedures

### **Auto-Recovery Script**

```bash
#!/bin/bash
# Automated disaster recovery script

REGION_PRIMARY="us-central1"
REGION_DR="us-east1"
SERVICE_NAME="nubemgenesis"

check_primary_health() {
    curl -f https://nubemgenesis-394068846550.us-central1.run.app/health
    return $?
}

activate_dr_region() {
    echo "Activating disaster recovery region..."
    
    # Deploy to DR region
    gcloud run deploy $SERVICE_NAME \
        --image gcr.io/nubemgenesis-v1-1/$SERVICE_NAME:latest \
        --region $REGION_DR \
        --platform managed
        
    # Update DNS to point to DR region
    gcloud dns record-sets transaction start \
        --zone="nubemgenesis-zone"
    
    gcloud dns record-sets transaction remove \
        --zone="nubemgenesis-zone" \
        --name="api.nubemgenesis.ai." \
        --type="A" \
        --ttl=300 \
        --rrdatas="OLD_IP"
        
    gcloud dns record-sets transaction add \
        --zone="nubemgenesis-zone" \
        --name="api.nubemgenesis.ai." \
        --type="A" \
        --ttl=60 \
        --rrdatas="NEW_DR_IP"
        
    gcloud dns record-sets transaction execute \
        --zone="nubemgenesis-zone"
}

# Main recovery logic
if ! check_primary_health; then
    echo "Primary region unhealthy, activating DR..."
    activate_dr_region
    
    # Send alerts
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 DR ACTIVATED: Primary region failed"}' \
        $SLACK_WEBHOOK
fi
```

## 📊 Recovery Testing

### **DR Test Schedule**

| Test Type | Frequency | Scope | Success Criteria |
|-----------|-----------|-------|------------------|
| **Backup Verification** | Daily | All backups | < 1% failure rate |
| **Service Failover** | Weekly | Individual services | < 15min RTO |
| **Database Recovery** | Monthly | Full DB restore | < 30min RTO |
| **Full DR Exercise** | Quarterly | Complete system | < 2hr RTO |

### **Test Results Tracking**

```typescript
interface DRTestResult {
  testDate: Date;
  testType: 'backup' | 'failover' | 'full_dr';
  rtoAchieved: number; // minutes
  rpoAchieved: number; // minutes
  success: boolean;
  issuesFound: string[];
  improvementActions: string[];
}

// Example test result
const lastDRTest: DRTestResult = {
  testDate: new Date('2024-12-15'),
  testType: 'full_dr',
  rtoAchieved: 95, // minutes
  rpoAchieved: 3,  // minutes
  success: true,
  issuesFound: [
    'DNS propagation slower than expected',
    'SSL certificate renewal needed in DR region'
  ],
  improvementActions: [
    'Implement shorter TTL for DNS records',
    'Automate SSL cert provisioning'
  ]
};
```

## 💰 Cost Optimization

### **DR Cost Structure**

| Component | Monthly Cost | Notes |
|-----------|--------------|--------|
| **Standby Infrastructure** | $150 | Minimal instances |
| **Cross-region Backups** | $50 | Storage costs |
| **Monitoring & Alerting** | $25 | Enhanced monitoring |
| **Testing & Validation** | $75 | Monthly DR tests |
| **Total DR Investment** | **$300** | ~15% of total infra cost |

**ROI Analysis**: 
- Potential downtime cost: $10,000/hour
- DR investment saves: ~$240,000/year in avoided downtime
- **ROI**: 67x return on investment