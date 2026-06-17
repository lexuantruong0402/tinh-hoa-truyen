# ---- Build Stage ----
FROM node:22-alpine AS builder
# Sử dụng build args để truyền GEMINI_API_KEY vào Vite bundle (client-side)
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build Vite frontend (cần GEMINI_API_KEY để Vite define vào bundle)
RUN npm run build
# Bundle server.ts thành một file JS độc lập (không cần tsx ở runtime)
RUN npx esbuild server.ts --bundle --platform=node --outfile=server.cjs --external:./node_modules/* --packages=external

# ---- Production Stage ----
FROM node:22-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
COPY package*.json ./
# Cài đặt production dependencies (tsx không còn cần thiết ở runtime)
RUN npm ci --omit=dev
# Copy kết quả build frontend
COPY --from=builder /app/dist ./dist
# Copy server.js đã được bundle (không cần server.ts, tsconfig.json, src/)
COPY --from=builder /app/server.cjs ./server.cjs

# Không cần ENV GEMINI_API_KEY ở đây!
# Bạn sẽ cấp nó qua Cloud Run Console (Secret Manager) như đã làm.

USER node
EXPOSE 8080

ENV NODE_ENV=production PORT=8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.cjs"]
