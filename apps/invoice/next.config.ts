import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 依 Next 官方 Multi-Zones 文件：zone 用 assetPrefix（不是 basePath），頁面直接放在 app/invoices/。
  assetPrefix: '/invoices-static',
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  transpilePackages: ['@repo/ui', '@repo/menu', '@repo/auth', '@repo/zone-inspector'],
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    // 經 order 轉發時原樣傳回，用來判斷「是誰回應的」
    return [{ source: '/:path*', headers: [{ key: 'x-zone', value: 'invoice' }] }]
  },
}

export default nextConfig
