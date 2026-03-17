import { vi } from 'vitest'

// Mock server-only module so tests can import server modules
vi.mock('server-only', () => ({}))

import { Roles } from '@/lib/permissions'

// Mock Django proxy — all API routes now proxy to Django
export const mockProxyToDjango = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: [] }), { status: 200 })
)
vi.mock('@/lib/django-proxy', () => ({
    proxyToDjango: (...args: unknown[]) => mockProxyToDjango(...args),
}))
vi.mock('@/lib/route-deprecation', () => ({
    deprecatedRoute: vi.fn(),
}))

// Mock Django auth-server — default role is CEO
const authMock = vi.fn().mockResolvedValue({
    user: { id: 'test-user-id', role: Roles.CEO, organizationId: 'org-1', name: 'Test User', email: 'test@test.com' }
})
vi.mock('@/lib/auth-server', () => ({
    getServerSession: authMock,
}))

// Legacy mock for @/lib/auth — kept for backward compatibility with any remaining imports
vi.mock('@/lib/auth', () => ({
    auth: authMock,
}))

function defaultUser(overrides: Record<string, unknown> = {}) {
    return { id: 'test-user-id', role: Roles.CEO, organizationId: 'org-1', name: 'Test User', ...overrides }
}

/**
 * Helper to override the mocked session for a single test (next call only).
 * Usage: mockSession({ role: Roles.EMPLOYEE, organizationId: 'org-2' })
 */
export function mockSession(overrides: Record<string, unknown> = {}) {
    authMock.mockResolvedValueOnce({ user: defaultUser(overrides) })
}

/**
 * Helper to override the default session for ALL calls until clearAllMocks().
 * Usage: mockSessionPersistent({ role: Roles.TEAM_LEAD })
 */
export function mockSessionPersistent(overrides: Record<string, unknown> = {}) {
    authMock.mockResolvedValue({ user: defaultUser(overrides) })
}
