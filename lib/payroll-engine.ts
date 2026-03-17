/**
 * Local type definitions replacing @prisma/client types.
 * These mirror the Django PayrollComplianceConfig and TaxSlab models.
 */
export interface PayrollComplianceConfig {
    id: string
    organizationId: string
    standardDeduction: number
    healthCess: number
    pfPercentage: number
    [key: string]: unknown
}

export interface TaxSlab {
    id: string
    configId: string
    minIncome: number
    maxIncome: number | null
    taxRate: number
    baseTax: number
    [key: string]: unknown
}

export interface SalaryComponents {
    basicSalary: number
    allowances: number
    arrears: number
    reimbursements: number
    pfDeduction: number
    tax: number
    otherDed: number
    loansAdvances: number
}

export interface PFContributions {
    employeeContribution: number
    employerContribution: number
    totalContribution: number
}

export interface TaxCalculation {
    taxAmount: number
    effectiveRate: number
}

/**
 * Calculates net salary factoring in additions (arrears, reimbursements)
 * and deductions (loansAdvances, etc)
 */
export function calculateNetSalary(components: SalaryComponents): number {
    const grossAdditions = (components.basicSalary || 0) + (components.allowances || 0) + (components.arrears || 0) + (components.reimbursements || 0)
    const totalDeductions = (components.pfDeduction || 0) + (components.tax || 0) + (components.otherDed || 0) + (components.loansAdvances || 0)
    return Number((grossAdditions - totalDeductions).toFixed(2))
}

/**
 * Calculates PF contributions using dynamic config.
 */
export function calculatePFContributions(basicSalary: number, pfPercentage: number): PFContributions {
    const rate = pfPercentage / 100
    const employeeContribution = Math.round(basicSalary * rate)
    const employerContribution = Math.round(basicSalary * rate)
    return {
        employeeContribution,
        employerContribution,
        totalContribution: employeeContribution + employerContribution
    }
}

/**
 * Advanced Tax Calculation logic utilizing the dynamic database configuration.
 * Config must provide the standard deduction and tax slabs.
 */
export function calculateDynamicTax(annualSalary: number, config: PayrollComplianceConfig & { taxSlabs: TaxSlab[] }): TaxCalculation {
    let taxableIncome = annualSalary - config.standardDeduction
    if (taxableIncome <= 0) return { taxAmount: 0, effectiveRate: 0 }

    let tax = 0
    const applicableSlabs = [...config.taxSlabs].sort((a, b) => a.minIncome - b.minIncome)

    for (let i = applicableSlabs.length - 1; i >= 0; i--) {
        const slab = applicableSlabs[i]
        if (taxableIncome > slab.minIncome) {
            const difference = taxableIncome - slab.minIncome
            tax = slab.baseTax + (difference * slab.taxRate)
            break
        }
    }

    // Apply Health & Education Cess
    const cess = tax * (config.healthCess / 100)
    tax += cess

    const monthlyTax = Math.round(tax / 12)
    return {
        taxAmount: monthlyTax,
        effectiveRate: annualSalary > 0 ? (tax / annualSalary) : 0
    }
}
