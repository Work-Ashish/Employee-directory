import { z } from 'zod'

export const taxSlabSchema = z.object({
    minIncome: z.number().min(0),
    maxIncome: z.number().nullable().optional(),
    taxRate: z.number().min(0).max(1), // e.g., 0.05
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
    otherDed: z.number().min(0)
})
