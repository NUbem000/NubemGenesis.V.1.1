#!/bin/sh

# Ensure PORT is set (Cloud Run sets it to 8080)
export PORT=${PORT:-8080}

echo "Starting Flowise on port $PORT..."

# Change to the server directory and start
cd /app/packages/server

# Use node directly to run the server
node /app/packages/server/dist/index.js