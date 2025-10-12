# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app
# Build-time environment variables passed from docker-compose
ARG NEXT_PUBLIC_API_URL
ARG NEXT_DISABLE_FONT_DOWNLOAD=1
ENV NEXT_DISABLE_FONT_DOWNLOAD=$NEXT_DISABLE_FONT_DOWNLOAD
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies (including dev) using clean, reproducible install
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build Next.js app
RUN npm run build

# ---------- Production stage ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Создаем пользователя nextjs
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy production files from builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Copy source files needed for API routes and serverless functions
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/models ./models
COPY --from=builder /app/types ./types
COPY --from=builder /app/components ./components
COPY --from=builder /app/middleware.ts ./middleware.ts
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Создаем необходимые директории и устанавливаем права
RUN mkdir -p /app/public/uploads && \
    mkdir -p /app/.next/cache && \
    mkdir -p /app/.next/cache/images && \
    mkdir -p /app/.next/cache/fetch-cache && \
    chown -R nextjs:nodejs /app && \
    chmod -R 755 /app/public/uploads && \
    chmod -R 777 /app/.next/cache

# Переключаемся на пользователя nextjs
USER nextjs

EXPOSE 3000

CMD ["npm", "start"]