import { describe, it, expect } from "vitest"
import {
    calculatePFContributions,
    calculateESI,
    calculateProfessionalTax,
    calculateTaxWithRegime,
} from "@/lib/payroll-engine"

describe("PF Contributions with Ceiling", () => {
    it("caps PF at ₹15,000 basic for high earners", () => {
        const result = calculatePFContributions(50000, 12)
        expect(result.employeeContribution).toBe(1800)  // 12% of 15000
        expect(result.employerContribution).toBe(1800)
    })

    it("calculates normally below ceiling", () => {
        const result = calculatePFContributions(10000, 12)
        expect(result.employeeContribution).toBe(1200)  // 12% of 10000
    })

    it("handles zero salary", () => {
        const result = calculatePFContributions(0, 12)
        expect(result.totalContribution).toBe(0)
    })
})

describe("ESI Contributions", () => {
    it("applies ESI for salary at threshold (₹21,000)", () => {
        const result = calculateESI(21000)
        expect(result.isApplicable).toBe(true)
        expect(result.employeeContribution).toBe(158)  // 0.75% of 21000
        expect(result.employerContribution).toBe(683)  // 3.25% of 21000
    })

    it("does not apply ESI above threshold", () => {
        const result = calculateESI(21001)
        expect(result.isApplicable).toBe(false)
        expect(result.totalContribution).toBe(0)
    })

    it("calculates for low salary", () => {
        const result = calculateESI(10000)
        expect(result.isApplicable).toBe(true)
        expect(result.employeeContribution).toBe(75)
        expect(result.employerContribution).toBe(325)
    })

    it("handles zero salary", () => {
        const result = calculateESI(0)
        expect(result.isApplicable).toBe(true)
        expect(result.totalContribution).toBe(0)
    })
})

describe("Professional Tax", () => {
    it("Maharashtra: ₹200/month for salary > ₹10,000", () => {
        expect(calculateProfessionalTax(25000, "MH")).toBe(200)
    })

    it("Maharashtra: ₹175/month for salary ₹7,501-₹10,000", () => {
        expect(calculateProfessionalTax(8000, "MH")).toBe(175)
    })

    it("Maharashtra: ₹0 for salary ≤ ₹7,500", () => {
        expect(calculateProfessionalTax(7500, "MH")).toBe(0)
    })

    it("Karnataka: ₹200/month for salary > ₹15,000", () => {
        expect(calculateProfessionalTax(30000, "KA")).toBe(200)
    })

    it("Karnataka: ₹0 for salary ≤ ₹15,000", () => {
        expect(calculateProfessionalTax(15000, "KA")).toBe(0)
    })

    it("Tamil Nadu: ₹1,250/month for salary > ₹75,000", () => {
        expect(calculateProfessionalTax(80000, "TN")).toBe(1250)
    })

    it("West Bengal: progressive slabs", () => {
        expect(calculateProfessionalTax(10000, "WB")).toBe(0)
        expect(calculateProfessionalTax(12000, "WB")).toBe(110)
        expect(calculateProfessionalTax(20000, "WB")).toBe(130)
        expect(calculateProfessionalTax(30000, "WB")).toBe(150)
        expect(calculateProfessionalTax(50000, "WB")).toBe(200)
    })
})

describe("Tax Regime - New Regime", () => {
    it("zero tax for income ≤ ₹4,75,000 (after ₹75k std deduction)", () => {
        const result = calculateTaxWithRegime(475000, "new")
        expect(result.taxAmount).toBe(0)
    })

    it("Section 87A rebate: zero tax for income ≤ ₹7,75,000", () => {
        // 775000 - 75000 = 700000 taxable, which is at rebate limit
        const result = calculateTaxWithRegime(775000, "new")
        expect(result.taxAmount).toBe(0)
    })

    it("calculates tax for ₹12,00,000 annual", () => {
        // 1200000 - 75000 = 1125000 taxable
        // 0-400000: 0, 400000-800000: 20000, 800000-1125000: 32500 = 52500
        // + 4% cess = 54600 annual, 4550/month
        const result = calculateTaxWithRegime(1200000, "new")
        expect(result.taxAmount).toBeGreaterThan(0)
        expect(result.taxAmount).toBeLessThan(6000) // sanity check
    })

    it("applies surcharge for income > ₹50 lakhs", () => {
        const result = calculateTaxWithRegime(6000000, "new")
        expect(result.taxAmount).toBeGreaterThan(0)
        expect(result.effectiveRate).toBeGreaterThan(0.15)
    })
})

describe("Tax Regime - Old Regime", () => {
    it("uses config slabs for old regime", () => {
        const config = {
            id: "1", organizationId: "1",
            standardDeduction: 50000, healthCess: 4, pfPercentage: 12,
            taxSlabs: [
                { id: "1", configId: "1", minIncome: 0, maxIncome: 250000, taxRate: 0, baseTax: 0 },
                { id: "2", configId: "1", minIncome: 250000, maxIncome: 500000, taxRate: 0.05, baseTax: 0 },
                { id: "3", configId: "1", minIncome: 500000, maxIncome: 1000000, taxRate: 0.20, baseTax: 12500 },
                { id: "4", configId: "1", minIncome: 1000000, maxIncome: null, taxRate: 0.30, baseTax: 112500 },
            ]
        }
        const result = calculateTaxWithRegime(1200000, "old", config)
        expect(result.taxAmount).toBeGreaterThan(0)
    })

    it("Section 87A rebate for old regime (income ≤ ₹5L)", () => {
        const config = {
            id: "1", organizationId: "1",
            standardDeduction: 50000, healthCess: 4, pfPercentage: 12,
            taxSlabs: [
                { id: "1", configId: "1", minIncome: 0, maxIncome: 250000, taxRate: 0, baseTax: 0 },
                { id: "2", configId: "1", minIncome: 250000, maxIncome: 500000, taxRate: 0.05, baseTax: 0 },
            ]
        }
        const result = calculateTaxWithRegime(550000, "old", config)
        expect(result.taxAmount).toBe(0) // 550000-50000=500000, rebate applies
    })
})
