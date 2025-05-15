# Despliegue de NubemGenesis en Google Cloud Platform

## Estado del despliegue

- **Servicio desplegado**: Sí ✅
- **URL del servicio**: https://nubemgenesis-394068846550.us-central1.run.app
- **Dominio personalizado**: En proceso ⚠️

## Infraestructura en GCP

- **Proyecto**: nubemgenesis-v1-1
- **Base de datos**: PostgreSQL en Cloud SQL (instancia: nubemgenesis-db)
- **Cache**: Redis en Memorystore (instancia: nubemgenesis-redis)
- **Almacenamiento**: Cloud Storage (bucket: nubemgenesis-storage)
- **Servicio**: Cloud Run (nombre: nubemgenesis)

## Recursos configurados

- Cuenta de servicio con permisos necesarios
- Todos los secretos configurados en Secret Manager
- Servicio Cloud Run configurado con 4GB de RAM y 2 CPUs
- Servicio conectado a Cloud SQL

## Acceso al servicio

El servicio NubemGenesis está disponible en la siguiente URL:
https://nubemgenesis-394068846550.us-central1.run.app

Para acceder, utilice las siguientes credenciales:
- **Usuario**: admin (configurado en Secret Manager como FLOWISE_USERNAME)
- **Contraseña**: NubemAdmin2025\! (configurado en Secret Manager como FLOWISE_PASSWORD)

## Pasos pendientes

### Verificación del dominio

Para completar la configuración del dominio personalizado nubemgenesis.ai, es necesario:

1. Verificar la propiedad del dominio en Google Cloud.
   ```bash
   gcloud domains verify nubemgenesis.ai
   ```

2. Seguir las instrucciones que aparecen para agregar un registro TXT en el DNS del dominio.

3. Una vez verificado, mapear el dominio al servicio:
   ```bash
   gcloud beta run domain-mappings create --service=nubemgenesis --domain=nubemgenesis.ai --region=us-central1
   ```

4. Configurar los registros DNS (A y CNAME) según las instrucciones que proporciona Google Cloud.

### Despliegue de imágenes personalizadas (opcional)

Si en el futuro desea desplegar una imagen personalizada de NubemGenesis, siga estos pasos:

1. Construir la imagen con Docker:
   ```bash
   cd /root/NubemGenesis.V.1.1/
   docker build -t us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/app:latest .
   ```

2. Subir la imagen a Artifact Registry:
   ```bash
   docker push us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/app:latest
   ```

3. Actualizar el servicio:
   ```bash
   gcloud run services update nubemgenesis --image=us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/app:latest --region=us-central1
   ```

## Mantenimiento

Para mantener el servicio actualizado:

1. Actualizar los secretos según sea necesario:
   ```bash
   gcloud secrets versions add NOMBRE_DEL_SECRETO --data-file=archivo_con_valor
   ```

2. Monitoreizar el uso de recursos en Google Cloud Console.

3. Configurar alertas para problemas de rendimiento o disponibilidad.
