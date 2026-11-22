import path from 'node:path'
import type { NextConfig } from 'next'

const INVOICE_ZONE_URL = process.env.INVOICE_ZONE_URL ?? 'http://localhost:3001'
if (!/^https?:\/\/[^/]+$/.test(INVOICE_ZONE_URL)) {
  throw new Error(`INVOICE_ZONE_URL 必須是不帶路徑、不帶結尾斜線的 origin，目前是 "${INVOICE_ZONE_URL}"`)
}
// build log 要能看到實際寫進 routes-manifest 的目標（Docker build 時用來確認）
console.log(`[order] rewrites → invoice=${INVOICE_ZONE_URL}`)

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  transpilePackages: ['@repo/ui', '@repo/menu', '@repo/auth', '@repo/zone-inspector'],
  eslint: { ignoreDuringBuilds: true },
  // order 不得定義套用到 /:path* 的 headers()：會在 rewrite 前套用而蓋掉 invoice 的 x-zone。
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: '/invoices', destination: `${INVOICE_ZONE_URL}/invoices` },
        { source: '/invoices/:path+', destination: `${INVOICE_ZONE_URL}/invoices/:path+` },
        { source: '/invoices-static/:path+', destination: `${INVOICE_ZONE_URL}/invoices-static/:path+` },
      ],
      fallback: [],
    }
  },
}

export default nextConfig
