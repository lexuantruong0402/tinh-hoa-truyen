# ---- Build Stage ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Lưu ý: Vite cần các biến bắt đầu bằng VITE_ để load ở client-side. 
# Nếu API key dùng ở server, không cần bước này.
RUN npm run build

# ---- Production Stage ----
FROM node:22-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
COPY package*.json ./
# Cài đặt production dependencies
RUN npm ci --omit=dev
# Copy kết quả build từ stage trước
COPY --from=builder /app/dist ./dist
# Copy các file cần thiết để chạy server (server.ts, v.v.)
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src ./src

# Không cần ENV GEMINI_API_KEY ở đây! 
# Bạn sẽ cấp nó qua Cloud Run Console (Secret Manager) như đã làm.

USER node
EXPOSE 8080

ENV NODE_ENV=production PORT=8080
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "server.ts"]