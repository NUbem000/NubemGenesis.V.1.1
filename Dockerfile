FROM node:18-alpine

WORKDIR /app

# Copiar el servidor standalone
COPY v2-standalone-server.js ./server.js

# Crear package.json mínimo
RUN echo '{\
  "name": "nubemgenesis-v2-demo",\
  "version": "2.0.0",\
  "main": "server.js",\
  "dependencies": {\
    "express": "^4.18.2",\
    "cors": "^2.8.5"\
  }\
}' > package.json

# Instalar dependencias
RUN npm install --production

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]