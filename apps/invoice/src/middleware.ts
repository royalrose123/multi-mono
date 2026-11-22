import { createAuthMiddleware } from '@repo/auth/middleware'

export default createAuthMiddleware()

// 保護 /invoices 與 /invoices/*，但排除 /invoices/api/*（revalidate API 用 token 保護）
export const config = { matcher: ['/invoices', '/invoices/((?!api/).*)'] }
