export interface AccountingExportOption {
    platform: "QUICKBOOKS" | "XERO"
    data: any[]
}

/**
 * Transforms payroll data into a CSV format compatible with Quickbooks.
 */
function csvQuote(val: unknown): string {
    const s = String(val ?? "")
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`
    }
    return s
}

export function generateQuickbooksCSV(payrolls: any[]): string {
    const headers = ["EmployeeID", "EmployeeName", "Month", "BasicSalary", "Allowances", "PFDeduction", "Tax", "NetSalary"]
    const rows = payrolls.map(p => [
        p.employee.employeeCode,
        `${p.employee.firstName} ${p.employee.lastName}`,
        p.month,
        p.basicSalary,
        p.allowances,
        p.pfDeduction,
        p.tax,
        p.netSalary
    ].map(csvQuote).join(","))

    return [headers.map(csvQuote).join(","), ...rows].join("\n")
}

/**
 * Transforms payroll data into a CSV format compatible with Xero.
 */
export function generateXeroCSV(payrolls: any[]): string {
    // Xero typically expects a different header structure for its import templates
    const headers = ["Employee Name", "Email Address", "Payment Amount", "Date", "Description"]
    const rows = payrolls.map(p => [
        `${p.employee.firstName} ${p.employee.lastName}`,
        p.employee.email,
        p.netSalary,
        new Date().toISOString().split("T")[0],
        `Salary for ${p.month}`
    ].map(csvQuote).join(","))

    return [headers.join(","), ...rows].join("\n")
}

export function generateExport(platform: "QUICKBOOKS" | "XERO", payrolls: any[]): string {
    if (platform === "QUICKBOOKS") return generateQuickbooksCSV(payrolls)
    return generateXeroCSV(payrolls)
}
