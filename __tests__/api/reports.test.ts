import { expect, test, describe, beforeEach, vi } from 'vitest'
import { POST as queryReport } from '@/app/api/reports/query/route'
import { Roles } from '@/lib/permissions'
import { prismaMock } from '../setup'

describe('Reporting & Analytics (Week 10)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('EMPLOYEE report query returns data', async () => {
        prismaMock.employee.findMany.mockResolvedValue([
            { firstName: 'Alice', lastName: 'Wonder', employeeCode: 'EMP001' }
        ])
        prismaMock.employee.count.mockResolvedValue(1)

        const req = new Request('http://localhost:3000/api/reports/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entityType: 'EMPLOYEE',
                columns: ['firstName', 'lastName', 'employeeCode']
            })
        })

        const res = await queryReport(req)
        const json = await res.json()

        expect(res.status).toBe(200)
    })

    test('PAYROLL report query allowed for HR (has PAYROLL.VIEW)', async () => {
        const { auth } = await import('@/lib/auth') as any
        auth.mockResolvedValueOnce({
            user: { id: 'hr-1', role: Roles.HR, organizationId: 'org-1', name: 'HR User' }
        })

        prismaMock.payroll.findMany.mockResolvedValue([
            { netSalary: 50000 }
        ])
        prismaMock.payroll.count.mockResolvedValue(1)

        const req = new Request('http://localhost:3000/api/reports/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                entityType: 'PAYROLL',
                columns: ['netSalary']
            })
        })

        const res = await queryReport(req)
        expect(res.status).toBe(200)
    })
})
