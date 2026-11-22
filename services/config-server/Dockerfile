# syntax=docker/dockerfile:1
# 在 repo 根目錄執行：docker build -f services/config-server/Dockerfile .
FROM node:20.20.2-alpine AS base
RUN npm install -g pnpm@10.34.9 turbo@2.11.13

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune @repo/config-server --docker

# runtime menu 的 JS 在 build 時打包進 image（模擬上傳到 CDN）
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
# 結尾的 ... 代表連同依賴一起 build（config-server 自己沒有 build 腳本，靠它帶出 menu-runtime 的 build）
RUN turbo run build --filter=@repo/config-server...

FROM node:20.20.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=4000 MENU_FILE=/config/menu.json RUNTIME_DIR=/app/runtime CORS_ORIGIN=*
COPY --from=builder --chown=node:node /app/services/config-server/src ./src
COPY --from=builder --chown=node:node /app/packages/menu-runtime/dist ./runtime
USER node
EXPOSE 4000
CMD ["node", "src/index.mjs"]
