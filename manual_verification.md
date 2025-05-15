# Instrucciones para Verificación Manual del Dominio

Para verificar el dominio nubemgenesis.ai y habilitarlo para su uso con Cloud Run, debes seguir estos pasos manuales:

## 1. Verificación del Dominio en Google Cloud

1. Accede al [Panel de Google Search Console](https://search.google.com/search-console/welcome)
2. Selecciona "Prefijo de URL" o "Dominio" según prefieras
3. Ingresa el dominio: `nubemgenesis.ai`
4. Haz clic en "Continuar"
5. En la sección de verificación, selecciona "Proveedor de DNS" como método de verificación
6. Google te proporcionará un registro TXT específico para tu dominio con formato: `google-site-verification=XXXXX`

## 2. Añade el Registro TXT a GoDaddy

1. Accede a tu cuenta de GoDaddy y ve a la sección "DNS" de tu dominio nubemgenesis.ai
2. Añade un nuevo registro:
   - Tipo: TXT
   - Nombre: @ (o deja en blanco para el dominio raíz)
   - Valor: El código completo `google-site-verification=XXXXX` obtenido en el paso anterior
   - TTL: 600 (o el valor predeterminado)
3. Guarda los cambios

## 3. Espera a la Verificación

La propagación DNS puede tardar entre 30 minutos y 24 horas. Regresa a la consola de Google Search y haz clic en "Verificar" una vez que hayas agregado el registro.

## 4. Mapeo del Dominio Verificado

Una vez que el dominio esté verificado:

1. Abre la [Consola de Google Cloud](https://console.cloud.google.com/)
2. Ve a Cloud Run > Servicios > nubemgenesis
3. Haz clic en la pestaña "Dominios"
4. Haz clic en "Agregar asignación"
5. Selecciona nubemgenesis.ai de la lista de dominios verificados
6. Sigue las instrucciones para completar el mapeo

## 5. Configuración de Registros A y CNAME

Después de mapear el dominio, Google Cloud te proporcionará los registros DNS específicos que debes configurar:

1. Regresa a la configuración DNS de GoDaddy
2. Agrega los registros A proporcionados por Google Cloud:
   - Tipo: A
   - Nombre: @ (o deja en blanco para el dominio raíz)
   - Valor: Las direcciones IP proporcionadas por Google
   - TTL: 600
3. Agrega un registro CNAME para www:
   - Tipo: CNAME
   - Nombre: www
   - Valor: nubemgenesis.ai.
   - TTL: 600

## Verificación Final

Una vez que todos los registros se propaguen (puede tardar hasta 24 horas), visita tu sitio en nubemgenesis.ai para confirmar que está funcionando correctamente.

---

**Nota**: Guarda el código de verificación de Google en un lugar seguro para referencia futura. También puedes guardarlo en Secret Manager ejecutando:

```bash
echo -n "google-site-verification=TU_CÓDIGO_AQUÍ" | gcloud secrets create GOOGLE_VERIFICATION_CODE --data-file=- --replication-policy="automatic"
```