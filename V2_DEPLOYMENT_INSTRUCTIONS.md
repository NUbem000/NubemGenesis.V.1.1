# 📋 Instrucciones para Completar el Deployment de V2

## 🎯 Estado Actual

### ✅ Completado
1. **Código V2 desarrollado** y funcionando
2. **GitHub actualizado** con todos los cambios
3. **Variables de entorno** configuradas en Cloud Run
4. **Servicio base** funcionando en: https://nubemgenesis-394068846550.us-central1.run.app

### ⏳ Pendiente
- Actualizar el código desplegado para incluir las nuevas rutas V2

## 🚀 Opciones para Completar el Deployment

### Opción 1: Build Local + Deploy (Más Control)

```bash
# 1. En tu máquina local con Docker instalado
git clone https://github.com/NUbem000/NubemGenesis.V.1.1.git
cd NubemGenesis.V.1.1

# 2. Construir imagen localmente
docker build -t gcr.io/nubemgenesis-v1-1/nubemgenesis:v2 .

# 3. Autenticar Docker con GCR
gcloud auth configure-docker

# 4. Push a Container Registry
docker push gcr.io/nubemgenesis-v1-1/nubemgenesis:v2

# 5. Actualizar Cloud Run
gcloud run deploy nubemgenesis \
  --image gcr.io/nubemgenesis-v1-1/nubemgenesis:v2 \
  --region us-central1 \
  --project nubemgenesis-v1-1
```

### Opción 2: Usar Cloud Shell (Sin Docker Local)

```bash
# 1. Abrir Cloud Shell en GCP Console
# https://console.cloud.google.com/cloudshell

# 2. Clonar repositorio
git clone https://github.com/NUbem000/NubemGenesis.V.1.1.git
cd NubemGenesis.V.1.1

# 3. Build y deploy directo
gcloud run deploy nubemgenesis \
  --source . \
  --region us-central1 \
  --project nubemgenesis-v1-1
```

### Opción 3: CI/CD con Cloud Build (Automatizado)

```bash
# 1. En el repositorio, crear .cloudbuild/deploy.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/nubemgenesis:$COMMIT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/nubemgenesis:$COMMIT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'nubemgenesis'
      - '--image'
      - 'gcr.io/$PROJECT_ID/nubemgenesis:$COMMIT_SHA'
      - '--region'
      - 'us-central1'

# 2. Configurar trigger en Cloud Build Console
```

## 🧪 Verificación Post-Deployment

Una vez desplegado, verificar que V2 está activo:

```bash
# 1. Test endpoint de templates
curl https://nubemgenesis-394068846550.us-central1.run.app/api/v2/orchestrate/templates

# 2. Test orquestación con clarificación
curl -X POST https://nubemgenesis-394068846550.us-central1.run.app/api/v2/orchestrate/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"query": "I need to analyze documents"}'

# Respuesta esperada: preguntas de clarificación sobre tipo de documentos, etc.
```

## 💡 Solución de Problemas

### Si el build falla por dependencias:
1. Usar `--no-optional` en npm/pnpm install
2. Excluir paquetes problemáticos del package.json
3. Usar imagen base con dependencias preinstaladas

### Si el puerto es incorrecto:
```bash
# Cloud Run usa PORT env variable
gcloud run services update nubemgenesis \
  --set-env-vars PORT=3000 \
  --region us-central1
```

### Si necesitas rollback:
```bash
# Listar revisiones
gcloud run revisions list --service nubemgenesis --region us-central1

# Rollback a revisión anterior
gcloud run services update-traffic nubemgenesis \
  --to-revisions=nubemgenesis-00005-xxx=100 \
  --region us-central1
```

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs en Cloud Console
2. Verificar que todas las variables de entorno están configuradas
3. Confirmar que el código V2 está en la imagen desplegada

## 🎯 Resultado Esperado

Una vez completado el deployment, tendrás:
- ✨ Sistema de orquestación V2 con RAG activo
- 🤖 Clarificación inteligente funcionando
- 📚 Base de conocimiento operativa
- 🎨 UI Wizard mejorado disponible

Los endpoints V2 estarán accesibles en:
- `/api/v2/orchestrate/orchestrate`
- `/api/v2/orchestrate/suggestions`
- `/api/v2/orchestrate/feedback`
- `/api/v2/orchestrate/templates`