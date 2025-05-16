#!/bin/bash

# Credenciales de GoDaddy
API_KEY=$(gcloud secrets versions access latest --secret=GODADDY_API_KEY)
API_SECRET=$(gcloud secrets versions access latest --secret=GODADDY_API_SECRET)
DOMAIN="nubemgenesis.ai"

# Verificar si el código de verificación se proporcionó como argumento
if [ $# -eq 0 ]; then
    echo "Error: Debe proporcionar el código de verificación de Google"
    echo "Uso: ./add_txt_record.sh CODIGO_VERIFICACION"
    exit 1
fi

# Código de verificación
VERIFICATION_CODE="google-site-verification=$1"

# Guardar el código en Secret Manager
echo "Guardando código de verificación en Secret Manager..."
echo -n "$VERIFICATION_CODE" | gcloud secrets create GOOGLE_VERIFICATION_CODE --data-file=- --replication-policy="automatic" || \
echo -n "$VERIFICATION_CODE" | gcloud secrets versions add GOOGLE_VERIFICATION_CODE --data-file=-

echo "Añadiendo registro TXT a GoDaddy..."
curl -X PUT \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"$VERIFICATION_CODE\", \"name\": \"@\", \"ttl\": 600, \"type\": \"TXT\"}]" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/TXT/@"

echo "Verificando la configuración del registro TXT..."
curl -X GET \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/TXT/@"

echo "El registro TXT se ha añadido exitosamente. Espere unos minutos para que se propague el cambio."
echo "Después, ejecute: gcloud domains verify nubemgenesis.ai"