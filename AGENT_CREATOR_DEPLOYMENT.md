# Agent Creator Deployment Guide

## Overview

The Agent Creator is a new feature in NubemGenesis that allows users to create AI agents through a guided wizard interface. This guide covers testing locally, deploying to production, and configuring the feature.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Backend Requirements](#backend-requirements)
3. [Configuration](#configuration)
4. [Testing Locally](#testing-locally)
5. [Production Deployment](#production-deployment)
6. [Testing Checklist](#testing-checklist)
7. [Quick Demo Script](#quick-demo-script)
8. [Troubleshooting](#troubleshooting)

## Local Development Setup

### Prerequisites

- Node.js v18+ and pnpm installed
- Access to a running NubemGenesis server instance
- API keys for LLM providers (OpenAI, Anthropic, etc.)

### Installation Steps

1. **Clone and install dependencies:**
```bash
cd /home/david/NubemGenesis.V.1.1
pnpm install
```

2. **Start the development server:**
```bash
# Terminal 1: Start the backend server
cd packages/server
pnpm dev

# Terminal 2: Start the UI development server
cd packages/ui
pnpm dev
```

3. **Access the application:**
- Open http://localhost:3001 in your browser
- Navigate to "Agent Creator" in the sidebar (has a sparkles icon and "New" badge)

## Backend Requirements

### API Endpoints

The Agent Creator feature requires the following backend endpoints:

1. **Chatflows API** (existing):
   - `POST /api/v1/chatflows` - Create new agent/chatflow
   - `GET /api/v1/chatflows` - List existing agents
   - `GET /api/v1/chatflows/:id` - Get agent details
   - `PUT /api/v1/chatflows/:id` - Update agent configuration

2. **Nodes API** (existing):
   - `GET /api/v1/nodes` - Get available nodes for agent construction

3. **Variables API** (existing):
   - `GET /api/v1/variables` - Get system variables
   - `POST /api/v1/variables` - Create new variables

4. **Credentials API** (existing):
   - `GET /api/v1/credentials` - Get available credentials
   - `POST /api/v1/credentials` - Create new credentials

### Database Requirements

- PostgreSQL 12+ or SQLite (development)
- Required tables are created automatically by TypeORM migrations

### Environment Variables

Create or update `.env` file in the server package:

```env
# Server Configuration
PORT=3000
FLOWISE_USERNAME=admin
FLOWISE_PASSWORD=your-secure-password

# Database Configuration
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=nubemgenesis
DATABASE_PASSWORD=your-db-password
DATABASE_NAME=nubemgenesis

# Security
FLOWISE_SECRETKEY_OVERWRITE=your-secret-key-min-32-chars
PASSPHRASE=your-encryption-passphrase

# Optional: Enable debug mode
DEBUG=true
LOG_LEVEL=debug

# LLM Configuration (for agent orchestration)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Configuration

### UI Configuration

The Agent Creator UI is configured through:

1. **Route Configuration** (`src/routes/MainRoutes.jsx`):
   - Path: `/agent-creator`
   - Component: `AgentCreator`

2. **Menu Configuration** (`src/menu-items/dashboard.js`):
   - Added to main dashboard menu
   - Icon: `IconSparkles`
   - Shows "New" badge

3. **Feature Flags** (optional):
   ```javascript
   // In src/config.js
   export const FEATURES = {
       AGENT_CREATOR: process.env.REACT_APP_ENABLE_AGENT_CREATOR !== 'false'
   }
   ```

### Backend Configuration

No additional backend configuration is required beyond the standard NubemGenesis setup.

## Testing Locally

### 1. Basic Functionality Test

```bash
# Start both server and UI
cd packages/server && pnpm dev &
cd packages/ui && pnpm dev
```

Navigate to http://localhost:3001/agent-creator and verify:
- Page loads without errors
- All three action cards are visible
- Template selector opens when clicked
- AI creation dialog opens

### 2. Agent Creation Flow Test

1. Click "Create with AI"
2. Enter a description: "I need a customer support agent"
3. Follow the wizard steps:
   - Description
   - Clarification (if needed)
   - Configuration
   - Access settings
   - Deployment

### 3. Template Selection Test

1. Click "Start from Template"
2. Select a template (e.g., "Customer Support Agent")
3. Verify pre-filled data appears in the creation dialog

## Production Deployment

### Method 1: Docker Deployment (Recommended)

1. **Build the Docker image:**
```bash
cd /home/david/NubemGenesis.V.1.1
docker build -f Dockerfile.nubemgenesis-final -t nubemgenesis:latest .
```

2. **Run with Docker Compose:**
```yaml
# docker-compose.yml
version: '3.8'
services:
  nubemgenesis:
    image: nubemgenesis:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_TYPE=postgres
      - DATABASE_HOST=db
      - DATABASE_PORT=5432
      - DATABASE_USER=nubemgenesis
      - DATABASE_PASSWORD=your-password
      - DATABASE_NAME=nubemgenesis
      - FLOWISE_SECRETKEY_OVERWRITE=your-secret-key
    depends_on:
      - db
  
  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=nubemgenesis
      - POSTGRES_PASSWORD=your-password
      - POSTGRES_DB=nubemgenesis
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Method 2: Google Cloud Run Deployment

1. **Build and push to Container Registry:**
```bash
# Set project ID
export PROJECT_ID=your-gcp-project-id
export REGION=us-central1

# Build and push
gcloud builds submit --config cloudbuild-nubemgenesis-fixed.yaml

# Deploy to Cloud Run
gcloud run deploy nubemgenesis \
  --image gcr.io/$PROJECT_ID/nubemgenesis:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_TYPE=postgres,DATABASE_HOST=/cloudsql/$PROJECT_ID:$REGION:nubemgenesis" \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:nubemgenesis
```

### Method 3: Traditional Server Deployment

1. **Build the application:**
```bash
cd /home/david/NubemGenesis.V.1.1
pnpm install
pnpm build
```

2. **Copy to server:**
```bash
rsync -avz --exclude='node_modules' --exclude='.git' \
  ./ user@your-server:/opt/nubemgenesis/
```

3. **Install and start on server:**
```bash
ssh user@your-server
cd /opt/nubemgenesis
pnpm install --production
pm2 start packages/server/bin/run -- start
```

### Post-Deployment Steps

1. **Verify deployment:**
```bash
curl https://your-domain.com/api/v1/ping
```

2. **Set up SSL (if not using Cloud Run):**
```bash
# Using Certbot
sudo certbot --nginx -d your-domain.com
```

3. **Configure reverse proxy (Nginx example):**
```nginx
server {
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Testing Checklist

### Pre-Deployment Testing

- [ ] **UI Components**
  - [ ] Agent Creator page loads correctly
  - [ ] All buttons and interactions work
  - [ ] Templates load and can be selected
  - [ ] Form validation works properly
  - [ ] Error messages display correctly

- [ ] **Agent Creation Flow**
  - [ ] Can create agent from description
  - [ ] Clarification step works when needed
  - [ ] Configuration options are appropriate
  - [ ] Access settings can be configured
  - [ ] Agent deploys successfully

- [ ] **Integration Testing**
  - [ ] Created agents appear in Chatflows list
  - [ ] Agents can be tested via chat interface
  - [ ] API keys are properly configured
  - [ ] Credentials are saved securely

### Post-Deployment Testing

- [ ] **Production Environment**
  - [ ] Application accessible via domain
  - [ ] SSL certificate valid
  - [ ] All API endpoints responding
  - [ ] Database connections stable
  - [ ] Environment variables set correctly

- [ ] **Performance Testing**
  - [ ] Page load time < 3 seconds
  - [ ] Agent creation < 30 seconds
  - [ ] No memory leaks during extended use
  - [ ] Concurrent user support

- [ ] **Security Testing**
  - [ ] Authentication required for admin features
  - [ ] API keys encrypted in database
  - [ ] No sensitive data in logs
  - [ ] CORS properly configured

## Quick Demo Script

### Demo 1: Create Customer Support Agent (2 minutes)

```javascript
// 1. Navigate to Agent Creator
// Click "Agent Creator" in sidebar

// 2. Click "Create with AI"

// 3. Enter description:
"I need a customer support agent that can answer questions about our products, 
handle returns and refunds, and escalate complex issues to human agents"

// 4. Follow wizard:
// - Accept suggested clarifications
// - Choose "Balanced" performance
// - Enable chat widget
// - Deploy

// 5. Test the agent
// Navigate to deployed agent and ask:
"How do I return a product?"
```

### Demo 2: Use Template (1 minute)

```javascript
// 1. Click "Start from Template"

// 2. Select "Document Q&A Agent"

// 3. Customize:
// - Name: "Company Knowledge Base"
// - Upload sample documents
// - Deploy

// 4. Test with document questions
```

### Demo 3: Quick Use Case (30 seconds)

```javascript
// 1. From main page, click "Sales Assistant" use case

// 2. Review pre-filled configuration

// 3. Click "Deploy Now"

// 4. Share embed code with sales team
```

## Troubleshooting

### Common Issues

1. **"Agent Creator" menu item not visible**
   - Clear browser cache
   - Check menu-items configuration
   - Verify route is registered

2. **Creation fails with "Network Error"**
   - Check backend is running
   - Verify API endpoints are accessible
   - Check CORS configuration

3. **Templates not loading**
   - Verify templates exist in database
   - Check API response in Network tab
   - Look for console errors

4. **Agent deployment fails**
   - Check API keys are configured
   - Verify credentials have proper permissions
   - Check server logs for errors

### Debug Mode

Enable debug logging:

```javascript
// In browser console
localStorage.setItem('DEBUG', 'true')

// In server .env
DEBUG=true
LOG_LEVEL=debug
```

### Log Locations

- **UI Logs**: Browser console
- **Server Logs**: 
  - Development: Terminal output
  - Production: `/var/log/nubemgenesis/server.log`
  - PM2: `pm2 logs nubemgenesis`

### Getting Help

1. Check existing documentation in `/docs`
2. Review implementation notes in `/packages/ui/src/views/agentcreator/README.md`
3. Check GitHub issues for similar problems
4. Contact support at support@nubemgenesis.com

## Appendix: API Reference

### Create Agent Endpoint

```http
POST /api/v1/chatflows
Content-Type: application/json

{
  "name": "Customer Support Agent",
  "flowData": "{...}", // JSON string of flow configuration
  "deployed": true,
  "isPublic": true,
  "apikeyid": "optional-api-key-id",
  "chatbotConfig": {
    "welcomeMessage": "Hello! How can I help you today?",
    "starterPrompts": ["Track order", "Return item", "Contact support"]
  }
}
```

### Response

```json
{
  "id": "abc-123",
  "name": "Customer Support Agent",
  "flowData": "{...}",
  "deployed": true,
  "isPublic": true,
  "createdDate": "2024-01-15T10:00:00Z",
  "updatedDate": "2024-01-15T10:00:00Z"
}
```

### Test Agent Endpoint

```http
POST /api/v1/prediction/{agentId}
Content-Type: application/json

{
  "question": "How do I return an item?",
  "overrideConfig": {}
}
```

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**Maintainer**: NubemGenesis Team