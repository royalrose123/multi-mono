#!/usr/bin/env bash
# 一鍵設定開發環境：在 repo 根目錄執行 ./setup.sh
#   --with-e2e  另外安裝 Playwright 的 Chromium（跑 E2E 才需要）
# 可以重複執行：已完成的步驟會沿用，不會覆蓋既有的 .env.local。
set -euo pipefail

cd "$(dirname "$0")"

WITH_E2E=0
for arg in "$@"; do
  case "$arg" in
    --with-e2e) WITH_E2E=1 ;;
    -h|--help) sed -n '2,4p' "$0"; exit 0 ;;
    *) echo "未知的參數：${arg}（可用：--with-e2e）" >&2; exit 1 ;;
  esac
done

step() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

# 1) nvm 與 Node（版本由 .nvmrc 決定）
step "Node $(cat .nvmrc)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
else
  fail "找不到 nvm。請先安裝 nvm（https://github.com/nvm-sh/nvm），開一個新的 terminal 後再執行 ./setup.sh"
fi
nvm install >/dev/null
nvm use >/dev/null
echo "node $(node -v)"

# 2) pnpm（版本由 package.json 的 packageManager 決定）
step "pnpm"
PNPM_VERSION="$(node -p "require('./package.json').packageManager.split('@')[1]")"
if corepack enable >/dev/null 2>&1 && corepack prepare "pnpm@${PNPM_VERSION}" --activate >/dev/null 2>&1; then
  echo "pnpm $(pnpm -v)（corepack）"
else
  echo "corepack 無法啟用 pnpm，改用 npm 全域安裝 pnpm@${PNPM_VERSION}"
  npm install -g "pnpm@${PNPM_VERSION}" >/dev/null
  echo "pnpm $(pnpm -v)（npm）"
fi

# 3) 安裝套件（依 lockfile，不改版本）
step "安裝套件"
pnpm install --frozen-lockfile

# 4) 建立 .env.local（已存在則保留）
step "環境變數"
pnpm bootstrap

# 5) E2E 用的瀏覽器（選用）
if [ "$WITH_E2E" = 1 ]; then
  step "Playwright Chromium"
  pnpm --filter @repo/e2e exec playwright install chromium
fi

# 6) Docker（只檢查，不安裝）
step "Docker（選用）"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "Docker 可用，可以執行 pnpm docker:up"
else
  echo "沒有偵測到執行中的 Docker；只有 pnpm docker:up 需要它，本機開發不受影響"
fi

cat <<'EOF'

✓ 設定完成。接下來：

  nvm use      # 讓目前的 terminal 切到 .nvmrc 的 Node 版本
  pnpm dev     # 開 http://localhost:3000（demo 帳號 alice / alice123）

EOF
