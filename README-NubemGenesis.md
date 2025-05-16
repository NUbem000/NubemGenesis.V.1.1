# NubemGenesis

<div align="center">
  <img src="packages/ui/src/assets/images/nubemgenesis_dark.svg" alt="NubemGenesis Logo" width="400"/>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org)
  [![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Ready-4285F4?logo=google-cloud)](https://cloud.google.com/run)
</div>

## 🌟 Plataforma de IA Generativa

NubemGenesis es una plataforma avanzada de desarrollo de inteligencia artificial generativa que permite crear agentes inteligentes y flujos de trabajo automatizados de manera visual.

### 🚀 Características Principales

- **Constructor Visual de Flujos**: Diseña flujos de IA arrastrando y soltando componentes
- **Agentes Inteligentes**: Crea agentes autónomos con capacidades avanzadas
- **Integración Multi-LLM**: Compatible con OpenAI, Anthropic, Google AI y más
- **Base de Datos Vectorial**: Almacena y busca información de manera eficiente
- **API RESTful**: Integra fácilmente con aplicaciones existentes
- **Modo Oscuro**: Interfaz optimizada para largas sesiones de trabajo
- **Progressive Web App**: Instalable en dispositivos móviles y desktop

### 🛠️ Tecnologías

- **Frontend**: React, Material-UI, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Base de Datos**: PostgreSQL, Redis
- **Despliegue**: Google Cloud Platform, Cloud Run
- **Contenedores**: Docker
- **CI/CD**: Cloud Build

### 📦 Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/NUbem000/NubemGenesis.V.1.1.git
cd NubemGenesis.V.1.1

# Instalar pnpm si no lo tienes
npm install -g pnpm

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# Iniciar en modo desarrollo
pnpm dev
```

### 🌐 Despliegue en Google Cloud

NubemGenesis está optimizado para ejecutarse en Google Cloud Platform:

```bash
# Configurar proyecto GCP
gcloud config set project nubemgenesis-v1-1

# Construir y desplegar con Cloud Build
gcloud builds submit --config=cloudbuild.yaml

# O desplegar directamente con gcloud run
gcloud run deploy nubemgenesis \
  --image flowiseai/flowise:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated
```

### 🔧 Configuración

#### Variables de Entorno Principales

```env
# Base de datos
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=nubemgenesis
DATABASE_USER=user
DATABASE_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Seguridad
JWT_SECRET=your-secret-key
FLOWISE_SECRETKEY_OVERWRITE=another-secret

# API Keys (opcionales)
OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### 📱 Progressive Web App

NubemGenesis incluye soporte completo para PWA:

- Instalable en dispositivos móviles y desktop
- Funciona offline (características limitadas)
- Notificaciones push
- Actualizaciones automáticas

### 🔐 Seguridad

- **Autenticación**: JWT tokens con expiración configurable
- **Encriptación**: Todos los datos sensibles están encriptados
- **API Keys**: Gestión segura de claves de API
- **CORS**: Configuración restrictiva por defecto
- **Rate Limiting**: Protección contra abuso de API
- **Cumplimiento**: GDPR ready

### 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### 📚 Documentación

- [Guía de Usuario](docs/user-guide.md)
- [API Reference](docs/api-reference.md)
- [Guía de Desarrollo](docs/development.md)
- [Configuración Avanzada](docs/advanced-config.md)

### 🐛 Reportar Problemas

Si encuentras un bug o tienes una sugerencia, por favor [abre un issue](https://github.com/NUbem000/NubemGenesis.V.1.1/issues).

### 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

### 🏢 Sobre NubemSystems

NubemGenesis es desarrollado y mantenido por [NubemSystems](https://nubemsystems.es), especialistas en:

- Soluciones Cloud nativas
- Desarrollo de IA empresarial
- Consultoría de transformación digital
- DevOps y automatización

### 📞 Contacto

- **Web**: [https://nubemsystems.es](https://nubemsystems.es)
- **Email**: info@nubemsystems.es
- **LinkedIn**: [NubemSystems](https://linkedin.com/company/nubemsystems)

---

<div align="center">
  <p>Hecho con ❤️ por el equipo de NubemGenesis</p>
  <p>© 2024 NubemSystems. Todos los derechos reservados.</p>
</div>