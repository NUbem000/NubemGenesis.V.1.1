#!/bin/bash

# Credenciales de GoDaddy
API_KEY=$(gcloud secrets versions access latest --secret=GODADDY_API_KEY)
API_SECRET=$(gcloud secrets versions access latest --secret=GODADDY_API_SECRET)
DOMAIN="nubemgenesis.ai"

# IPs de Google Cloud Run
declare -a A_RECORDS=("216.239.32.21" "216.239.34.21" "216.239.36.21" "216.239.38.21")

echo "Configurando registros DNS en GoDaddy para $DOMAIN..."

# 1. Eliminar registros A existentes
echo "Eliminando registros A existentes..."
curl -X DELETE \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/A/@"

# 2. Configurar nuevos registros A
echo "Configurando nuevos registros A..."
A_RECORDS_JSON="["
for ip in "${A_RECORDS[@]}"; do
  A_RECORDS_JSON+="{\"data\": \"$ip\", \"name\": \"@\", \"ttl\": 600, \"type\": \"A\"},"
done
A_RECORDS_JSON="${A_RECORDS_JSON%,}]"

curl -X PUT \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "$A_RECORDS_JSON" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/A/@"

# 3. Configurar registro CNAME para www
echo "Configurando registro CNAME para www..."
curl -X PUT \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"ghs.googlehosted.com\", \"name\": \"www\", \"ttl\": 600, \"type\": \"CNAME\"}]" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/CNAME/www"

# 4. Verificar configuración
echo "Verificando configuración actual..."
echo "Registros A:"
curl -s -X GET \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/A/@" | jq

echo "Registro CNAME para www:"
curl -s -X GET \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/CNAME/www" | jq

echo "Configuración completada. Los cambios pueden tardar hasta 48 horas en propagarse globalmente."