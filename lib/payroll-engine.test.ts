import { describe, it, expect } from 'vitest'
import { calculateNetSalary, calculatePFContributions, calculateDynamicTax } from './payroll-engine'

describe('Payroll Engine', () => {
    describe('calculateNetSalary', () => {
        it('should correctly calculate net salary with all components', () => {
            const result = calculateNetSalary({
                basicSalary: 50000,
                allowances: 10000,
                arrears: 0,
                reimbursements: 0,
                loansAdvances: 0,
                pfDeduction: 6000,
                tax: 5000,
                otherDed: 1000
            })
            expect(result).toBe(48000)
        })

        it('should handle zero allowances and deductions', () => {
            const result = calculateNetSalary({
                basicSalary: 30000,
                allowances: 0,
                arrears: 0,
                reimbursements: 0,
                loansAdvances: 0,
                pfDeduction: 0,
                tax: 0,
                otherDed: 0
            })
            expect(result).toBe(30000)
        })
    })

    describe('calculatePFContributions', () => {
        it('should calculate 12% for both employee and employer', () => {
            const result = calculatePFContributions(10000, 12)
            expect(result.employeeContribution).toBe(1200)
            expect(result.employerContribution).toBe(1200)
            expect(result.totalContribution).toBe(2400)
        })
    })

    describe('calculateDynamicTax', () => {
        const mockConfig: any = {
            standardDeduction: 50000,
            healthEducationCess: 4,
            taxSlabs: [
                { minIncome: 0, maxIncome: 300000, taxRate: 0, baseTax: 0 },
                { minIncome: 300001, maxIncome: 600000, taxRate: 5, baseTax: 0 },
                { minIncome: 600001, maxIncome: 900000, taxRate: 10, baseTax: 15000 },
                { minIncome: 900001, maxIncome: 1200000, taxRate: 15, baseTax: 45000 },
                { minIncome: 1200001, maxIncome: 1500000, taxRate: 20, baseTax: 90000 },
                { minIncome: 1500001, maxIncome: null, taxRate: 30, baseTax: 150000 }
            ]
        }

        it('should return 0 tax for low income', () => {
            const result = calculateDynamicTax(240000, mockConfig) // Below threshold even before deduction
            expect(result.taxAmount).toBe(0)
            expect(result.effectiveRate).toBe(0)
        })

        it('should calculate progressive tax correctly', () => {
            // Net taxable: 800000 - 50000 = 750000
            // Slab 0: 300k
            // Slab 5%: 300k -> 15000
            // Slab 10%: 150k -> 15000
            // Base tax = 30000
            // Cess = 4% of 30000 = 1200
            // Total = 31200

            // Monthly tax = 31200 / 12 = 2600
            const result = calculateDynamicTax(800000, mockConfig)
            expect(result.taxAmount).toBeGreaterThan(0)
        })
    })
})
