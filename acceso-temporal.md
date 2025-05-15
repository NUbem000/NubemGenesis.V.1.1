# Configuración de Acceso Temporal para NubemGenesis

## Opciones para acceso inmediato mientras se completa la verificación del dominio

### 1. Usar un Subdominio de un Dominio Ya Verificado (Recomendado)

Esta opción permite acceder a la aplicación a través de un subdominio de un dominio que ya está verificado en Google Cloud.

```bash
# Ejecutar script de configuración
chmod +x /root/NubemGenesis.V.1.1/setup-temp-domain.sh
/root/NubemGenesis.V.1.1/setup-temp-domain.sh
```

Este script:
- Mapea app.nubemcode.com al servicio de Cloud Run
- Configura los registros DNS necesarios en GoDaddy
- Proporciona acceso inmediato a la aplicación

**URL temporal de acceso:** https://app.nubemcode.com

### 2. Configurar un Servidor Proxy

Esta opción configura un servidor Nginx como proxy inverso para redirigir las solicitudes al servicio de Cloud Run.

```bash
# Ejecutar script de configuración (requiere un servidor)
chmod +x /root/NubemGenesis.V.1.1/setup-temp-proxy.sh
sudo /root/NubemGenesis.V.1.1/setup-temp-proxy.sh
```

Este script:
- Instala Nginx y Certbot en el servidor
- Configura un proxy inverso que redirige a Cloud Run
- Obtiene certificados SSL para el dominio

**Requisitos:**
- Un servidor con IP pública
- Los registros DNS del dominio deben apuntar a este servidor

### 3. Configurar Redirección a Nivel DNS

Esta opción configura una redirección a nivel DNS desde nubemgenesis.ai al servicio de Cloud Run.

```bash
# Ejecutar script de configuración
chmod +x /root/NubemGenesis.V.1.1/cloudflare-dns-setup.sh
/root/NubemGenesis.V.1.1/cloudflare-dns-setup.sh
```

Este script:
- Configura registros CNAME para www.nubemgenesis.ai
- Intenta configurar una redirección para el dominio raíz
- Proporciona instrucciones para configuración adicional si es necesario

**Limitaciones:**
- La redirección del dominio raíz puede no funcionar con todos los proveedores DNS
- Es posible que se necesite un servicio como Cloudflare para redirecciones avanzadas

### 4. Usar Directamente la URL de Cloud Run (Más Simple)

La opción más simple es utilizar directamente la URL proporcionada por Cloud Run mientras se completa la verificación.

**URL actual de Cloud Run:** https://nubemgenesis-zqvgtbn4ya-uc.a.run.app

Puedes proporcionar esta URL a los usuarios para acceso inmediato, sin necesidad de configuración adicional.

## Notas Importantes

1. Cualquiera de estas opciones de acceso temporal es compatible con el proceso de verificación del dominio principal.
2. Una vez que el dominio principal esté verificado y configurado, puedes eliminar la configuración temporal.
3. La propagación DNS puede tardar hasta 24-48 horas en completarse.
4. Las credenciales de acceso a la aplicación son las mismas independientemente de la URL:
   - Usuario: `admin`
   - Contraseña: `NubemAdmin2025!`