#!/bin/bash

# Script para configurar un proxy temporal para NubemGenesis mientras
# se completa la verificación del dominio en Google Cloud

# Variables
DOMAIN="nubemgenesis.ai"
CLOUD_RUN_URL="https://nubemgenesis-zqvgtbn4ya-uc.a.run.app"
EMAIL="admin@nubemsystems.es"  # Cambiar por un email válido

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Configurando proxy temporal para $DOMAIN -> $CLOUD_RUN_URL${NC}"

# Verificar si se ejecuta como root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Este script debe ejecutarse como root (usar sudo)${NC}"
  exit 1
fi

# Instalar Nginx y Certbot
echo -e "${YELLOW}Instalando Nginx y Certbot...${NC}"
apt update
apt install -y nginx certbot python3-certbot-nginx

# Verificar si la instalación fue exitosa
if ! command -v nginx &> /dev/null || ! command -v certbot &> /dev/null; then
  echo -e "${RED}Error: No se pudo instalar Nginx o Certbot${NC}"
  exit 1
fi

# Crear directorio para la configuración de Nginx
mkdir -p /etc/nginx/sites-available/
mkdir -p /etc/nginx/sites-enabled/

# Copiar la configuración de Nginx
echo -e "${YELLOW}Configurando Nginx como proxy inverso...${NC}"
cp /root/NubemGenesis.V.1.1/nginx-proxy-config.conf /etc/nginx/sites-available/$DOMAIN.conf

# Crear enlace simbólico
ln -sf /etc/nginx/sites-available/$DOMAIN.conf /etc/nginx/sites-enabled/

# Verificar la configuración de Nginx
nginx -t

if [ $? -ne 0 ]; then
  echo -e "${RED}Error en la configuración de Nginx. Por favor, verifica el archivo de configuración.${NC}"
  exit 1
fi

# Obtener certificado SSL con Certbot
echo -e "${YELLOW}Obteniendo certificado SSL con Certbot...${NC}"
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL

if [ $? -ne 0 ]; then
  echo -e "${RED}Error al obtener el certificado SSL. Verifica que el dominio apunta a este servidor.${NC}"
  echo -e "${YELLOW}Configurando Nginx sin SSL por ahora...${NC}"
  
  # Crear configuración alternativa sin SSL
  cat > /etc/nginx/sites-available/$DOMAIN.conf << EOL
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass $CLOUD_RUN_URL;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    access_log /var/log/nginx/nubemgenesis.ai.access.log;
    error_log /var/log/nginx/nubemgenesis.ai.error.log;
}
EOL

  # Recargar configuración
  nginx -t && systemctl reload nginx
fi

# Reiniciar Nginx
echo -e "${YELLOW}Reiniciando Nginx...${NC}"
systemctl restart nginx

# Verificar que Nginx está funcionando
if systemctl is-active --quiet nginx; then
  echo -e "${GREEN}Nginx está funcionando correctamente${NC}"
else
  echo -e "${RED}Error: Nginx no está funcionando${NC}"
  exit 1
fi

# Instrucciones finales
echo -e "\n${GREEN}==== CONFIGURACIÓN COMPLETADA ====${NC}"
echo -e "El proxy temporal ha sido configurado para redirigir el tráfico de:"
echo -e "${YELLOW}$DOMAIN${NC} y ${YELLOW}www.$DOMAIN${NC} -> ${YELLOW}$CLOUD_RUN_URL${NC}"
echo -e "\nPróximos pasos:"
echo -e "1. Asegúrate de que los registros DNS de $DOMAIN y www.$DOMAIN apunten a la IP de este servidor"
echo -e "   Puedes usar el siguiente comando para ver la IP pública de este servidor:"
echo -e "   ${YELLOW}curl -4 icanhazip.com${NC}"
echo -e "2. Configura los siguientes registros DNS en GoDaddy:"
echo -e "   - Registro A para @ (dominio raíz) apuntando a la IP de este servidor"
echo -e "   - Registro A para www apuntando a la IP de este servidor"
echo -e "3. Una vez que los registros DNS se propaguen, podrás acceder a tu aplicación en:"
echo -e "   ${YELLOW}http://$DOMAIN${NC} y ${YELLOW}http://www.$DOMAIN${NC}"
echo -e "4. Mientras tanto, puedes continuar con el proceso de verificación del dominio en Google Cloud"

# Mostrar IP pública
echo -e "\nIP pública de este servidor:"
PUBLIC_IP=$(curl -s -4 icanhazip.com)
echo -e "${GREEN}$PUBLIC_IP${NC}"

# Instrucciones para configurar registros DNS
echo -e "\nComandos para configurar los registros DNS en GoDaddy:"
echo -e "${YELLOW}curl -X PUT -H \"Authorization: sso-key dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ:5EacKkQGxuQj8wUBrppEsM\" -H \"Content-Type: application/json\" -d '[{\"data\":\"$PUBLIC_IP\",\"name\":\"@\",\"ttl\":600,\"type\":\"A\"}]' \"https://api.godaddy.com/v1/domains/$DOMAIN/records/A/@\"${NC}"
echo -e "${YELLOW}curl -X PUT -H \"Authorization: sso-key dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ:5EacKkQGxuQj8wUBrppEsM\" -H \"Content-Type: application/json\" -d '[{\"data\":\"$PUBLIC_IP\",\"name\":\"www\",\"ttl\":600,\"type\":\"A\"}]' \"https://api.godaddy.com/v1/domains/$DOMAIN/records/A/www\"${NC}"