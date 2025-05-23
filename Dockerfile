# Universal Memory MCP HTTP Bridge Docker Image
FROM node:18-alpine

# Install build dependencies for native modules, curl for health checks, and git for repo auto-tagging
RUN apk add --no-cache python3 make g++ curl git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (skip build in prepare script)
RUN npm ci --ignore-scripts

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Build TypeScript
RUN npm run build

# Rebuild native modules for container architecture
RUN npm rebuild sqlite3

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Create data directory for persistence
RUN mkdir -p /app/data

# Expose HTTP bridge port
EXPOSE 3020

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3020/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV MEMORY_STORAGE_PATH=/app/data/universal-memories.db
ENV OLLAMA_URL=http://host.docker.internal:11434

# Run the HTTP bridge server
CMD ["node", "dist/http-server.js"]