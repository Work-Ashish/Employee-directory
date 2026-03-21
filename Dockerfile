# HRMS Next.js Frontend
# Multi-stage build for production-ready container

# --- Stage 1: Dependencies ---
FROM node:22-alpine AS deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# --- Stage 2: Builder ---
FROM node:22-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env vars (can be overridden at build time)
ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_EMBEDDED="false"
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_EMBEDDED=$NEXT_PUBLIC_EMBEDDED \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Stage 3: Runtime ---
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache wget

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Copy only the necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/api/raw-health || exit 1

CMD ["node", "server.js"]
