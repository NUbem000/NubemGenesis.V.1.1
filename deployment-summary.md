# Resumen del Despliegue de NubemGenesis.V.1.1

## Infraestructura creada en GCP

- **Proyecto:** nubemgenesis-v1-1
- **Base de datos:** PostgreSQL en Cloud SQL (instancia: nubemgenesis-db)
- **Cache:** Redis en Memorystore (instancia: nubemgenesis-redis)
- **Almacenamiento:** Cloud Storage (bucket: nubemgenesis-storage)
- **Servicio:** Cloud Run (servicio: nubemgenesis)
- **URL del servicio:** https://nubemgenesis-zqvgtbn4ya-uc.a.run.app

## Secretos configurados en Secret Manager

- ANTHROPIC_API_KEY
- CLOUDBUILD_CONFIG
- CORS_ORIGINS
- DATABASE_HOST
- DATABASE_NAME
- DATABASE_PASSWORD
- DATABASE_PORT
- DATABASE_SSL
- DATABASE_TYPE
- DATABASE_USER
- DEEPSEEK_API_KEY
- DEPLOY_SCRIPT
- DOMAIN_NAME
- DOMAIN_SETUP_SCRIPT
- FLOWISE_FILE_SIZE_LIMIT
- FLOWISE_PASSWORD
- FLOWISE_SECRETKEY_OVERWRITE
- FLOWISE_USERNAME
- GODADDY_API_KEY
- GODADDY_API_SECRET
- GOOGLE_API_KEY
- IFRAME_ORIGINS
- JWT_SECRET
- LOG_LEVEL
- MISTRAL_API_KEY
- OPENAI_API_KEY
- PORT
- REDIS_HOST
- REDIS_PASSWORD
- REDIS_PORT
- REDIS_TLS
- REDIS_USERNAME
- SERVICE_ACCOUNT_KEY
- STORAGE_BUCKET

## Estado actual del despliegue

Se ha creado un servicio básico de Cloud Run con una imagen de prueba. El servicio está funcionando correctamente, lo que demuestra que la infraestructura está configurada adecuadamente.

## Próximos pasos para completar el despliegue personalizado

1. **Construir la imagen personalizada:**
   ```bash
   # Crear repositorio en Artifact Registry
   gcloud artifacts repositories create nubemgenesis --repository-format=docker --location=us-central1

   # Construir la imagen
   cd /root/NubemGenesis.V.1.1
   gcloud builds submit --tag us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/app:latest
   ```

2. **Actualizar el servicio de Cloud Run:**
   ```bash
   gcloud run services update nubemgenesis \
     --image us-central1-docker.pkg.dev/nubemgenesis-v1-1/nubemgenesis/app:latest \
     --region us-central1 \
     --platform managed \
     --set-secrets DATABASE_TYPE=DATABASE_TYPE:latest,DATABASE_HOST=DATABASE_HOST:latest,DATABASE_PORT=DATABASE_PORT:latest,DATABASE_NAME=DATABASE_NAME:latest,DATABASE_USER=DATABASE_USER:latest,DATABASE_PASSWORD=DATABASE_PASSWORD:latest,DATABASE_SSL=DATABASE_SSL:latest,REDIS_HOST=REDIS_HOST:latest,REDIS_PORT=REDIS_PORT:latest,REDIS_USERNAME=REDIS_USERNAME:latest,REDIS_PASSWORD=REDIS_PASSWORD:latest,REDIS_TLS=REDIS_TLS:latest,FLOWISE_USERNAME=FLOWISE_USERNAME:latest,FLOWISE_PASSWORD=FLOWISE_PASSWORD:latest,FLOWISE_SECRETKEY_OVERWRITE=FLOWISE_SECRETKEY_OVERWRITE:latest,JWT_SECRET=JWT_SECRET:latest,LOG_LEVEL=LOG_LEVEL:latest,OPENAI_API_KEY=OPENAI_API_KEY:latest,GOOGLE_API_KEY=GOOGLE_API_KEY:latest,ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,MISTRAL_API_KEY=MISTRAL_API_KEY:latest,DEEPSEEK_API_KEY=DEEPSEEK_API_KEY:latest,CORS_ORIGINS=CORS_ORIGINS:latest,IFRAME_ORIGINS=IFRAME_ORIGINS:latest,FLOWISE_FILE_SIZE_LIMIT=FLOWISE_FILE_SIZE_LIMIT:latest \
     --add-cloudsql-instances nubemgenesis-v1-1:us-central1:nubemgenesis-db
   ```

3. **Configurar dominio personalizado:**
   ```bash
   # Primero es necesario registrar el dominio nubemgenesis.ai en GoDaddy
   # Luego ejecutar el script de configuración de dominio
   gcloud secrets versions access latest --secret=DOMAIN_SETUP_SCRIPT > domain-setup.sh
   chmod +x domain-setup.sh
   ./domain-setup.sh
   ```

## Configuración de CI/CD futura

Para automatizar el despliegue continuo:
1. Configurar un trigger de Cloud Build para el repositorio GitHub
2. Crear una configuración CI/CD que construya y despliegue automáticamente
3. Integrar pruebas automatizadas en el flujo de CI/CD

## Recursos creados

- Base de datos PostgreSQL
- Instancia de Redis
- Cuenta de servicio con permisos necesarios
- Bucket de Storage
- Secretos en Secret Manager
- Servicio de Cloud Run

## Acceso al servicio

La aplicación estará disponible en:
- URL de Cloud Run: https://nubemgenesis-zqvgtbn4ya-uc.a.run.app
- Dominio personalizado (futuro): https://nubemgenesis.ai

## Nota sobre el dominio personalizado

El dominio personalizado nubemgenesis.ai necesita ser registrado en GoDaddy antes de poder configurarlo para el servicio de Cloud Run.
