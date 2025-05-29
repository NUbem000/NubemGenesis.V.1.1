FROM node:18-alpine

# Install dependencies for build
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy package.json first
COPY package.json ./

# Install dependencies
RUN pnpm install --prod --ignore-scripts

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "http.get('http://localhost:3000/ping', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
CMD ["node", "dist/index.js"]