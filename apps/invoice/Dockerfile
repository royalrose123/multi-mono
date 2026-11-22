# syntax=docker/dockerfile:1
# 在 repo 根目錄執行：docker build -f apps/invoice/Dockerfile .
FROM node:20.20.2-alpine AS base
RUN npm install -g pnpm@10.34.9 turbo@2.11.13
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @repo/invoice --docker

FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ENV BUILD_STANDALONE=1
RUN turbo run build --filter=@repo/invoice

FROM node:20.20.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3001
COPY --from=builder --chown=node:node /app/apps/invoice/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/invoice/.next/static ./apps/invoice/.next/static
COPY --from=builder --chown=node:node /app/apps/invoice/public ./apps/invoice/public
USER node
EXPOSE 3001
CMD ["node", "apps/invoice/server.js"]
