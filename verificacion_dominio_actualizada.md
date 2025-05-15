# Verificación del Dominio nubemgenesis.ai (Actualizada)

## Estado Actual
✅ **Configuración DNS disponible**: Los nameservers de nubemgenesis.ai han sido actualizados a los servidores de GoDaddy (ns59.domaincontrol.com y ns60.domaincontrol.com).
✅ **Registro TXT preparado**: Se ha creado un registro TXT para la verificación de Google (actualmente con un código placeholder).

## Pasos para Completar la Verificación

### 1. Obtener el Código de Verificación de Google
1. Accede a: https://search.google.com/search-console/welcome
2. Ingresa nubemgenesis.ai como prefijo de dominio
3. Google te proporcionará un código de verificación en formato "google-site-verification=XXXXX"
4. Copia este código

### 2. Actualizar el Registro TXT en GoDaddy
Puedes hacerlo de dos formas:

**Opción A: A través del Panel de Control de GoDaddy**
1. Accede al panel de control de GoDaddy
2. Ve a Mis Dominios > nubemgenesis.ai > DNS
3. Encuentra el registro TXT existente (con valor "google-site-verification=PLACEHOLDER_CODE")
4. Edítalo y reemplaza PLACEHOLDER_CODE con el código real proporcionado por Google
5. Guarda los cambios

**Opción B: A través de la API (Recomendado)**
Ejecuta el siguiente comando, reemplazando CODIGO_REAL por el código proporcionado por Google:

```bash
curl -X PUT -H "Authorization: sso-key dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ:5EacKkQGxuQj8wUBrppEsM" -H "Content-Type: application/json" -d '[{"data":"google-site-verification=CODIGO_REAL","name":"@","ttl":600,"type":"TXT"}]' "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/TXT/@"
```

### 3. Completar la Verificación en Google
1. Regresa a la página de verificación de Google
2. Haz clic en "Verificar"
3. Google verificará la presencia del registro TXT (puede tardar unos minutos)

### 4. Mapear el Dominio a Cloud Run
Una vez verificado el dominio, ejecuta:
```bash
gcloud beta run domain-mappings create --service=nubemgenesis --domain=nubemgenesis.ai --region=us-central1
```

### 5. Configurar los Registros DNS Finales
Google te proporcionará las direcciones IP necesarias para configurar los registros A:
```bash
gcloud beta run domain-mappings describe --domain=nubemgenesis.ai --region=us-central1
```

A continuación, actualiza los registros DNS:
```bash
# Suponiendo que las IPs proporcionadas por Google son 123.123.123.1 y 123.123.123.2
curl -X PUT -H "Authorization: sso-key dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ:5EacKkQGxuQj8wUBrppEsM" -H "Content-Type: application/json" -d '[{"data":"123.123.123.1","name":"@","ttl":600,"type":"A"},{"data":"123.123.123.2","name":"@","ttl":600,"type":"A"}]' "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/A/@"

# Actualizar el CNAME para www
curl -X PUT -H "Authorization: sso-key dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ:5EacKkQGxuQj8wUBrppEsM" -H "Content-Type: application/json" -d '[{"data":"nubemgenesis.ai.","name":"www","ttl":600,"type":"CNAME"}]' "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/CNAME/www"
```

## Verificación Final
Una vez completados todos los pasos y después de que los registros DNS se propaguen (puede tardar hasta 24 horas), podrás acceder a tu aplicación en:
- https://nubemgenesis.ai
- https://www.nubemgenesis.ai

## Scripts Adicionales
Para facilitar el proceso, hemos preparado scripts que automatizan estos pasos:
- `/root/NubemGenesis.V.1.1/verify_domain.sh`: Para la verificación del dominio
- `/root/NubemGenesis.V.1.1/domain-setup.sh`: Para la configuración de DNS después de la verificación

---

**Nota:** Las credenciales de la API de GoDaddy están almacenadas de forma segura en Secret Manager. Si necesitas cambiarlas, actualiza los secretos GODADDY_API_KEY y GODADDY_API_SECRET.