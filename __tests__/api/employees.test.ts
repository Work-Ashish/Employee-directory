import { expect, test, describe, beforeEach, vi } from 'vitest'
import { GET, POST } from '@/app/api/employees/route'
import { prismaMock } from '../setup'

describe('Employee API Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('GET /api/employees', () => {
        test('returns paginated employees successfully', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })
            prismaMock.employee.count.mockResolvedValue(2)
            prismaMock.employee.findMany.mockResolvedValue([
                { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
                { id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
            ])

            const req = new Request('http://localhost:3000/api/employees?page=1&limit=10')
            const res = await GET(req)
            const json = await res.json()

            expect(res.status).toBe(200)
            expect(json.meta.total).toBe(2)
            expect(json.data.length).toBe(2)
            expect(prismaMock.employee.findMany).toHaveBeenCalledTimes(1)
        })

        test('handles GET internal server error gracefully', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })
            prismaMock.employee.findMany.mockRejectedValue(new Error('Simulated DB Error'))

            const req = new Request('http://localhost:3000/api/employees')
            const res = await GET(req)
            const json = await res.json()

            expect(res.status).toBe(500)
            expect(json.error.message).toBe('Internal Server Error')
        })
    })

    describe('POST /api/employees', () => {
        test('rejects malformed data due to Zod validation', async () => {
            // Missing first name, missing employeeCode
            const payload = { lastName: 'Doe', email: 'invalid-email' }
            const req = new Request('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(400)
            expect(json.error.message).toBe('Validation Error')
            expect(json.error.details).toBeDefined()
        })

        test('creates employee successfully with valid data', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })
            prismaMock.employee.findUnique.mockResolvedValue(null) // No existing email/code
            prismaMock.employee.findFirst
                .mockResolvedValueOnce(null) // withAuth: resolve session employeeId
                .mockResolvedValueOnce(null) // pre-check: existing email
                .mockResolvedValueOnce(null) // pre-check: existing code
                .mockResolvedValueOnce({ id: 'manager-1' }) // manager exists validation
            prismaMock.user.create.mockResolvedValue({ id: 'new-user-1' })
            prismaMock.employee.create.mockResolvedValue({
                id: 'new-emp-1',
                employeeCode: 'EMP-001'
            })
            prismaMock.user.findUnique.mockResolvedValue(null)

            // Note: the transaction is mocked in setup.ts to execute the cb directly,
            // so we don't strictly need to mock $transaction here unless it's not setup correctly

            const payload = {
                employeeCode: 'EMP-001',
                firstName: 'Alice',
                lastName: 'Wonder',
                email: 'alice@example.com',
                designation: 'Engineer',
                departmentId: 'dept-1',
                dateOfJoining: '2024-01-01',
                salary: 50000,
                status: 'ACTIVE',
                managerId: 'manager-1'
            }

            const req = new Request('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(201)
            expect(json.data.employeeCode).toBe('EMP-001')
            // Assert that the credentials generation trigger fired (if applicable)
            expect(prismaMock.employee.create).toHaveBeenCalled()
        })

        test('handles POST conflict error (P2002)', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })

            const conflictError = new Error() as any
            conflictError.code = 'P2002'
            conflictError.meta = { target: ['email'] }

            // We simulate that creating the User hits the unique constraint
            prismaMock.user.create.mockRejectedValue(conflictError)

            const payload = {
                employeeCode: 'EMP-002',
                firstName: 'Bob',
                lastName: 'Builder',
                email: 'bob@example.com',
                designation: 'Worker',
                departmentId: 'dept-1',
                dateOfJoining: '2024-01-01',
                salary: 40000,
                status: 'ACTIVE',
                role: 'CEO'
            }

            const req = new Request('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const res = await POST(req)
            const json = await res.json()

            expect(res.status).toBe(409)
            expect(json.error.message).toContain('email already exists')
        })

        test('handles POST constraint error (P2003)', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })
            const constraintError = new Error() as any
            constraintError.code = 'P2003'

            prismaMock.user.create.mockRejectedValue(constraintError)

            const req = new Request('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeCode: 'EMP-003', firstName: 'C', lastName: 'D',
                    email: 'c@d.com', designation: 'D', departmentId: 'invalid',
                    dateOfJoining: '2024-01-01', salary: 1, status: 'ACTIVE', role: 'CEO'
                })
            })

            const res = await POST(req)
            expect(res.status).toBe(400)
        })

        test('handles POST employeeCode conflict error (P2002)', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })

            const conflictError = new Error() as any
            conflictError.code = 'P2002'
            conflictError.meta = { target: ['employeeCode'] }

            prismaMock.user.create.mockRejectedValue(conflictError)

            const req = new Request('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeCode: 'EMP-003', firstName: 'C', lastName: 'D',
                    email: 'c@d.com', designation: 'D', departmentId: 'valid',
                    dateOfJoining: '2024-01-01', salary: 1, status: 'ACTIVE', role: 'CEO'
                })
            })

            const res = await POST(req)
            const json = await res.json()
            expect(res.status).toBe(409)
            expect(json.error.message).toContain('code already exists')
        })

        test('handles generic POST internal server error', async () => {
            prismaMock.organization.findFirst.mockResolvedValue({ id: 'org-1' })
            prismaMock.user.create.mockRejectedValue(new Error('Random Error'))

            const req = new Request('http://localhost:3000/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeCode: 'EMP-004', firstName: 'E', lastName: 'F',
                    email: 'e@f.com', designation: 'D', departmentId: 'valid',
                    dateOfJoining: '2024-01-01', salary: 1, status: 'ACTIVE', role: 'CEO'
                })
            })

            const res = await POST(req)
            const json = await res.json()
            expect(res.status).toBe(500)
        })
    })
})
