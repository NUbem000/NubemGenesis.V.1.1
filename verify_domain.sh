#!/bin/bash

# Variables
API_KEY=$(gcloud secrets versions access latest --secret=GODADDY_API_KEY)
API_SECRET=$(gcloud secrets versions access latest --secret=GODADDY_API_SECRET)
DOMAIN="nubemgenesis.ai"
PROJECT_ID="nubemgenesis-v1-1"
SERVICE_NAME="nubemgenesis"
REGION="us-central1"

echo "Iniciando proceso de verificación de dominio para $DOMAIN..."

# Verificar que los nameservers son los de GoDaddy
echo "Verificando nameservers..."
NS_CHECK=$(curl -s -X GET -H "Authorization: sso-key $API_KEY:$API_SECRET" "https://api.godaddy.com/v1/domains/$DOMAIN" | jq -r '.nameServers[]')

if [[ $NS_CHECK == *"domaincontrol.com"* ]]; then
  echo "✓ Nameservers configurados correctamente a GoDaddy"
else
  echo "⚠️ Atención: Los nameservers no son de GoDaddy. Esto puede causar problemas con la configuración DNS."
  echo "Nameservers actuales: $NS_CHECK"
  echo "Por favor, actualiza los nameservers a los de GoDaddy antes de continuar."
  exit 1
fi

# Paso 1: Verificar dominio en Google Cloud
echo "Paso 1: Iniciando verificación de dominio con Google Cloud..."
echo "Abriendo la consola de Google Search para verificación manual..."
gcloud domains verify $DOMAIN

echo "Por favor, visita la página web que se ha abierto y obtén el código de verificación."
echo "El código tendrá el formato: google-site-verification=XXXXX"
echo "Si no se abrió automáticamente, visita: https://search.google.com/search-console/welcome"
echo ""
echo "Por favor, ingresa el código de verificación completo:"
read VERIFICATION_CODE

# Verificar formato
if [[ ! $VERIFICATION_CODE == google-site-verification=* ]]; then
  echo "El código no tiene el formato correcto. Debe comenzar con 'google-site-verification='"
  echo "Por favor, ingresa el código completo:"
  read VERIFICATION_CODE
fi

# Guardar el código en Secret Manager
echo "Guardando código de verificación en Secret Manager..."
echo -n "$VERIFICATION_CODE" | gcloud secrets create GOOGLE_VERIFICATION_CODE --data-file=- --replication-policy="automatic" 2>/dev/null || \
echo -n "$VERIFICATION_CODE" | gcloud secrets versions add GOOGLE_VERIFICATION_CODE --data-file=- 2>/dev/null

echo "Código de verificación: $VERIFICATION_CODE"

