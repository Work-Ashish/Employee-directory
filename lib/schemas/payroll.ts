import { z } from 'zod'

export const taxSlabSchema = z.object({
    minIncome: z.number().min(0),
    maxIncome: z.number().nullable().optional(),
    taxRate: z.number().min(0).max(100), // whole percentage e.g. 5 for 5%
    baseTax: z.number().min(0)
})

export const payrollConfigSchema = z.object({
    regimeName: z.string().min(1),
    pfPercentage: z.number().min(0).max(100),
    standardDeduction: z.number().min(0),
    healthCess: z.number().min(0),
    isActive: z.boolean(),
    taxSlabs: z.array(taxSlabSchema).optional()
})

export const payrollRunSchema = z.object({
    employeeId: z.string().cuid(),
    month: z.string().regex(/^\d{4}-\d{2}$/, "Format must be YYYY-MM"),
    basicSalary: z.number().min(0),
    allowances: z.number().min(0),
    arrears: z.number().min(0),
    reimbursements: z.number().min(0),
    loansAdvances: z.number().min(0),
    otherDeductions: z.number().min(0)
})

export const esiSchema = z.object({
    grossMonthlySalary: z.number().min(0),
    employeeContribution: z.number().min(0),
    employerContribution: z.number().min(0),
    isApplicable: z.boolean(),
})

export const professionalTaxSchema = z.object({
    state: z.enum(["MH", "KA", "WB", "TN", "AP", "TG", "GJ", "MP", "OR", "KL", "AS"]),
    grossMonthlySalary: z.number().min(0),
    taxAmount: z.number().min(0),
})

export const taxRegimeSchema = z.enum(["old", "new"])

export const compliancePayrollRunSchema = payrollRunSchema.extend({
    regime: taxRegimeSchema.default("new"),
    state: z.enum(["MH", "KA", "WB", "TN", "AP", "TG", "GJ", "MP", "OR", "KL", "AS"]).optional(),
    esiEmployee: z.number().min(0).optional(),
    esiEmployer: z.number().min(0).optional(),
    professionalTax: z.number().min(0).optional(),
})
