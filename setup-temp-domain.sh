#!/bin/bash

# Este script configura un dominio temporal verificado para acceder a NubemGenesis
# mientras se completa la verificación del dominio principal

# Variables
VERIFIED_DOMAIN="nubemcode.com"  # Dominio ya verificado
SUBDOMAIN="app"  # Subdomain para NubemGenesis
SERVICE_NAME="nubemgenesis"
REGION="us-central1"
API_KEY="dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ"
API_SECRET="5EacKkQGxuQj8wUBrppEsM"

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

TEMP_DOMAIN="${SUBDOMAIN}.${VERIFIED_DOMAIN}"

echo -e "${GREEN}Configurando dominio temporal $TEMP_DOMAIN para NubemGenesis${NC}"

# 1. Mapear el dominio verificado al servicio de Cloud Run
echo -e "${YELLOW}Mapeando $TEMP_DOMAIN al servicio $SERVICE_NAME...${NC}"
gcloud beta run domain-mappings create \
  --service=$SERVICE_NAME \
  --domain=$TEMP_DOMAIN \
  --region=$REGION \
  --platform=managed

if [ $? -ne 0 ]; then
  echo -e "${RED}Error al mapear el dominio. Verificando si el dominio está realmente verificado...${NC}"
  VERIFICATION_STATUS=$(gcloud domains list-user-verified | grep -c $VERIFIED_DOMAIN)
  
  if [ $VERIFICATION_STATUS -eq 0 ]; then
    echo -e "${RED}El dominio $VERIFIED_DOMAIN no está verificado. Por favor, verifica primero el dominio.${NC}"
    echo -e "Puedes verificar el dominio con: ${YELLOW}gcloud domains verify $VERIFIED_DOMAIN${NC}"
    exit 1
  else
    echo -e "${RED}El dominio está verificado pero no se pudo mapear. Podría haber otro problema.${NC}"
    exit 1
  fi
fi

# 2. Obtener las direcciones IP para los registros DNS
echo -e "${YELLOW}Obteniendo información de registros DNS para configuración final...${NC}"
MAPPING_INFO=$(gcloud beta run domain-mappings describe \
  --domain=$TEMP_DOMAIN \
  --region=$REGION 2>/dev/null)

# Extraer IPs para registros A
A_RECORDS=$(echo "$MAPPING_INFO" | grep -o 'rrdata: [0-9.]*' | awk '{print $2}')

if [ -z "$A_RECORDS" ]; then
  echo -e "${RED}No se pudieron obtener las IPs para los registros A${NC}"
  exit 1
fi

# 3. Configurar los registros DNS
echo -e "${YELLOW}Configurando registros DNS en GoDaddy...${NC}"

# Construir JSON para registros A
A_RECORDS_JSON="["
for ip in $A_RECORDS; do
  A_RECORDS_JSON+="{\"data\": \"$ip\", \"name\": \"$SUBDOMAIN\", \"ttl\": 600, \"type\": \"A\"},"
done
A_RECORDS_JSON=${A_RECORDS_JSON%,}  # Eliminar la última coma
A_RECORDS_JSON+="]"

# Configurar registros A
echo -e "${YELLOW}Configurando registros A para $SUBDOMAIN.$VERIFIED_DOMAIN...${NC}"
DNS_RESPONSE=$(curl -s -X PUT \
  -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "$A_RECORDS_JSON" \
  "https://api.godaddy.com/v1/domains/$VERIFIED_DOMAIN/records/A/$SUBDOMAIN")

if [[ -n "$DNS_RESPONSE" ]]; then
  echo -e "${RED}Error al configurar los registros DNS: $DNS_RESPONSE${NC}"
  echo -e "${YELLOW}Es posible que necesites configurar los registros manualmente en el panel de control de GoDaddy.${NC}"
else
  echo -e "${GREEN}Registros DNS configurados correctamente${NC}"
fi

# 4. Configurar redirección desde dominio principal
echo -e "${YELLOW}Configurando redirección desde nubemgenesis.ai a $TEMP_DOMAIN...${NC}"

# Primero, asegurémonos de que el registro TXT de verificación sigue configurado
curl -s -X GET -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/TXT/@" > /dev/null

# Configurar URL de redirección mediante HTTP Redirect
REDIRECT_RESPONSE=$(curl -s -X PUT -H "Authorization: sso-key $API_KEY:$API_SECRET" \
  -H "Content-Type: application/json" \
  -d "[{\"data\": \"https://$TEMP_DOMAIN\", \"name\": \"@\", \"ttl\": 600, \"type\": \"REDIRECT_301\"}]" \
  "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/REDIRECT_301/@")

if [[ "$REDIRECT_RESPONSE" == *"code"* ]]; then
  echo -e "${YELLOW}No se pudo configurar la redirección automática. Esto es común en algunos proveedores DNS.${NC}"
  echo -e "${YELLOW}Configurando registro A para una landing page simple...${NC}"
  
  # Alternativa: Configurar una IP para hosting temporal con página de redirección
  # Usamos 192.168.100 como ejemplo (deberías usar una IP real de un servidor)
  curl -s -X PUT -H "Authorization: sso-key $API_KEY:$API_SECRET" \
    -H "Content-Type: application/json" \
    -d "[{\"data\": \"192.0.2.1\", \"name\": \"@\", \"ttl\": 600, \"type\": \"A\"}]" \
    "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/A/@" > /dev/null
  
  echo -e "${YELLOW}Configurado registro A temporal. Se necesitaría un servidor para la redirección.${NC}"
else
  echo -e "${GREEN}Redirección configurada correctamente${NC}"
fi

# 5. Instrucciones finales
echo -e "\n${GREEN}==== CONFIGURACIÓN COMPLETADA ====${NC}"
echo -e "Se ha configurado un dominio temporal para NubemGenesis:"
echo -e "${YELLOW}https://$TEMP_DOMAIN${NC}"
echo -e "\nPróximos pasos:"
echo -e "1. La propagación DNS puede tardar hasta 24-48 horas, pero generalmente es más rápida."
echo -e "2. Una vez que los DNS se propaguen, podrás acceder a la aplicación en:"
echo -e "   ${YELLOW}https://$TEMP_DOMAIN${NC}"
echo -e "3. Mientras tanto, puedes continuar con el proceso de verificación del dominio principal"
echo -e "   en Google Cloud (nubemgenesis.ai)."
echo -e "4. Los usuarios también pueden seguir accediendo a la aplicación a través de:"
echo -e "   ${YELLOW}https://nubemgenesis-zqvgtbn4ya-uc.a.run.app${NC}"

# Resumir la configuración de registros A
echo -e "\n${YELLOW}Registros A configurados para $SUBDOMAIN.$VERIFIED_DOMAIN:${NC}"
for ip in $A_RECORDS; do
  echo -e "${GREEN}$ip${NC}"
done

echo -e "\n${YELLOW}IMPORTANTE:${NC} Una vez que el dominio principal (nubemgenesis.ai) esté"
echo -e "verificado y configurado, puedes eliminar esta configuración temporal con:"
echo -e "${YELLOW}gcloud beta run domain-mappings delete --domain=$TEMP_DOMAIN --region=$REGION${NC}"