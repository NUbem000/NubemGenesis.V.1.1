# Finalización de la Configuración del Dominio

## Estado Actual
✅ **Nameservers configurados**: Los nameservers del dominio nubemgenesis.ai están correctamente configurados a GoDaddy (ns59.domaincontrol.com y ns60.domaincontrol.com).
✅ **Registro TXT creado**: Se ha configurado el registro TXT con el código de verificación: `google-site-verification=KodRPxW_gWDDr6cJm3MtGVCLHxVdO6sjMw5qfqMw5t4`.

## Próximos Pasos

### 1. Completar Verificación en Google Search Console
Este paso debe realizarse manualmente accediendo a la consola de Google Search:
1. Visita https://search.google.com/search-console/welcome
2. Selecciona la opción "Prefijo de URL" o "Dominio"
3. Ingresa nubemgenesis.ai
4. Selecciona el método de verificación TXT
5. Confirma que ya se ha añadido el registro TXT
6. Haz clic en "Verificar"

### 2. Mapear el Dominio a Cloud Run
Una vez verificado el dominio, ejecuta:
```bash
gcloud beta run domain-mappings create --service=nubemgenesis --domain=nubemgenesis.ai --region=us-central1 --platform=managed
```

### 3. Obtener y Configurar Registros DNS Finales
Después del mapeo, obtén las IPs necesarias:
```bash
gcloud beta run domain-mappings describe --domain=nubemgenesis.ai --region=us-central1
```

Configura los registros A con las IPs proporcionadas:
```bash
# Ajusta las IPs según la respuesta del comando anterior
curl -X PUT -H "Authorization: sso-key dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ:5EacKkQGxuQj8wUBrppEsM" -H "Content-Type: application/json" -d '[{"data":"IP1","name":"@","ttl":600,"type":"A"},{"data":"IP2","name":"@","ttl":600,"type":"A"}]' "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/A/@"
```

Configura el registro CNAME para www:
```bash
curl -X PUT -H "Authorization: sso-key dKNvqiTnsdzP_KvunntxzWPNx7MM3rd6WdQ:5EacKkQGxuQj8wUBrppEsM" -H "Content-Type: application/json" -d '[{"data":"nubemgenesis.ai.","name":"www","ttl":600,"type":"CNAME"}]' "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/CNAME/www"
```

### 4. Verificar la Configuración
Espera a que se propague la configuración DNS (normalmente entre 15 minutos y 24 horas) y luego verifica:
```bash
# Verificar mapeo de dominio
gcloud beta run domain-mappings describe --domain=nubemgenesis.ai --region=us-central1

# Probar acceso al dominio
curl -k https://nubemgenesis.ai
curl -k https://www.nubemgenesis.ai
```

## Consideraciones Adicionales

### Configuración SSL
Cloud Run gestiona automáticamente los certificados SSL para dominios personalizados mapeados. No es necesario configurar certificados manualmente.

### Monitoreo
Una vez configurado, monitorea el acceso al dominio y cualquier error mediante:
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=nubemgenesis AND severity>=WARNING" --limit=10
```

### Resolución de Problemas
Si hay problemas con el mapeo del dominio:
1. Verifica que los registros DNS estén correctamente configurados en GoDaddy
2. Comprueba si hay errores en los logs de Cloud Run
3. Verifica que el dominio aparezca como verificado en Google Cloud Platform

## Documentación de Referencia
- [Mapeo de dominios personalizados en Cloud Run](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Verificación de dominios en Google Cloud](https://cloud.google.com/run/docs/mapping-custom-domains#verify-domain)
- [Configuración de registros DNS](https://cloud.google.com/run/docs/mapping-custom-domains#dns-setup)