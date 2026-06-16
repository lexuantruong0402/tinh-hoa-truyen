# ---- Build Stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner

# Cloud Run metadata labels
LABEL maintainer="tinh-hoa-truyen"
LABEL description="Tinh Hoa Truyen - Story scraping & reading web app"
LABEL version="1.0.0"

# Install tini for proper signal handling (Cloud Run best practice)
RUN apk add --no-cache tini

WORKDIR /app

# Copy production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server and runtime source files
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8080

ENV NODE_ENV=production \
    PORT=8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/scrape?url=check || exit 1

# Use tini as init for proper signal forwarding
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "server.ts"]