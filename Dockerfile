FROM node:20-alpine

# Instalar dependencias necesarias
RUN apk add --update --no-cache libc6-compat python3 make g++ cairo-dev pango-dev build-base curl

# Configurar entorno
WORKDIR /app
ENV NODE_ENV=production

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Configurar workspaces
COPY packages/api-documentation/package.json ./packages/api-documentation/
COPY packages/components/package.json ./packages/components/
COPY packages/server/package.json ./packages/server/
COPY packages/ui/package.json ./packages/ui/

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN pnpm build

# Exponer puerto (Cloud Run configurará la variable PORT automáticamente)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["pnpm", "start"]
