import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Undo the global mock from __tests__/setup.ts so we test the real implementation
vi.unmock('@/lib/auth-server')

// Mock server-only so the import doesn't fail in test env
vi.mock('server-only', () => ({}))

// Mock next/headers — use a mutable map so tests can set headers per-test
const mockHeaders = new Map<string, string>()
vi.mock('next/headers', () => ({
    headers: vi.fn(async () => ({
        get: (key: string) => mockHeaders.get(key) || null,
    })),
}))

// Mock permissions module (needed by auth-server)
vi.mock('@/lib/permissions', () => ({
    DJANGO_ROLE_MAP: {
        admin: 'CEO',
        ceo: 'CEO',
        hr_manager: 'HR',
        employee: 'EMPLOYEE',
    },
}))

// Import AFTER all vi.mock calls (vitest hoists them anyway, but keeps intent clear)
import { getServerSession } from '@/lib/auth-server'

// We need to control fetch globally
const originalFetch = global.fetch

describe('getServerSession', () => {
    beforeEach(() => {
        mockHeaders.clear()
        // clearAllMocks resets call counts but doesn't restore vi.mock factories
        vi.clearAllMocks()
    })

    afterEach(() => {
        global.fetch = originalFetch
    })

    it('should return null when no Authorization header or cookie is present', async () => {
        const session = await getServerSession()
        expect(session).toBeNull()
    })

    it('should return null when Authorization header is not a Bearer token', async () => {
        mockHeaders.set('authorization', 'Basic abc123')

        const session = await getServerSession()
        expect(session).toBeNull()
    })

    it('should return a valid session when Django /auth/me/ responds with user data', async () => {
        mockHeaders.set('authorization', 'Bearer valid-jwt-token')
        mockHeaders.set('x-tenant-slug', 'demo')

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    id: 'user-123',
                    email: 'admin@test.com',
                    first_name: 'Admin',
                    last_name: 'User',
                    is_tenant_admin: true,
                    tenant_id: 'org-1',
                    tenant_slug: 'demo',
                    employee_id: 'emp-456',
                    must_change_password: false,
                    avatar: 'https://example.com/avatar.jpg',
                },
            }),
        }) as unknown as typeof fetch

        const session = await getServerSession()

        expect(session).not.toBeNull()
        expect(session!.user).toEqual({
            id: 'user-123',
            email: 'admin@test.com',
            name: 'Admin User',
            role: 'CEO',
            organizationId: 'org-1',
            employeeId: 'emp-456',
            tenantSlug: 'demo',
            isTenantAdmin: true,
            mustChangePassword: false,
            avatar: 'https://example.com/avatar.jpg',
        })

        // Verify fetch was called with correct URL and headers
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/auth/me/'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer valid-jwt-token',
                    'X-Tenant-Slug': 'demo',
                }),
            })
        )
    })

    it('should return null when Django /auth/me/ responds with 401 (expired token)', async () => {
        mockHeaders.set('authorization', 'Bearer expired-jwt-token')

        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({
                error: { detail: 'Token is invalid or expired' },
            }),
        }) as unknown as typeof fetch

        const session = await getServerSession()

        expect(session).toBeNull()
    })

    it('should return null when fetch throws a network error', async () => {
        mockHeaders.set('authorization', 'Bearer valid-jwt-token')

        global.fetch = vi.fn().mockRejectedValue(
            new Error('Network error')
        ) as unknown as typeof fetch

        const session = await getServerSession()

        expect(session).toBeNull()
    })

    it('should read access_token from cookie when no Authorization header', async () => {
        mockHeaders.set('cookie', 'access_token=cookie-jwt-token; tenant_slug=demo')

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    id: 'user-789',
                    email: 'user@test.com',
                    first_name: 'Regular',
                    last_name: 'User',
                    is_tenant_admin: false,
                    tenant_id: 'org-2',
                    tenant_slug: 'demo',
                    employee_id: null,
                    must_change_password: false,
                    avatar: null,
                },
            }),
        }) as unknown as typeof fetch

        const session = await getServerSession()

        expect(session).not.toBeNull()
        expect(session!.user.id).toBe('user-789')
        expect(session!.user.role).toBe('EMPLOYEE')
        expect(session!.user.employeeId).toBeUndefined()
        expect(session!.user.avatar).toBeNull()

        // Verify the cookie token was used
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/v1/auth/me/'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: 'Bearer cookie-jwt-token',
                }),
            })
        )
    })

    it('should map non-admin Django user to EMPLOYEE role', async () => {
        mockHeaders.set('authorization', 'Bearer valid-jwt-token')

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                data: {
                    id: 'user-abc',
                    email: 'employee@test.com',
                    first_name: 'John',
                    last_name: 'Doe',
                    is_tenant_admin: false,
                    role_slug: 'employee',
                    tenant_id: 'org-3',
                    employee_id: 'emp-xyz',
                    must_change_password: true,
                    avatar: null,
                },
            }),
        }) as unknown as typeof fetch

        const session = await getServerSession()

        expect(session).not.toBeNull()
        expect(session!.user.role).toBe('EMPLOYEE')
        expect(session!.user.mustChangePassword).toBe(true)
    })
})
