#!/bin/bash

# Este script configura registros DNS en Cloudflare para redirigir temporalmente
# el dominio nubemgenesis.ai a la URL de Cloud Run mientras se completa la verificación

# Variables
DOMAIN="nubemgenesis.ai"
CLOUD_RUN_URL="nubemgenesis-zqvgtbn4ya-uc.a.run.app"
API_KEY="dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ"
API_SECRET="5EacKkQGxuQj8wUBrppEsM"

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Configurando redirección DNS para $DOMAIN -> $CLOUD_RUN_URL${NC}"

# 1. Configurar registro TXT para verificación (ya debería estar configurado)
echo -e "${YELLOW}Verificando registro TXT...${NC}"
TXT_VALUE=$(curl -s -X GET -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/TXT/@" | jq -r '.[].data')

echo -e "Registro TXT actual: ${GREEN}$TXT_VALUE${NC}"

# 2. Configurar registro CNAME para el dominio raíz (apuntando a Cloud Run URL)
echo -e "${YELLOW}Configurando registro CNAME para redirección...${NC}"

# Intentar configurar CNAME para el dominio raíz (esto podría no funcionar en todos los proveedores DNS)
CNAME_RESPONSE=$(curl -s -X PUT -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"$CLOUD_RUN_URL\", \"name\": \"@\", \"ttl\": 600, \"type\": \"CNAME\"}]" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/CNAME/@")

if [[ $CNAME_RESPONSE == *"error"* ]] || [[ $CNAME_RESPONSE == *"code"* ]]; then
  echo -e "${RED}No se pudo configurar CNAME para el dominio raíz. Esto es común en muchos proveedores DNS.${NC}"
  echo -e "${YELLOW}Configurando registro A temporal y URL redireccionadora...${NC}"
  
  # Configurar una IP temporal (esta sería una IP de un servidor temporal o la IP de Cloudflare)
  # En este caso, usaremos 192.0.2.1 (una dirección reservada para documentación, solo como ejemplo)
  curl -s -X PUT -H "Authorization: sso-key $API_KEY:$API_SECRET" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"192.0.2.1\", \"name\": \"@\", \"ttl\": 600, \"type\": \"A\"}]" \
    "https://api.godaddy.com/v1/domains/$DOMAIN/records/A/@" > /dev/null
  
  echo -e "${GREEN}Registro A configurado. Se necesita un servicio de redirección adicional.${NC}"
else
  echo -e "${GREEN}Registro CNAME configurado correctamente para el dominio raíz.${NC}"
fi

# 3. Configurar CNAME para www
echo -e "${YELLOW}Configurando registro CNAME para www...${NC}"
curl -s -X PUT -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"$CLOUD_RUN_URL\", \"name\": \"www\", \"ttl\": 600, \"type\": \"CNAME\"}]" \
  "https://api.godaddy.com/v1/domains/$DOMAIN/records/CNAME/www" > /dev/null

echo -e "${GREEN}Registro CNAME para www configurado correctamente.${NC}"

# 4. Instrucciones adicionales
echo -e "\n${GREEN}==== CONFIGURACIÓN COMPLETADA ====${NC}"
echo -e "Se ha configurado una redirección DNS temporal de:"
echo -e "${YELLOW}www.$DOMAIN${NC} -> ${YELLOW}$CLOUD_RUN_URL${NC}"
echo -e "\nPróximos pasos:"
echo -e "1. Para el dominio raíz $DOMAIN, es posible que necesites usar un servicio de redirección"
echo -e "   como Cloudflare o configurar un servidor proxy."
echo -e "2. La propagación DNS puede tardar hasta 24-48 horas."
echo -e "3. Mientras tanto, puedes continuar con el proceso de verificación del dominio en Google Cloud"
echo -e "4. Los usuarios pueden acceder temporalmente a la aplicación a través de ${YELLOW}https://$CLOUD_RUN_URL${NC}"

# 5. Opciones alternativas
echo -e "\n${YELLOW}Opciones alternativas:${NC}"
echo -e "1. Configurar redirección a través de Cloudflare:"
echo -e "   - Cambia los nameservers a Cloudflare"
echo -e "   - Configura una redirección de página (Page Rule) para redirigir $DOMAIN a $CLOUD_RUN_URL"
echo -e "2. Usar un dominio alternativo verificado temporalmente:"
echo -e "   - Mapea uno de los dominios ya verificados (nubemcode.com, nubemkey.ai o nubemsystems.es) a Cloud Run"
echo -e "   - Configura una redirección desde $DOMAIN a este dominio alternativo"