import { vi } from 'vitest'

// Mock server-only module so tests can import server modules
vi.mock('server-only', () => ({}))

import { Roles } from '@/lib/permissions'

// Mocking Prisma Client
export const prismaMock = {
    employee: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn()
    },
    organization: {
        findFirst: vi.fn(),
    },
    department: {
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
    },
    payroll: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
    },
    payrollComplianceConfig: {
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
    },
    payrollAudit: {
        create: vi.fn(),
    },
    attendance: {
        findMany: vi.fn(),
        count: vi.fn(),
    },
    workflowTemplate: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
    },
    ticket: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
    },
    team: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    teamMember: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
    },
    employeeFeedback: {
        findMany: vi.fn(),
        create: vi.fn(),
    },
    auditLog: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
    },
    performanceReview: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
    },
    userSession: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
    },
    $transaction: vi.fn((queries) => {
        if (Array.isArray(queries)) return Promise.all(queries)
        return queries(prismaMock)
    })
}

vi.mock('@/lib/prisma', () => ({
    prisma: prismaMock
}))

// Mock NextAuth — default role is CEO (was ADMIN)
const authMock = vi.fn().mockResolvedValue({
    user: { id: 'test-user-id', role: Roles.CEO, organizationId: 'org-1', name: 'Test User' }
})
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

