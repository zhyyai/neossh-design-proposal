# Stage 1: Build
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Switch to high-speed Tencent Cloud apt mirror
RUN sed -i 's/deb.debian.org/mirrors.cloud.tencent.com/g' /etc/apt/sources.list.d/debian.sources

# Install build tools for node-pty native addon compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    gcc \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm config set registry https://mirrors.cloud.tencent.com/npm/ && npm install

COPY . .

# Dummy DATABASE_URL for Next.js build evaluation
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/app_db"
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build
RUN npm prune --production

# Stage 2: Runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN sed -i 's/deb.debian.org/mirrors.cloud.tencent.com/g' /etc/apt/sources.list.d/debian.sources

# Install bash for the PTY shell, ca-certificates, and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV SHELL="/bin/bash"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/drizzle.config.json ./drizzle.config.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]
