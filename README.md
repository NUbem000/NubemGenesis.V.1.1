<!-- markdownlint-disable MD030 -->

<p align="center">
<img src="https://nubemgenesis.com/images/nubemgenesis_logo.png">
</p>

[![Release Notes](https://img.shields.io/github/release/NubemGenesis/NubemGenesis)](https://github.com/NubemGenesis/NubemGenesis/releases)
[![Discord](https://img.shields.io/discord/1087698854775881778?label=Discord&logo=discord)](https://discord.gg/nubemgenesis)

Español | English

<h3>Plataforma Avanzada de Agentes de IA</h3>
<img width="100%" src="https://nubemgenesis.com/images/nubemgenesis_demo.gif"></a>

## ⚡Inicio Rápido

Descargue e Instale [NodeJS](https://nodejs.org/en/download) >= 18.15.0

1. Instalar NubemGenesis
    ```bash
    npm install -g nubemgenesis
    ```
2. Iniciar NubemGenesis

    ```bash
    npx nubemgenesis start
    ```

    Con usuario y contraseña

    ```bash
    npx nubemgenesis start --FLOWISE_USERNAME=usuario --FLOWISE_PASSWORD=contraseña
    ```

3. Abrir [http://localhost:3000](http://localhost:3000)

## 🐳 Docker

### Docker Compose

1. Clonar el proyecto NubemGenesis
2. Ir a la carpeta `docker` en la raíz del proyecto
3. Copiar el archivo `.env.example`, pegarlo en la misma ubicación y renombrarlo a `.env`
4. Ejecutar `docker compose up -d`
5. Abrir [http://localhost:3000](http://localhost:3000)
6. Se pueden detener los contenedores con `docker compose stop`

### Imagen Docker

1. Construir la imagen localmente:
    ```bash
    docker build --no-cache -t nubemgenesis .
    ```
2. Ejecutar la imagen:

    ```bash
    docker run -d --name nubemgenesis -p 3000:3000 nubemgenesis
    ```

3. Detener la imagen:
    ```bash
    docker stop nubemgenesis
    ```

## 👨‍💻 Desarrolladores

NubemGenesis tiene 3 módulos diferentes en un único monorepo:

-   `server`: Backend en Node para la lógica de API
-   `ui`: Frontend en React
-   `components`: Integraciones de nodos de terceros
-   `api-documentation`: Documentación API autogenerada con swagger-ui desde express

### Prerrequisitos

-   Instalar [PNPM](https://pnpm.io/installation)
    ```bash
    npm i -g pnpm
    ```

### Configuración

1.  Clonar el repositorio

    ```bash
    git clone https://github.com/NubemGenesis/NubemGenesis.git
    ```

2.  Ir a la carpeta del repositorio

    ```bash
    cd NubemGenesis
    ```

3.  Instalar todas las dependencias de todos los módulos:

    ```bash
    pnpm install
    ```

4.  Compilar todo el código:

    ```bash
    pnpm build
    ```

    <details>
    <summary>Código de salida 134 (JavaScript heap out of memory)</summary>  
      Si obtienes este error al ejecutar el script `build`, intenta aumentar el tamaño del heap de Node.js y ejecuta el script nuevamente:

        export NODE_OPTIONS="--max-old-space-size=4096"
        pnpm build

    </details>

5.  Iniciar la aplicación:

    ```bash
    pnpm start
    ```

    Ahora puedes acceder a la aplicación en [http://localhost:3000](http://localhost:3000)

6.  Para desarrollo:

    -   Crea un archivo `.env` y especifica `VITE_PORT` (consulta `.env.example`) en `packages/ui`
    -   Crea un archivo `.env` y especifica `PORT` (consulta `.env.example`) en `packages/server`
    -   Ejecuta

        ```bash
        pnpm dev
        ```

    Cualquier cambio en el código recargará la aplicación automáticamente en [http://localhost:8080](http://localhost:8080)

## 🔒 Autenticación

Para habilitar la autenticación a nivel de aplicación, agrega `FLOWISE_USERNAME` y `FLOWISE_PASSWORD` al archivo `.env` en `packages/server`:

```
FLOWISE_USERNAME=usuario
FLOWISE_PASSWORD=contraseña
```

## 🌱 Variables de Entorno

NubemGenesis admite diferentes variables de entorno para configurar tu instancia. Puedes especificar las siguientes variables en el archivo `.env` dentro de la carpeta `packages/server`. Lee [más](https://github.com/NubemGenesis/NubemGenesis/blob/main/CONTRIBUTING.md#-env-variables)

## 📖 Documentación

[Documentación de NubemGenesis](https://docs.nubemgenesis.com/)

## 🌐 Auto-Hospedaje

Implementa NubemGenesis en tu infraestructura existente, soportamos varios tipos de [despliegues](https://docs.nubemgenesis.com/configuracion/deployment)

-   [AWS](https://docs.nubemgenesis.com/configuracion/deployment/aws)
-   [Azure](https://docs.nubemgenesis.com/configuracion/deployment/azure)
-   [Digital Ocean](https://docs.nubemgenesis.com/configuracion/deployment/digital-ocean)
-   [GCP](https://docs.nubemgenesis.com/configuracion/deployment/gcp)
-   <details>
      <summary>Others</summary>

    -   [Railway](https://docs.flowiseai.com/configuration/deployment/railway)

        [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/pn4G8S?referralCode=WVNPD9)

    -   [Render](https://docs.flowiseai.com/configuration/deployment/render)

        [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://docs.flowiseai.com/configuration/deployment/render)

    -   [HuggingFace Spaces](https://docs.flowiseai.com/deployment/hugging-face)

        <a href="https://huggingface.co/spaces/FlowiseAI/Flowise"><img src="https://huggingface.co/datasets/huggingface/badges/raw/main/open-in-hf-spaces-sm.svg" alt="HuggingFace Spaces"></a>

    -   [Elestio](https://elest.io/open-source/flowiseai)

        [![Deploy on Elestio](https://elest.io/images/logos/deploy-to-elestio-btn.png)](https://elest.io/open-source/flowiseai)

    -   [Sealos](https://template.sealos.io/deploy?templateName=flowise)

        [![Deploy on Sealos](https://sealos.io/Deploy-on-Sealos.svg)](https://template.sealos.io/deploy?templateName=flowise)

    -   [RepoCloud](https://repocloud.io/details/?app_id=29)

        [![Deploy on RepoCloud](https://d16t0pc4846x52.cloudfront.net/deploy.png)](https://repocloud.io/details/?app_id=29)

      </details>

## ☁️ NubemGenesis Cloud

[Comienza con NubemGenesis Cloud](https://nubemgenesis.com/)

## 🙋 Soporte

Siéntete libre de hacer cualquier pregunta, reportar problemas y solicitar nuevas funciones en [discusiones](https://github.com/NubemGenesis/NubemGenesis/discussions)

## 🙌 Contribuciones

Agradecimientos a todos los fantásticos colaboradores

<a href="https://github.com/NubemGenesis/NubemGenesis/graphs/contributors">
<img src="https://contrib.rocks/image?repo=NubemGenesis/NubemGenesis" />
</a>

Consulta la [guía de contribución](CONTRIBUTING.md). Contáctanos en [Discord](https://discord.gg/nubemgenesis) si tienes alguna pregunta o problema.

## 📄 Licencia

El código fuente en este repositorio está disponible bajo [Apache License Version 2.0](LICENSE.md).
