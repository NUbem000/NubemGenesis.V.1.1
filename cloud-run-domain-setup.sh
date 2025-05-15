#\!/bin/bash

# Script para configurar un dominio personalizado en Cloud Run
# y configurar registros DNS en GoDaddy

# Cargar secretos desde Secret Manager
GODADDY_API_KEY=$(gcloud secrets versions access latest --secret=GODADDY_API_KEY)
GODADDY_API_SECRET=$(gcloud secrets versions access latest --secret=GODADDY_API_SECRET)
DOMAIN_NAME=$(gcloud secrets versions access latest --secret=DOMAIN_NAME)
PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

# Obtener la URL del servicio de Cloud Run
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
SERVICE_URL=${SERVICE_URL#https://}

echo "Configurando dominio $DOMAIN_NAME para servicio Cloud Run en $SERVICE_URL"

# 1. Verificar dominio en Google Cloud
echo "Paso 1: Generando registro de verificación de dominio..."
VERIFICATION_RECORD=$(gcloud domains verify $DOMAIN_NAME --format="value(verificationRecord)")
VERIFICATION_VALUE=${VERIFICATION_RECORD#"google-site-verification="}

echo "Configurando registro TXT para verificación en GoDaddy..."
curl -X PUT \
  -H "Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"$VERIFICATION_VALUE\", \"name\": \"@\", \"ttl\": 600, \"type\": \"TXT\"}]" \
  "https://api.godaddy.com/v1/domains/$DOMAIN_NAME/records/TXT/@"

# Esperar a que se propague el registro DNS (puede tardar hasta 24 horas)
echo "Esperar a que se propague el registro DNS... (30 segundos)"
sleep 30

# 2. Mapear el dominio a Cloud Run
echo "Paso 2: Mapeando dominio $DOMAIN_NAME al servicio $SERVICE_NAME..."
gcloud beta run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=$DOMAIN_NAME \
  --region=$REGION

# 3. Obtener registros DNS para configurar en GoDaddy
echo "Paso 3: Obteniendo registros DNS para configurar en GoDaddy..."
MAPPING_RECORD=$(gcloud beta run domain-mappings describe \
  --domain=$DOMAIN_NAME \
  --region=$REGION \
  --format="value(resourceRecords)")

# Formato: [[rrdata=x.x.x.x, type=A], [rrdata=y.y.y, type=CNAME]]
# Extraer los registros A y CNAME
A_RECORDS=$(echo $MAPPING_RECORD  < /dev/null |  grep -oP '(?<=rrdata=)[^,]+(?=, type=A)')
CNAME_RECORDS=$(echo $MAPPING_RECORD | grep -oP '(?<=rrdata=)[^,]+(?=, type=CNAME)')

# 4. Configurar registros A en GoDaddy
echo "Paso 4: Configurando registros A en GoDaddy..."
A_RECORDS_JSON="["
for ip in $A_RECORDS; do
  A_RECORDS_JSON+="{\"data\": \"$ip\", \"name\": \"@\", \"ttl\": 600, \"type\": \"A\"},"
done
A_RECORDS_JSON=${A_RECORDS_JSON%,}  # Eliminar la última coma
A_RECORDS_JSON+="]"

curl -X PUT \
  -H "Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET" \
  -H "Content-Type: application/json" \
  -d "$A_RECORDS_JSON" \
  "https://api.godaddy.com/v1/domains/$DOMAIN_NAME/records/A/@"

# 5. Configurar subdominio www como CNAME
echo "Paso 5: Configurando www como CNAME..."
curl -X PUT \
  -H "Authorization: sso-key $GODADDY_API_KEY:$GODADDY_API_SECRET" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"$DOMAIN_NAME\", \"name\": \"www\", \"ttl\": 600, \"type\": \"CNAME\"}]" \
  "https://api.godaddy.com/v1/domains/$DOMAIN_NAME/records/CNAME/www"

echo "Configuración de dominio completada. La propagación DNS puede tardar hasta 24 horas."
echo "Una vez que los DNS se propaguen, podrás acceder a tu aplicación en https://$DOMAIN_NAME"