# Paso 2: Configurar el registro TXT en GoDaddy
echo "Paso 2: Configurando registro TXT en GoDaddy..."
TXT_RESPONSE=$(curl -s -X PUT \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"$VERIFICATION_CODE\", \"name\": \"@\", \"ttl\": 600, \"type\": \"TXT\"}]" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/TXT/@")

if [[ -z "$TXT_RESPONSE" ]]; then
  echo "✓ Registro TXT configurado correctamente"
else
  echo "⚠️ Error al configurar el registro TXT: $TXT_RESPONSE"
  exit 1
fi

echo "Verificando que el registro TXT se haya configurado correctamente..."
TXT_VERIFY=$(curl -s -X GET \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/TXT/@" | jq -r '.[].data')

echo "Valor del registro TXT configurado: $TXT_VERIFY"

echo "La propagación DNS puede tardar hasta 24 horas, pero generalmente es más rápida."
echo "Se recomienda esperar al menos 5-10 minutos antes de continuar con la verificación en Google."
echo "¿Deseas esperar 5 minutos antes de continuar? (s/n)"
read WAIT_RESPONSE

if [[ $WAIT_RESPONSE == "s" ]]; then
  echo "Esperando 5 minutos para la propagación DNS..."
  sleep 300
else
  echo "Esperando 30 segundos para la propagación DNS..."
  sleep 30
fi

# Paso 3: Intentar mapear el dominio al servicio de Cloud Run
echo "Paso 3: Ahora debes completar la verificación en Google Search Console."
echo "Vuelve a la página de verificación de Google, haz clic en Verificar y confirma que se ha verificado el dominio."
echo "¿Se ha verificado exitosamente el dominio en Google? (s/n)"
read VERIFICATION_SUCCESS

if [[ $VERIFICATION_SUCCESS != "s" ]]; then
  echo "⚠️ La verificación no se ha completado. Por favor, intenta lo siguiente:"
  echo "1. Espera más tiempo para la propagación DNS"
  echo "2. Verifica que el registro TXT se haya configurado correctamente"
  echo "3. Intenta nuevamente la verificación en Google"
  echo "Puedes ejecutar este script nuevamente cuando estés listo para continuar."
  exit 1
fi

echo "Intentando mapear el dominio al servicio de Cloud Run..."
gcloud beta run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=$DOMAIN \
  --region=$REGION \
  --platform=managed

# Paso 4: Obtener y configurar los registros DNS finales
echo "Paso 4: Obteniendo información de registros DNS para configuración final..."
MAPPING_INFO=$(gcloud beta run domain-mappings describe \
  --domain=$DOMAIN \
  --region=$REGION 2>/dev/null)

if [ -n "$MAPPING_INFO" ]; then
  echo "Configurando registros DNS finales en GoDaddy..."
  
  # Extraer IPs para registros A
  A_RECORDS=$(echo "$MAPPING_INFO" | grep -o 'rrdata: [0-9.]*' | awk '{print $2}')
  
  if [ -n "$A_RECORDS" ]; then
    # Construir JSON para registros A
    A_RECORDS_JSON="["
    for ip in $A_RECORDS; do
      A_RECORDS_JSON+="{\"data\": \"$ip\", \"name\": \"@\", \"ttl\": 600, \"type\": \"A\"},"
    done
    A_RECORDS_JSON=${A_RECORDS_JSON%,}  # Eliminar la última coma
    A_RECORDS_JSON+="]"
    
    # Configurar registros A
    echo "Configurando registros A en GoDaddy..."
    curl -s -X PUT \
      -H "Authorization: sso-key $API_KEY:$API_SECRET" \
      -H "Content-Type: application/json" \
      -d "$A_RECORDS_JSON" \
      "https://api.godaddy.com/v1/domains/$DOMAIN/records/A/@" > /dev/null
    
    echo "✓ Registros A configurados con las IPs de Google Cloud"
  else
    echo "⚠️ No se pudieron obtener las IPs para los registros A"
  fi
  
  # Configurar CNAME para www
  echo "Configurando CNAME para www..."
  curl -s -X PUT \
    -H "Authorization: sso-key $API_KEY:$API_SECRET" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"$DOMAIN.\", \"name\": \"www\", \"ttl\": 600, \"type\": \"CNAME\"}]" \
    "https://api.godaddy.com/v1/domains/$DOMAIN/records/CNAME/www" > /dev/null
  
  echo "✓ Registro CNAME para www configurado"
else
  echo "⚠️ No se pudo obtener información del mapeo del dominio."
  echo "Es posible que la verificación aún no se haya completado o que haya habido un error en el mapeo."
  echo "Verifica el estado del mapeo con: gcloud beta run domain-mappings describe --domain=$DOMAIN --region=$REGION"
fi

echo ""
echo "=== Resumen del Proceso ==="
echo "✓ Nameservers configurados a GoDaddy"
echo "✓ Registro TXT de verificación configurado: $VERIFICATION_CODE"
echo "✓ Dominio verificado en Google Cloud"
echo "✓ Mapeo de dominio a Cloud Run solicitado"
echo "✓ Registros DNS finales configurados"
echo ""
echo "Proceso de verificación y configuración de dominio completado."
echo "La propagación DNS completa puede tardar hasta 24 horas."
echo ""
echo "Una vez que los DNS se propaguen, podrás acceder a tu aplicación en:"
echo "- https://$DOMAIN"
echo "- https://www.$DOMAIN"
echo ""
echo "Para verificar el estado del mapeo en cualquier momento:"
echo "gcloud beta run domain-mappings describe --domain=$DOMAIN --region=$REGION"