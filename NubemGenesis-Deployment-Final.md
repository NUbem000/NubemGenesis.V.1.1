# Despliegue Exitoso de NubemGenesis V1.1 en GCP

## Estado del Despliegue

✅ **Servicio desplegado y funcionando**: El servicio NubemGenesis V1.1 ha sido desplegado exitosamente en Google Cloud Platform y está accesible a través de la URL proporcionada por Cloud Run.

## Acceso al Servicio

- **URL del servicio**: https://nubemgenesis-zqvgtbn4ya-uc.a.run.app
- **Credenciales**:
  - Usuario: `admin`
  - Contraseña: `NubemAdmin2025\!`

## Infraestructura Configurada

- **Proyecto GCP**: nubemgenesis-v1-1
- **Región**: us-central1
- **Base de datos**: PostgreSQL en Cloud SQL (instancia: nubemgenesis-db)
- **Caché**: Redis en Memorystore (instancia: nubemgenesis-redis)
- **Almacenamiento**: Cloud Storage (bucket: nubemgenesis-storage)
- **Servicio**: Cloud Run (servicio: nubemgenesis)
- **Recursos**: 4GB RAM, 2 CPUs, escalado automático (mín. 1 instancia)
- **Secretos**: Todos los secretos configurados en Secret Manager

## Instrucciones para el Dominio Personalizado

Para mapear el dominio personalizado nubemgenesis.ai a su servicio en Cloud Run, siga estos pasos:

1. **Verificar el dominio en Google Cloud**:
   ```bash
   gcloud domains verify nubemgenesis.ai
   ```
   Google abrirá una página web donde deberá seguir las instrucciones para verificar la propiedad del dominio.

2. **Agregar el registro TXT para verificación**:
   - Acceda al panel de administración DNS de su dominio
   - Agregue un registro TXT con nombre "@" (o dominio raíz)
   - El valor será proporcionado por Google (formato: "google-site-verification=XXXXX")

3. **Después de verificar el dominio, mapee al servicio**:
   ```bash
   gcloud beta run domain-mappings create --service=nubemgenesis --domain=nubemgenesis.ai --region=us-central1
   ```

4. **Configure los registros DNS finales**:
   ```bash
   gcloud beta run domain-mappings describe --domain=nubemgenesis.ai --region=us-central1
   ```
   Aparecerán instrucciones para configurar registros A y/o CNAME en su proveedor DNS.

## Mejoras Futuras y Mantenimiento

### Actualización del Servicio

Para actualizar el servicio con nuevas versiones de código:

1. **Construir nueva imagen**:
   ```bash
   cd /ruta/a/NubemGenesis.V.1.1
   docker build -t us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/app:v1.x .
   docker push us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/app:v1.x
   ```

2. **Actualizar el servicio**:
   ```bash
   gcloud run services update nubemgenesis \
     --image us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/app:v1.x \
     --region us-central1
   ```

### Automatización de Despliegue

Considere configurar un pipeline CI/CD para automatizar futuros despliegues:

1. Configure un trigger de Cloud Build para su repositorio en GitHub
2. Cree una configuración cloudbuild.yaml para automatizar el proceso
3. Integre pruebas automatizadas antes del despliegue

### Monitoreo y Alertas

Configure el monitoreo y alertas para mantener un servicio saludable:

1. Utilice Cloud Monitoring para crear paneles de control
2. Configure alertas para métricas clave como latencia, errores y uso de recursos
3. Implemente logging estructurado para facilitar el diagnóstico de problemas

## APIs y Servicios Configurados

NubemGenesis V1.1 está configurado para utilizar las siguientes APIs y servicios:

- OpenAI API
- Google AI (Gemini)
- Anthropic Claude
- MistralAI
- DeepSeek

Todas las claves API están almacenadas de forma segura en Secret Manager y están disponibles para el servicio.

## Conclusión

