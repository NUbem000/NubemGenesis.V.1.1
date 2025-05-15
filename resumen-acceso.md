# Resumen de Acceso a NubemGenesis V1.1

## Acceso Inmediato

Para acceder inmediatamente a la aplicación, utiliza cualquiera de las siguientes opciones:

1. **URL de Cloud Run (disponible inmediatamente)**: 
   - [https://nubemgenesis-zqvgtbn4ya-uc.a.run.app](https://nubemgenesis-zqvgtbn4ya-uc.a.run.app)

2. **Subdominio temporal (en proceso de certificación)**:
   - [https://app.nubemcode.com](https://app.nubemcode.com)
   - Estado: El registro DNS se ha propagado correctamente
   - Certificado SSL: en proceso de aprovisionamiento por Google Cloud
   - Disponibilidad estimada: entre unos minutos y varias horas

## Credenciales de Acceso

Para todas las URLs, utiliza las siguientes credenciales:
- Usuario: `admin`
- Contraseña: `NubemAdmin2025!`

## Estado del Dominio Principal

El dominio principal `nubemgenesis.ai` está en proceso de verificación:

1. **Registro TXT de verificación**: Configurado correctamente
   ```
   google-site-verification=KodRPxW_gWDDr6cJm3MtGVCLHxVdO6sjMw5qfqMw5t4
   ```

2. **Verificación en Google Search Console**: Pendiente (requiere acción manual)
   - Visita [Google Search Console](https://search.google.com/search-console/welcome)
   - Ingresa `nubemgenesis.ai`
   - Confirma que el registro TXT existe
   - Haz clic en "Verificar"

3. **Mapeo del dominio**: Pendiente (después de la verificación)
   ```bash
   gcloud beta run domain-mappings create --service=nubemgenesis --domain=nubemgenesis.ai --region=us-central1 --platform=managed
   ```

## Próximos Pasos

1. **A corto plazo**: 
   - Usar la URL de Cloud Run o app.nubemcode.com para acceso inmediato
   - Completar el proceso de verificación del dominio principal en Google Search Console

2. **Después de la verificación**:
   - Ejecutar el comando de mapeo del dominio a Cloud Run
   - Configurar los registros DNS finales según las instrucciones
   - Esperar a que se propague la configuración DNS (24-48 horas)

3. **Después de la propagación DNS**:
   - La aplicación estará disponible en [https://nubemgenesis.ai](https://nubemgenesis.ai)
   - Opcionalmente, eliminar el mapeo temporal (app.nubemcode.com)

## Documentación Detallada

Para instrucciones más detalladas, consulta los siguientes documentos:
- `/root/NubemGenesis.V.1.1/NubemGenesis-Deployment-Final.md`: Documentación completa del despliegue
- `/root/NubemGenesis.V.1.1/verificacion_dominio_actualizada.md`: Instrucciones detalladas para verificación del dominio
- `/root/NubemGenesis.V.1.1/acceso-temporal.md`: Opciones para acceso temporal
- `/root/NubemGenesis.V.1.1/finalizacion_dominio.md`: Pasos finales para la configuración del dominio principal