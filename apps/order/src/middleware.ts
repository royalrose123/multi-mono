import { createAuthMiddleware } from '@repo/auth/middleware'

export default createAuthMiddleware()

export const config = { matcher: ['/orders/:path*'] }
