import { vi } from 'vitest'
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
vi.mock('@/lib/auth', () => ({
    auth: vi.fn().mockResolvedValue({
        user: { id: 'test-user-id', role: Roles.CEO, organizationId: 'org-1', name: 'Test User' }
    })
}))

/**
 * Helper to override the mocked session for a single test.
 * Usage: mockSession({ role: Roles.EMPLOYEE, organizationId: 'org-2' })
 */
export function mockSession(overrides: Record<string, unknown> = {}) {
    const { auth } = require('@/lib/auth') as any
    auth.mockResolvedValueOnce({
        user: { id: 'test-user-id', role: Roles.CEO, organizationId: 'org-1', name: 'Test User', ...overrides }
    })
}

