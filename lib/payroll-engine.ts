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
    const PF_CEILING = 15000 // Statutory ceiling on basic for PF
    const cappedBasic = Math.min(basicSalary, PF_CEILING)
    const rate = pfPercentage / 100
    const employeeContribution = Math.round(cappedBasic * rate)
    const employerContribution = Math.round(cappedBasic * rate)
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

// ---------------------------------------------------------------------------
// Indian Payroll Compliance — ESI, Professional Tax, Tax Regime
// ---------------------------------------------------------------------------

/** ESI contribution breakdown */
export interface ESIContributions {
    employeeContribution: number // 0.75% of gross
    employerContribution: number // 3.25% of gross
    totalContribution: number
    isApplicable: boolean // only if gross <= 21000/month
}

/**
 * Calculates Employee State Insurance contributions.
 * ESI applies only when gross monthly salary is at or below the threshold.
 */
export function calculateESI(grossMonthlySalary: number): ESIContributions {
    const ESI_THRESHOLD = 21000
    const EMPLOYEE_RATE = 0.0075 // 0.75%
    const EMPLOYER_RATE = 0.0325 // 3.25%

    if (grossMonthlySalary > ESI_THRESHOLD) {
        return { employeeContribution: 0, employerContribution: 0, totalContribution: 0, isApplicable: false }
    }

    const employeeContribution = Math.round(grossMonthlySalary * EMPLOYEE_RATE)
    const employerContribution = Math.round(grossMonthlySalary * EMPLOYER_RATE)
    return {
        employeeContribution,
        employerContribution,
        totalContribution: employeeContribution + employerContribution,
        isApplicable: true,
    }
}

// ---------------------------------------------------------------------------
// Professional Tax
// ---------------------------------------------------------------------------

export type ProfessionalTaxState = "MH" | "KA" | "WB" | "TN" | "AP" | "TG" | "GJ" | "MP" | "OR" | "KL" | "AS"

interface PTSlab { min: number; max: number | null; tax: number }

const PT_SLABS: Record<ProfessionalTaxState, PTSlab[]> = {
    MH: [
        { min: 0, max: 7500, tax: 0 },
        { min: 7501, max: 10000, tax: 175 },
        { min: 10001, max: null, tax: 200 }, // 2500 for Feb
    ],
    KA: [
        { min: 0, max: 15000, tax: 0 },
        { min: 15001, max: 25000, tax: 200 },
        { min: 25001, max: null, tax: 200 },
    ],
    WB: [
        { min: 0, max: 10000, tax: 0 },
        { min: 10001, max: 15000, tax: 110 },
        { min: 15001, max: 25000, tax: 130 },
        { min: 25001, max: 40000, tax: 150 },
        { min: 40001, max: null, tax: 200 },
    ],
    TN: [
        { min: 0, max: 21000, tax: 0 },
        { min: 21001, max: 30000, tax: 135 },
        { min: 30001, max: 45000, tax: 315 },
        { min: 45001, max: 60000, tax: 690 },
        { min: 60001, max: 75000, tax: 1025 },
        { min: 75001, max: null, tax: 1250 },
    ],
    AP: [
        { min: 0, max: 15000, tax: 0 },
        { min: 15001, max: 20000, tax: 150 },
        { min: 20001, max: null, tax: 200 },
    ],
    TG: [
        { min: 0, max: 15000, tax: 0 },
        { min: 15001, max: 20000, tax: 150 },
        { min: 20001, max: null, tax: 200 },
    ],
    GJ: [
        { min: 0, max: 12000, tax: 0 },
        { min: 12001, max: null, tax: 200 },
    ],
    MP: [
        { min: 0, max: 18750, tax: 0 },
        { min: 18751, max: 25000, tax: 125 },
        { min: 25001, max: null, tax: 208 },
    ],
    OR: [
        { min: 0, max: 16000, tax: 0 },
        { min: 16001, max: 25000, tax: 150 },
        { min: 25001, max: null, tax: 200 },
    ],
    KL: [
        { min: 0, max: 11999, tax: 0 },
        { min: 12000, max: 17999, tax: 120 },
        { min: 18000, max: 29999, tax: 180 },
        { min: 30000, max: null, tax: 250 },
    ],
    AS: [
        { min: 0, max: 10000, tax: 0 },
        { min: 10001, max: null, tax: 208 },
    ],
}

