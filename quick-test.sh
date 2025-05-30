#!/bin/bash

# Quick test script for NubemGenesis Orchestrator

echo "🧪 NubemGenesis Quick Test Suite"
echo "================================"

BASE_URL="https://nubemgenesis-orchestrator-7ut3uy4xcq-uc.a.run.app"
API_KEY="test-key-123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Health Check
echo -e "\n1️⃣ Testing Health Check..."
HEALTH=$(curl -s "$BASE_URL/api/v1/orchestrate/health")
if [[ $HEALTH == *"healthy"* ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "   Response: $HEALTH" | jq -C '.' 2>/dev/null || echo "   Response: $HEALTH"
else
    echo -e "${RED}❌ Health check failed${NC}"
fi

# Test 2: Simple Orchestration
echo -e "\n2️⃣ Testing Simple Orchestration..."
ORCH_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/orchestrate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "request": "Create a simple chatbot",
    "config": {
      "maxCost": 0.01,
      "maxLatency": 3000,
      "minQuality": 0.8
    }
  }')

if [[ $ORCH_RESPONSE == *"success"* ]]; then
    echo -e "${GREEN}✅ Orchestration successful${NC}"
    echo "   Selected Model: $(echo $ORCH_RESPONSE | jq -r '.model' 2>/dev/null || echo 'N/A')"
    echo "   Flow Type: $(echo $ORCH_RESPONSE | jq -r '.analysis.type' 2>/dev/null || echo 'N/A')"
else
    echo -e "${RED}❌ Orchestration failed${NC}"
    echo "   Error: $ORCH_RESPONSE"
fi

# Test 3: Model Leaderboard
echo -e "\n3️⃣ Testing Model Leaderboard..."
LEADERBOARD=$(curl -s "$BASE_URL/api/v1/orchestrate/leaderboard")
if [[ $LEADERBOARD == *"leaderboard"* ]]; then
    echo -e "${GREEN}✅ Leaderboard accessible${NC}"
    echo "   Models in leaderboard: $(echo $LEADERBOARD | jq '.leaderboard | length' 2>/dev/null || echo 'N/A')"
else
    echo -e "${RED}❌ Leaderboard failed${NC}"
fi

# Test 4: Capabilities
echo -e "\n4️⃣ Testing Capabilities Endpoint..."
CAPABILITIES=$(curl -s "$BASE_URL/api/v1/orchestrate/capabilities")
if [[ $CAPABILITIES == *"capabilities"* ]]; then
    echo -e "${GREEN}✅ Capabilities loaded${NC}"
    echo "   Total capabilities: $(echo $CAPABILITIES | jq '.capabilities | length' 2>/dev/null || echo 'N/A')"
else
    echo -e "${RED}❌ Capabilities failed${NC}"
fi

# Test 5: Frontend
echo -e "\n5️⃣ Testing Frontend..."
FRONTEND_URL="https://nubemgenesis-frontend-1045270359433.us-central1.run.app"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/health")
if [[ $FRONTEND_STATUS == "200" ]]; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
    echo "   URL: $FRONTEND_URL"
else
    echo -e "${RED}❌ Frontend is not accessible (HTTP $FRONTEND_STATUS)${NC}"
fi

# Test 6: High Quality Model Selection
echo -e "\n6️⃣ Testing High Quality Model Selection..."
HQ_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/orchestrate" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "request": "Create a legal document analyzer",
    "config": {
      "maxCost": 0.1,
      "maxLatency": 5000,
      "minQuality": 0.95
    }
  }')

SELECTED_MODEL=$(echo $HQ_RESPONSE | jq -r '.model' 2>/dev/null || echo 'N/A')
if [[ $SELECTED_MODEL == "claude-3-opus" ]] || [[ $SELECTED_MODEL == "gpt-4" ]]; then
    echo -e "${GREEN}✅ High quality model selected correctly: $SELECTED_MODEL${NC}"
else
    echo -e "${RED}❌ Wrong model selected for high quality: $SELECTED_MODEL${NC}"
fi

# Summary
echo -e "\n📊 Test Summary"
echo "================"
echo "Frontend URL: $FRONTEND_URL"
echo "API Base URL: $BASE_URL"
echo -e "\n💡 To run comprehensive tests, execute:"
echo "   node test-agent-mvp.js"
echo -e "\n📚 For detailed methodology, see:"
echo "   test-methodology.md"