import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// vitest 未開 globals，RTL 不會自動 cleanup，這裡手動註冊。
afterEach(cleanup)
