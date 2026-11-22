# syntax=docker/dockerfile:1
# 在 repo 根目錄執行：docker build -f apps/order/Dockerfile --build-arg INVOICE_ZONE_URL=http://invoice:3001 .
FROM node:20.20.2-alpine AS base
RUN npm install -g pnpm@10.34.9 turbo@2.11.13
ENV NEXT_TELEMETRY_DISABLED=1

# 1) 把 monorepo 裁剪成只含 order 與它依賴的套件
FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @repo/order --docker

# 2) 先複製 package.json 與 lockfile 安裝依賴（吃 Docker layer cache），再複製原始碼 build
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
ARG INVOICE_ZONE_URL
RUN test -n "$INVOICE_ZONE_URL" || (echo "需要 build arg INVOICE_ZONE_URL（rewrites 在 build 時寫死）" && exit 1)
ENV INVOICE_ZONE_URL=$INVOICE_ZONE_URL
ENV BUILD_STANDALONE=1
RUN turbo run build --filter=@repo/order

# 3) 執行階段只保留 standalone 產物
FROM node:20.20.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/apps/order/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/order/.next/static ./apps/order/.next/static
COPY --from=builder --chown=node:node /app/apps/order/public ./apps/order/public
USER node
EXPOSE 3000
CMD ["node", "apps/order/server.js"]
