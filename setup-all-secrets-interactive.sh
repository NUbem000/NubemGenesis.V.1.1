#!/bin/bash

# Interactive script to set up all missing API keys in Google Secret Manager

PROJECT_ID="nubemgenesis"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================${NC}"
echo -e "${BLUE}       NubemGenesis - Complete Secret Manager Setup          ${NC}"
echo -e "${BLUE}==============================================================${NC}"
echo ""
echo -e "${YELLOW}This script will help you configure all API keys and secrets.${NC}"
echo -e "${YELLOW}Press Enter to skip any API you don't want to configure.${NC}"
echo ""

# Function to create or update a secret
create_secret() {
    local SECRET_NAME=$1
    local SECRET_VALUE=$2
    local DESCRIPTION=$3
    
    if [ -z "$SECRET_VALUE" ]; then
        echo -e "${YELLOW}Skipping $SECRET_NAME (no value provided)${NC}"
        return
    fi
    
    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME --project=$PROJECT_ID >/dev/null 2>&1; then
        echo -e "${BLUE}Updating existing secret: $SECRET_NAME${NC}"
        echo -n "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=- --project=$PROJECT_ID
    else
        echo -e "${GREEN}Creating new secret: $SECRET_NAME${NC}"
        echo -n "$SECRET_VALUE" | gcloud secrets create $SECRET_NAME --data-file=- --project=$PROJECT_ID
    fi
}

# Function to prompt for API key
prompt_api() {
    local API_NAME=$1
    local SECRET_NAME=$2
    local DESCRIPTION=$3
    local EXAMPLE=$4
    
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}$API_NAME${NC}"
    echo -e "Description: $DESCRIPTION"
    if [ ! -z "$EXAMPLE" ]; then
        echo -e "Format example: ${YELLOW}$EXAMPLE${NC}"
    fi
    echo -e -n "Enter API key (or press Enter to skip): "
    read -s API_VALUE
    echo ""
    
    if [ ! -z "$API_VALUE" ]; then
        create_secret "$SECRET_NAME" "$API_VALUE" "$DESCRIPTION"
    fi
}

# Check if user wants to continue
echo -e -n "${YELLOW}Do you want to start configuring API keys? (y/n): ${NC}"
read CONTINUE
if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
    echo "Setup cancelled."
    exit 0
fi

echo -e "\n${BLUE}Starting API configuration...${NC}"

# ===== AI/ML APIs =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│         AI/ML Model APIs            │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

prompt_api "Cohere API Key" \
    "cohere-api-key" \
    "For Cohere's NLP models and embeddings" \
    "co-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Replicate API Token" \
    "replicate-api-key" \
    "For running ML models on Replicate" \
    "r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Stability AI API Key" \
    "stability-api-key" \
    "For Stable Diffusion and image generation" \
    "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Midjourney API Key" \
    "midjourney-api-key" \
    "For Midjourney image generation (if available)" \
    "mj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ===== Communication APIs =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│      Communication Services         │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

prompt_api "Twilio Auth Token" \
    "twilio-auth-token" \
    "For SMS and voice services (you already have Account SID)" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Slack Bot Token" \
    "slack-bot-token" \
    "For Slack integration" \
    "xoxb-xxxxxxxxxxxx-xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Discord Bot Token" \
    "discord-bot-token" \
    "For Discord bot integration" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Telegram Bot Token" \
    "telegram-bot-token" \
    "For Telegram bot integration" \
    "xxxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ===== Email Services =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│         Email Services              │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

prompt_api "SendGrid API Key" \
    "sendgrid-api-key" \
    "For transactional emails via SendGrid" \
    "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Mailgun API Key" \
    "mailgun-api-key" \
    "For email delivery via Mailgun" \
    "key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Mailchimp API Key" \
    "mailchimp-api-key" \
    "For email marketing via Mailchimp" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us1"

# ===== Cloud Providers =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│         Cloud Providers             │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

echo -e "\n${GREEN}Azure Configuration${NC}"
prompt_api "Azure Subscription ID" \
    "azure-subscription-id" \
    "Your Azure subscription identifier" \
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

prompt_api "Azure Client ID" \
    "azure-client-id" \
    "Azure AD application client ID" \
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

prompt_api "Azure Client Secret" \
    "azure-client-secret" \
    "Azure AD application secret" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Azure Tenant ID" \
    "azure-tenant-id" \
    "Azure AD tenant identifier" \
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

prompt_api "DigitalOcean Token" \
    "digitalocean-token" \
    "For DigitalOcean API access" \
    "dop_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ===== Databases =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│           Databases                 │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

prompt_api "MongoDB URI" \
    "mongodb-uri" \
    "MongoDB connection string" \
    "mongodb+srv://user:pass@cluster.mongodb.net/db"

prompt_api "Redis URL" \
    "redis-url" \
    "Redis connection URL for caching" \
    "redis://username:password@hostname:port"

prompt_api "PostgreSQL Connection String" \
    "postgres-connection-string" \
    "PostgreSQL database URL" \
    "postgresql://user:pass@host:5432/dbname"

echo -e "\n${GREEN}Firebase Configuration${NC}"
prompt_api "Firebase Project ID" \
    "firebase-project-id" \
    "Your Firebase project identifier" \
    "your-project-id"

prompt_api "Firebase Private Key" \
    "firebase-private-key" \
    "Firebase service account private key (JSON)" \
    '{"type": "service_account", ...}'

# ===== Payment Services =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│        Payment Services             │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

