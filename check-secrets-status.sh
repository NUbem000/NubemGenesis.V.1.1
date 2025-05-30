#!/bin/bash

# Script to check the status of all secrets in Google Secret Manager

PROJECT_ID="nubemgenesis"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==============================================================${NC}"
echo -e "${BLUE}         NubemGenesis - Secret Manager Status Check          ${NC}"
echo -e "${BLUE}==============================================================${NC}"
echo ""

# List of all expected secrets
declare -A SECRETS=(
    # AI/ML APIs
    ["openai-api-key"]="OpenAI API"
    ["anthropic-api-key"]="Anthropic API"
    ["google-api-key"]="Google AI (Gemini)"
    ["huggingface-api-key"]="HuggingFace API"
    ["cohere-api-key"]="Cohere API"
    ["replicate-api-key"]="Replicate API"
    ["stability-api-key"]="Stability AI"
    ["midjourney-api-key"]="Midjourney API"
    
    # Communication
    ["twilio-auth-token"]="Twilio Auth Token"
    ["slack-bot-token"]="Slack Bot Token"
    ["discord-bot-token"]="Discord Bot Token"
    ["telegram-bot-token"]="Telegram Bot Token"
    
    # Email Services
    ["sendgrid-api-key"]="SendGrid API"
    ["mailgun-api-key"]="Mailgun API"
    ["mailchimp-api-key"]="Mailchimp API"
    
    # Cloud Providers
    ["azure-subscription-id"]="Azure Subscription ID"
    ["azure-client-id"]="Azure Client ID"
    ["azure-client-secret"]="Azure Client Secret"
    ["azure-tenant-id"]="Azure Tenant ID"
    ["digitalocean-token"]="DigitalOcean Token"
    
    # Databases
    ["mongodb-uri"]="MongoDB URI"
    ["redis-url"]="Redis URL"
    ["postgres-connection-string"]="PostgreSQL Connection"
    ["firebase-project-id"]="Firebase Project ID"
    ["firebase-private-key"]="Firebase Private Key"
    
    # Payment Services
    ["stripe-api-key"]="Stripe API"
    ["paypal-client-id"]="PayPal Client ID"
    ["paypal-client-secret"]="PayPal Client Secret"
    ["mercadopago-access-token"]="MercadoPago Token"
    
    # Analytics & Monitoring
    ["sentry-dsn"]="Sentry DSN"
    ["google-analytics-id"]="Google Analytics"
    ["mixpanel-token"]="Mixpanel Token"
    ["datadog-api-key"]="Datadog API"
    ["newrelic-license-key"]="New Relic License"
    
    # Storage & CDN
    ["aws-access-key-id"]="AWS Access Key ID"
    ["aws-secret-access-key"]="AWS Secret Access Key"
    ["s3-bucket-name"]="S3 Bucket Name"
    ["cloudinary-url"]="Cloudinary URL"
    ["cloudflare-api-token"]="Cloudflare Token"
    ["bunnycdn-api-key"]="Bunny CDN API"
    
    # Third-party APIs
    ["google-maps-api-key"]="Google Maps API"
    ["youtube-api-key"]="YouTube API"
    ["twitter-api-key"]="Twitter API Key"
    ["twitter-api-secret"]="Twitter API Secret"
    ["linkedin-client-id"]="LinkedIn Client ID"
    ["linkedin-client-secret"]="LinkedIn Client Secret"
    
    # Search & Scraping
    ["algolia-app-id"]="Algolia App ID"
    ["algolia-api-key"]="Algolia API Key"
    ["scraperapi-key"]="ScraperAPI Key"
    ["serp-api-key"]="SERP API Key"
    
    # Blockchain
    ["etherscan-api-key"]="Etherscan API"
    ["infura-project-id"]="Infura Project ID"
    ["alchemy-api-key"]="Alchemy API"
    ["binance-api-key"]="Binance API Key"
    ["binance-secret-key"]="Binance Secret Key"
)

# Categories for organization
echo -e "${BLUE}Checking all secrets...${NC}"
echo ""

# Get list of existing secrets
EXISTING_SECRETS=$(gcloud secrets list --project=$PROJECT_ID --format="value(name)" 2>/dev/null)

# Counters
CONFIGURED=0
MISSING=0

# Function to check if secret exists
check_secret() {
    local SECRET_NAME=$1
    local SECRET_DESC=$2
    
    if echo "$EXISTING_SECRETS" | grep -q "^${SECRET_NAME}$"; then
        echo -e "  ✅ ${GREEN}${SECRET_DESC}${NC} (${SECRET_NAME})"
        ((CONFIGURED++))
        return 0
    else
        echo -e "  ❌ ${RED}${SECRET_DESC}${NC} (${SECRET_NAME})"
        ((MISSING++))
        return 1
    fi
}