El despliegue de NubemGenesis V1.1 en Google Cloud Platform ha sido completado con éxito. El servicio está operativo y accesible a través de la URL proporcionada por Cloud Run. Para cualquier consulta o soporte adicional, puede contactar con el equipo de NubemGenesis.
## Actualización sobre el Dominio

### Estado Actual (15 de Mayo, 2025)

✅ **Nameservers actualizados**: Los nameservers de nubemgenesis.ai han sido cambiados a los de GoDaddy (ns59.domaincontrol.com y ns60.domaincontrol.com).

✅ **Registro TXT preparado**: Se ha creado un registro TXT para la verificación de Google (actualmente con un código provisional).

✅ **API accesible**: La configuración DNS ahora es accesible a través de la API de GoDaddy.

### Pasos para Completar la Verificación y Mapeo

Se ha preparado un script automatizado para facilitar el proceso:

```bash
chmod +x /root/NubemGenesis.V.1.1/verify_domain.sh
/root/NubemGenesis.V.1.1/verify_domain.sh
```

Este script guiará paso a paso por el proceso de:
1. Verificar que los nameservers están correctamente configurados
2. Configurar el registro TXT de verificación en GoDaddy
3. Verificar el dominio en Google Cloud
4. Mapear el dominio al servicio de Cloud Run
5. Configurar los registros DNS finales (A y CNAME)

Si prefieres realizar el proceso manualmente, sigue estos pasos:

1. **Verificar el dominio en Google Cloud**:
   ```bash
   gcloud domains verify nubemgenesis.ai
   ```
   Esto abrirá una página web donde deberás obtener el código de verificación.

2. **Configurar el registro TXT en GoDaddy**:
   ```bash
   VERIFICATION_CODE="google-site-verification=CÓDIGO_OBTENIDO"
   curl -X PUT -H "Authorization: sso-key GODADDY_API_KEY:GODADDY_API_SECRET" \
     -H "Content-Type: application/json" \
     -d "[{\"data\": \"$VERIFICATION_CODE\", \"name\": \"@\", \"ttl\": 600, \"type\": \"TXT\"}]" \
     "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/TXT/@"
   ```

3. **Mapear el dominio verificado**:
   ```bash
   gcloud beta run domain-mappings create --service=nubemgenesis --domain=nubemgenesis.ai --region=us-central1
   ```

4. **Configurar los registros DNS finales**:
   ```bash
   # Obtener las IPs para los registros A
   gcloud beta run domain-mappings describe --domain=nubemgenesis.ai --region=us-central1
   
   # Configurar los registros A con las IPs obtenidas
   curl -X PUT -H "Authorization: sso-key GODADDY_API_KEY:GODADDY_API_SECRET" \
     -H "Content-Type: application/json" \
     -d "[{\"data\": \"IP1\", \"name\": \"@\", \"ttl\": 600, \"type\": \"A\"},{\"data\": \"IP2\", \"name\": \"@\", \"ttl\": 600, \"type\": \"A\"}]" \
     "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/A/@"
   
   # Configurar el CNAME para www
   curl -X PUT -H "Authorization: sso-key GODADDY_API_KEY:GODADDY_API_SECRET" \
     -H "Content-Type: application/json" \
     -d "[{\"data\": \"nubemgenesis.ai.\", \"name\": \"www\", \"ttl\": 600, \"type\": \"CNAME\"}]" \
     "https://api.godaddy.com/v1/domains/nubemgenesis.ai/records/CNAME/www"
   ```

### Documentación Adicional

Se ha creado documentación detallada en:
- `/root/NubemGenesis.V.1.1/verificacion_dominio_actualizada.md`: Instrucciones paso a paso con mayor detalle
- `/root/NubemGenesis.V.1.1/manual_verification.md`: Guía para verificación manual

La propagación DNS completa puede tardar hasta 24-48 horas, aunque generalmente es más rápida. Una vez finalizada, la aplicación estará accesible en:
- https://nubemgenesis.ai
- https://www.nubemgenesis.ai