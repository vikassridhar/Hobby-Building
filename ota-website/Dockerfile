# Multi-stage build for OTA Website with Gemma 4 LLM integration

# Stage 1: Build the frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the frontend
RUN pnpm run build

# Stage 2: Production server
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files for production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built frontend and server files
COPY --from=builder /app/dist ./dist
COPY proxy-server.js ./
COPY package.json ./

# Expose ports
EXPOSE 3001 5173

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV LLM_URL=http://host.docker.internal:8000/v1/chat/completions
ENV BRAVE_API_KEY=

# Start the proxy server
CMD ["node", "proxy-server.js"]