# Check each category
echo -e "${YELLOW}AI/ML APIs:${NC}"
check_secret "openai-api-key" "OpenAI API"
check_secret "anthropic-api-key" "Anthropic API"
check_secret "google-api-key" "Google AI (Gemini)"
check_secret "huggingface-api-key" "HuggingFace API"
check_secret "cohere-api-key" "Cohere API"
check_secret "replicate-api-key" "Replicate API"
check_secret "stability-api-key" "Stability AI"
check_secret "midjourney-api-key" "Midjourney API"

echo -e "\n${YELLOW}Communication Services:${NC}"
check_secret "twilio-auth-token" "Twilio Auth Token"
check_secret "slack-bot-token" "Slack Bot Token"
check_secret "discord-bot-token" "Discord Bot Token"
check_secret "telegram-bot-token" "Telegram Bot Token"

echo -e "\n${YELLOW}Email Services:${NC}"
check_secret "sendgrid-api-key" "SendGrid API"
check_secret "mailgun-api-key" "Mailgun API"
check_secret "mailchimp-api-key" "Mailchimp API"

echo -e "\n${YELLOW}Cloud Providers:${NC}"
check_secret "azure-subscription-id" "Azure Subscription ID"
check_secret "azure-client-id" "Azure Client ID"
check_secret "azure-client-secret" "Azure Client Secret"
check_secret "azure-tenant-id" "Azure Tenant ID"
check_secret "digitalocean-token" "DigitalOcean Token"

echo -e "\n${YELLOW}Databases:${NC}"
check_secret "mongodb-uri" "MongoDB URI"
check_secret "redis-url" "Redis URL"
check_secret "postgres-connection-string" "PostgreSQL Connection"
check_secret "firebase-project-id" "Firebase Project ID"
check_secret "firebase-private-key" "Firebase Private Key"

echo -e "\n${YELLOW}Payment Services:${NC}"
check_secret "stripe-api-key" "Stripe API"
check_secret "paypal-client-id" "PayPal Client ID"
check_secret "paypal-client-secret" "PayPal Client Secret"
check_secret "mercadopago-access-token" "MercadoPago Token"

echo -e "\n${YELLOW}Analytics & Monitoring:${NC}"
check_secret "sentry-dsn" "Sentry DSN"
check_secret "google-analytics-id" "Google Analytics"
check_secret "mixpanel-token" "Mixpanel Token"
check_secret "datadog-api-key" "Datadog API"
check_secret "newrelic-license-key" "New Relic License"

echo -e "\n${YELLOW}Storage & CDN:${NC}"
check_secret "aws-access-key-id" "AWS Access Key ID"
check_secret "aws-secret-access-key" "AWS Secret Access Key"
check_secret "s3-bucket-name" "S3 Bucket Name"
check_secret "cloudinary-url" "Cloudinary URL"
check_secret "cloudflare-api-token" "Cloudflare Token"
check_secret "bunnycdn-api-key" "Bunny CDN API"

echo -e "\n${YELLOW}Third-party APIs:${NC}"
check_secret "google-maps-api-key" "Google Maps API"
check_secret "youtube-api-key" "YouTube API"
check_secret "twitter-api-key" "Twitter API Key"
check_secret "twitter-api-secret" "Twitter API Secret"
check_secret "linkedin-client-id" "LinkedIn Client ID"
check_secret "linkedin-client-secret" "LinkedIn Client Secret"

echo -e "\n${YELLOW}Search & Scraping:${NC}"
check_secret "algolia-app-id" "Algolia App ID"
check_secret "algolia-api-key" "Algolia API Key"
check_secret "scraperapi-key" "ScraperAPI Key"
check_secret "serp-api-key" "SERP API Key"

echo -e "\n${YELLOW}Blockchain & Crypto:${NC}"
check_secret "etherscan-api-key" "Etherscan API"
check_secret "infura-project-id" "Infura Project ID"
check_secret "alchemy-api-key" "Alchemy API"
check_secret "binance-api-key" "Binance API Key"
check_secret "binance-secret-key" "Binance Secret Key"

# Summary
echo -e "\n${BLUE}==============================================================${NC}"
echo -e "${BLUE}                          SUMMARY                            ${NC}"
echo -e "${BLUE}==============================================================${NC}"
echo ""
echo -e "Total APIs: $((CONFIGURED + MISSING))"
echo -e "${GREEN}Configured: $CONFIGURED${NC}"
echo -e "${RED}Missing: $MISSING${NC}"
echo -e "Completion: $(( (CONFIGURED * 100) / (CONFIGURED + MISSING) ))%"
echo ""

if [ $MISSING -gt 0 ]; then
    echo -e "${YELLOW}To configure missing APIs, run:${NC}"
    echo "./setup-all-secrets-interactive.sh"
    echo ""
fi

echo -e "${BLUE}For detailed secret information:${NC}"
echo "gcloud secrets describe SECRET_NAME --project=$PROJECT_ID"
echo ""
echo -e "${BLUE}To list all secret versions:${NC}"
echo "gcloud secrets versions list SECRET_NAME --project=$PROJECT_ID"