prompt_api "Stripe API Key" \
    "stripe-api-key" \
    "For payment processing via Stripe" \
    "sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "PayPal Client ID" \
    "paypal-client-id" \
    "PayPal app client identifier" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "PayPal Client Secret" \
    "paypal-client-secret" \
    "PayPal app secret" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "MercadoPago Access Token" \
    "mercadopago-access-token" \
    "For MercadoPago payment integration" \
    "APP_USR-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ===== Analytics & Monitoring =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│     Analytics & Monitoring          │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

prompt_api "Sentry DSN" \
    "sentry-dsn" \
    "For error tracking and monitoring" \
    "https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@oXXXXXX.ingest.sentry.io/XXXXXXX"

prompt_api "Google Analytics ID" \
    "google-analytics-id" \
    "For website analytics" \
    "G-XXXXXXXXXX or UA-XXXXXXXX-X"

prompt_api "Mixpanel Token" \
    "mixpanel-token" \
    "For product analytics" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Datadog API Key" \
    "datadog-api-key" \
    "For infrastructure monitoring" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "New Relic License Key" \
    "newrelic-license-key" \
    "For application performance monitoring" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ===== Storage & CDN =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│         Storage & CDN               │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

echo -e "\n${GREEN}AWS Configuration${NC}"
prompt_api "AWS Access Key ID" \
    "aws-access-key-id" \
    "AWS IAM access key" \
    "AKIAXXXXXXXXXXXXXXXX"

prompt_api "AWS Secret Access Key" \
    "aws-secret-access-key" \
    "AWS IAM secret key" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "S3 Bucket Name" \
    "s3-bucket-name" \
    "Your S3 bucket for storage" \
    "my-app-bucket"

prompt_api "Cloudinary URL" \
    "cloudinary-url" \
    "For image/video management" \
    "cloudinary://API_KEY:API_SECRET@CLOUD_NAME"

prompt_api "Cloudflare API Token" \
    "cloudflare-api-token" \
    "For CDN and DNS management" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Bunny CDN API Key" \
    "bunnycdn-api-key" \
    "For Bunny CDN services" \
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# ===== Third-party APIs =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│       Third-party APIs              │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

prompt_api "Google Maps API Key" \
    "google-maps-api-key" \
    "For maps and location services" \
    "AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

prompt_api "YouTube API Key" \
    "youtube-api-key" \
    "For YouTube Data API" \
    "AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

echo -e "\n${GREEN}Twitter/X Configuration${NC}"
prompt_api "Twitter API Key" \
    "twitter-api-key" \
    "Twitter app API key" \
    "xxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Twitter API Secret" \
    "twitter-api-secret" \
    "Twitter app API secret" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

echo -e "\n${GREEN}LinkedIn Configuration${NC}"
prompt_api "LinkedIn Client ID" \
    "linkedin-client-id" \
    "LinkedIn app client ID" \
    "xxxxxxxxxxxxxx"

prompt_api "LinkedIn Client Secret" \
    "linkedin-client-secret" \
    "LinkedIn app client secret" \
    "xxxxxxxxxxxxxxxx"

# ===== Search & Scraping =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│       Search & Scraping             │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

echo -e "\n${GREEN}Algolia Configuration${NC}"
prompt_api "Algolia App ID" \
    "algolia-app-id" \
    "Your Algolia application ID" \
    "XXXXXXXXXX"

prompt_api "Algolia API Key" \
    "algolia-api-key" \
    "Algolia admin API key" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "ScraperAPI Key" \
    "scraperapi-key" \
    "For web scraping services" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "SERP API Key" \
    "serp-api-key" \
    "For search engine results" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ===== Blockchain/Crypto =====
echo -e "\n${BLUE}┌─────────────────────────────────────┐${NC}"
echo -e "${BLUE}│       Blockchain & Crypto           │${NC}"
echo -e "${BLUE}└─────────────────────────────────────┘${NC}"

prompt_api "Etherscan API Key" \
    "etherscan-api-key" \
    "For Ethereum blockchain data" \
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

prompt_api "Infura Project ID" \
    "infura-project-id" \
    "For Ethereum node access" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Alchemy API Key" \
    "alchemy-api-key" \
    "For blockchain development" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

echo -e "\n${GREEN}Binance Configuration${NC}"
prompt_api "Binance API Key" \
    "binance-api-key" \
    "For Binance exchange API" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

prompt_api "Binance Secret Key" \
    "binance-secret-key" \
    "Binance API secret" \
    "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# ===== Summary =====
echo -e "\n${BLUE}==============================================================${NC}"
echo -e "${GREEN}Secret Manager configuration completed!${NC}"
echo -e "${BLUE}==============================================================${NC}"
echo ""
echo -e "${YELLOW}To view all secrets:${NC}"
echo "gcloud secrets list --project=$PROJECT_ID"
echo ""
echo -e "${YELLOW}To update a specific secret later:${NC}"
echo "echo -n 'new-value' | gcloud secrets versions add SECRET_NAME --data-file=- --project=$PROJECT_ID"
echo ""
echo -e "${YELLOW}To grant access to a service account:${NC}"
echo "gcloud projects add-iam-policy-binding $PROJECT_ID \\"
echo "  --member='serviceAccount:SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com' \\"
echo "  --role='roles/secretmanager.secretAccessor'"
echo ""
echo -e "${GREEN}Setup complete! Your APIs are now securely stored in Google Secret Manager.${NC}"