/**
 * Calculates monthly Professional Tax for a given state.
 * Looks up the applicable slab from highest to lowest.
 */
export function calculateProfessionalTax(grossMonthlySalary: number, state: ProfessionalTaxState): number {
    const slabs = PT_SLABS[state]
    if (!slabs) return 0
    for (let i = slabs.length - 1; i >= 0; i--) {
        if (grossMonthlySalary >= slabs[i].min) {
            return slabs[i].tax
        }
    }
    return 0
}

// ---------------------------------------------------------------------------
// Tax Regime — Old vs New with Section 87A rebate and surcharge
// ---------------------------------------------------------------------------

export type TaxRegime = "old" | "new"

/** New regime tax slabs (FY 2025-26) */
const NEW_REGIME_SLABS: TaxSlab[] = [
    { id: "nr1", configId: "", minIncome: 0, maxIncome: 400000, taxRate: 0, baseTax: 0 },
    { id: "nr2", configId: "", minIncome: 400000, maxIncome: 800000, taxRate: 0.05, baseTax: 0 },
    { id: "nr3", configId: "", minIncome: 800000, maxIncome: 1200000, taxRate: 0.10, baseTax: 20000 },
    { id: "nr4", configId: "", minIncome: 1200000, maxIncome: 1600000, taxRate: 0.15, baseTax: 60000 },
    { id: "nr5", configId: "", minIncome: 1600000, maxIncome: 2000000, taxRate: 0.20, baseTax: 120000 },
    { id: "nr6", configId: "", minIncome: 2000000, maxIncome: 2400000, taxRate: 0.25, baseTax: 200000 },
    { id: "nr7", configId: "", minIncome: 2400000, maxIncome: null, taxRate: 0.30, baseTax: 300000 },
]

/** Section 87A rebate thresholds */
const REBATE_87A = {
    old: { limit: 500000, maxRebate: 12500 },
    new: { limit: 700000, maxRebate: 25000 },
}

/** Calculates surcharge based on taxable income brackets */
function calculateSurcharge(taxBeforeSurcharge: number, taxableIncome: number): number {
    if (taxableIncome <= 5000000) return 0
    if (taxableIncome <= 10000000) return taxBeforeSurcharge * 0.10
    if (taxableIncome <= 20000000) return taxBeforeSurcharge * 0.15
    if (taxableIncome <= 50000000) return taxBeforeSurcharge * 0.25
    return taxBeforeSurcharge * 0.37
}

/**
 * Calculates income tax under old or new regime with rebate, surcharge, and cess.
 * For old regime, uses config-supplied slabs. For new regime, uses built-in FY 2025-26 slabs.
 */
export function calculateTaxWithRegime(
    annualSalary: number,
    regime: TaxRegime,
    config?: PayrollComplianceConfig & { taxSlabs: TaxSlab[] }
): TaxCalculation {
    const standardDeduction = regime === "new" ? 75000 : (config?.standardDeduction ?? 50000)
    let taxableIncome = annualSalary - standardDeduction
    if (taxableIncome <= 0) return { taxAmount: 0, effectiveRate: 0 }

    // Use new regime built-in slabs or config slabs for old regime
    const slabs = regime === "new" ? NEW_REGIME_SLABS : (config?.taxSlabs ?? [])
    const sortedSlabs = [...slabs].sort((a, b) => a.minIncome - b.minIncome)

    let tax = 0
    for (let i = sortedSlabs.length - 1; i >= 0; i--) {
        const slab = sortedSlabs[i]
        if (taxableIncome > slab.minIncome) {
            tax = slab.baseTax + ((taxableIncome - slab.minIncome) * slab.taxRate)
            break
        }
    }

    // Section 87A rebate
    const rebateConfig = REBATE_87A[regime]
    if (taxableIncome <= rebateConfig.limit) {
        tax = Math.max(0, tax - rebateConfig.maxRebate)
    }

    // Surcharge
    const surcharge = calculateSurcharge(tax, taxableIncome)
    tax += surcharge

    // Health & Education Cess (4%)
    const cessRate = config?.healthCess ? config.healthCess / 100 : 0.04
    tax += tax * cessRate

    const monthlyTax = Math.round(tax / 12)
    return {
        taxAmount: monthlyTax,
        effectiveRate: annualSalary > 0 ? tax / annualSalary : 0,
    }
}
